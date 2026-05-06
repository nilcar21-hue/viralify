const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");
const { enviarResetSenha } = require("../services/emailService");

const prisma = new PrismaClient();

const PLAN_LIMITS = {
  FREE:  { videos: 3 },
  PRO:   { videos: 30 },
  ULTRA: { videos: 999999 },
};

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password)
    return res.status(400).json({ error: "Campos obrigatórios: email, name, password" });

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email já cadastrado" });

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hash },
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({ user, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email obrigatório" });

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // sempre retorna 200 para não revelar se email existe
    if (!user) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiresAt: expires },
    });

    await enviarResetSenha({ email: user.email, name: user.name, resetToken: token });
    res.json({ ok: true });
  } catch (e) {
    console.error("[forgot-password]", e.message);
    res.status(500).json({ error: "Erro interno" });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token e senha obrigatórios" });
  if (password.length < 6) return res.status(400).json({ error: "Senha muito curta (mínimo 6 caracteres)" });

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: "Link inválido ou expirado" });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiresAt: null },
    });

    res.json({ ok: true });
  } catch (e) {
    console.error("[reset-password]", e.message);
    res.status(500).json({ error: "Erro interno" });
  }
});

// GET /auth/me
router.get("/me", authMiddleware, async (req, res) => {
  const { password: _, ...safeUser } = req.user;
  const limits = PLAN_LIMITS[req.user.plan];
  const videosThisMonth = await prisma.video.count({
    where: {
      userId: req.user.id,
      createdAt: { gte: new Date(new Date().setDate(1)) },
    },
  });
  res.json({
    ...safeUser,
    limits,
    usage: { videos: videosThisMonth },
    canCreateVideo: videosThisMonth < limits.videos,
  });
});

module.exports = router;
