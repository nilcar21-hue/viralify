const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");
const { gerarRoteiro, gerarAudio, gerarVideo } = require("../services/videoGenerator");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://3f7561e4e4076c1b8f9f1832cfb6fce6.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "e4c9f867c959b4fc11f59634c630d84c",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "040e9f090233d90ee627dd8bf687733a8371942f21886eb64c9a0ae938ee3d00",
  },
});

async function uploadToR2(localPath, key) {
  const body = fs.readFileSync(localPath);
  await R2.send(new PutObjectCommand({
    Bucket: "viralify-videos",
    Key: key,
    Body: body,
    ContentType: key.endsWith(".mp4") ? "video/mp4" : "audio/mpeg",
  }));
  return `https://pub-4eac1fa6c1f14af5bd5fa78fe9840057.r2.dev/${key}`;
}

const prisma = new PrismaClient();

const PLAN_LIMITS = { FREE: 3, PRO: 30, ULTRA: 999999 };
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// GET /videos — lista vídeos do usuário
router.get("/", authMiddleware, async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const where = { userId: req.user.id };
  if (status) where.status = status;

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: { product: true },
    }),
    prisma.video.count({ where }),
  ]);
  res.json({ videos, total });
});

// POST /videos/generate — gera vídeo completo
router.post("/generate", authMiddleware, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: "productId obrigatório" });

  // Verifica limite do plano
  const thisMonth = new Date(new Date().setDate(1));
  const count = await prisma.video.count({
    where: { userId: req.user.id, createdAt: { gte: thisMonth } },
  });
  const limit = PLAN_LIMITS[req.user.plan];
  if (count >= limit) {
    return res.status(403).json({
      error: `Limite de ${limit} vídeos/mês atingido`,
      upgrade: "https://viralify-ia.vercel.app/planos",
    });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Produto não encontrado" });

  // Cria registro pendente
  const video = await prisma.video.create({
    data: {
      userId: req.user.id,
      productId,
      title: `Vídeo — ${product.title.slice(0, 50)}`,
      script: "",
      status: "GENERATING",
    },
  });

  // Responde imediatamente e processa em background
  res.json({ videoId: video.id, status: "GENERATING", message: "Gerando vídeo... aguarde ~60 segundos" });

  // Geração assíncrona
  (async () => {
    try {
      const base = path.join(UPLOADS_DIR, video.id);

      // 1. Roteiro
      const roteiro = await gerarRoteiro(product);
      const titulo = roteiro.match(/TITULO:\s*(.+)/i)?.[1]?.trim() || product.title;
      await prisma.video.update({ where: { id: video.id }, data: { script: roteiro, title: titulo } });

      // 2. Áudio
      const audioPath = `${base}.mp3`;
      await gerarAudio(roteiro, audioPath);

      // 3. Vídeo
      const videoPath = `${base}.mp4`;
      await gerarVideo(roteiro, audioPath, product, videoPath);

      // 4. Upload para Cloudflare R2 (armazenamento permanente)
      let videoUrl = `/uploads/${video.id}.mp4`;
      let audioUrl = `/uploads/${video.id}.mp3`;
      try {
        videoUrl = await uploadToR2(videoPath, `videos/${video.id}.mp4`);
        audioUrl = await uploadToR2(audioPath, `audios/${video.id}.mp3`);
        console.log(`R2 upload OK: ${videoUrl}`);
        // Remove arquivos locais para liberar espaço
        fs.unlink(videoPath, () => {});
        fs.unlink(audioPath, () => {});
      } catch (e) {
        console.error("R2 upload falhou, usando URL local:", e.message);
      }

      // 5. Atualiza banco
      await prisma.video.update({
        where: { id: video.id },
        data: { status: "READY", videoUrl, audioUrl },
      });

      await prisma.user.update({
        where: { id: req.user.id },
        data: { videosCount: { increment: 1 } },
      });

    } catch (e) {
      console.error("Erro ao gerar vídeo:", e.message);
      await prisma.video.update({
        where: { id: video.id },
        data: { status: "FAILED", title: "ERRO: " + e.message.slice(0, 200) },
      });
    }
  })();
});

// GET /videos/:id — status do vídeo
router.get("/:id", authMiddleware, async (req, res) => {
  const video = await prisma.video.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: { product: true },
  });
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
  res.json(video);
});

// POST /videos/:id/publish — publica em plataformas
router.post("/:id/publish", authMiddleware, async (req, res) => {
  const { platforms = ["youtube"] } = req.body;
  const video = await prisma.video.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
  if (video.status !== "READY") return res.status(400).json({ error: "Vídeo ainda não está pronto" });

  res.json({ message: "Publicação iniciada", platforms });

  // TODO: integrar com YouTube e TikTok APIs do usuário
});

// DELETE /videos/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  const video = await prisma.video.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!video) return res.status(404).json({ error: "Vídeo não encontrado" });
  await prisma.video.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
});

module.exports = router;
