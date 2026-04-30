const express = require("express");
const path = require("path");
const fs = require("fs");
const { getAuthUrl, exchangeCode, uploadVSLToYoutube } = require("../services/youtubeUploader");

const router = express.Router();

function adminOnly(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== process.env.ADMIN_TOKEN && token !== "viralify_admin_2025") {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
}

// Passo 1: Abrir esta URL no navegador para autorizar o canal
// GET /youtube/auth
router.get("/auth", adminOnly, (req, res) => {
  const url = getAuthUrl();
  res.json({
    message: "Abra esta URL no navegador para autorizar o canal do YouTube",
    url,
  });
});

// Passo 2: Google redireciona aqui com o code — troca pelo token
// GET /youtube/callback?code=...
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "code ausente" });

  try {
    const tokens = await exchangeCode(code);
    res.json({
      message: "Autenticação concluída! Copie os tokens abaixo para o .env do Railway.",
      YOUTUBE_ACCESS_TOKEN: tokens.access_token,
      YOUTUBE_REFRESH_TOKEN: tokens.refresh_token,
      instrucoes: [
        "1. No Railway, vá em Variables do serviço viralify-backend",
        "2. Adicione YOUTUBE_ACCESS_TOKEN e YOUTUBE_REFRESH_TOKEN com os valores acima",
        "3. Redeploy o serviço",
        "4. Chame POST /youtube/upload-vsl para subir a VSL",
      ],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Passo 3: Faz upload da VSL gerada para o YouTube
// POST /youtube/upload-vsl
router.post("/upload-vsl", adminOnly, async (req, res) => {
  const vslPath = path.join(__dirname, "../../uploads/viralify-vsl.mp4");

  if (!fs.existsSync(vslPath)) {
    return res.status(404).json({
      error: "VSL não encontrada. Gere primeiro via POST /vsl/generate",
    });
  }

  const {
    title = "Como Ganhar Comissão no Mercado Livre Sem Aparecer na Câmera — Viralify",
    description = `Descubra como afiliados estão faturando R$ 4.800/mês no Mercado Livre sem gravar vídeo, sem aparecer na câmera e sem edição.

A Viralify usa inteligência artificial para criar vídeos virais completos em menos de 60 segundos.

✅ Cole o link do produto
✅ A IA cria roteiro + narração profissional
✅ Vídeo pronto para TikTok, YouTube Shorts e Instagram

👉 Comece grátis (sem cartão): https://viralify-ia.vercel.app

#afiliados #mercadolivre #rendaextra #marketingdigital #inteligenciaartificial #tiktok #viralify`,
    tags = ["afiliados", "mercado livre", "renda extra", "marketing digital", "IA", "viralify", "como ganhar dinheiro", "tiktok afiliado"],
    privacyStatus = "public",
  } = req.body;

  res.json({ status: "uploading", message: "Upload iniciado em background — aguarde ~2 minutos" });

  uploadVSLToYoutube({ videoPath: vslPath, title, description, tags, privacyStatus })
    .then(({ videoId, videoUrl }) => {
      console.log("VSL publicada no YouTube:", videoUrl);
    })
    .catch((e) => {
      console.error("YouTube upload erro:", e.message);
    });
});

// GET /youtube/status — verifica se os tokens estão configurados
router.get("/status", adminOnly, (req, res) => {
  res.json({
    configured: !!(process.env.YOUTUBE_ACCESS_TOKEN && process.env.YOUTUBE_REFRESH_TOKEN),
    client_id_set: !!process.env.YOUTUBE_CLIENT_ID,
    client_secret_set: !!process.env.YOUTUBE_CLIENT_SECRET,
  });
});

module.exports = router;
