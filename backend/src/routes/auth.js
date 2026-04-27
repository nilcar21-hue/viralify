const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

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
