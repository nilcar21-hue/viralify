require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawnSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const authRoutes      = require("./routes/auth");
const productRoutes   = require("./routes/products");
const videoRoutes     = require("./routes/videos");
const analyticsRoutes = require("./routes/analytics");
const webhookRoutes   = require("./routes/webhooks");

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://viralify.com.br",
    "https://frontend-five-eta-63.vercel.app",
    /\.vercel\.app$/,
  ]
}));
app.use(express.json());

app.use("/auth",      authRoutes);
app.use("/products",  productRoutes);
app.use("/videos",    videoRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/webhooks",  webhookRoutes);
app.use("/uploads",   express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_, res) => res.json({ status: "ok", version: "1.0.0" }));

app.get("/debug/env", (_, res) => res.json({
  ELEVENLABS: process.env.ELEVENLABS_API_KEY?.slice(0, 15) || "NAO_DEFINIDA",
  GROQ: process.env.GROQ_API_KEY?.slice(0, 10) || "NAO_DEFINIDA",
  NODE_ENV: process.env.NODE_ENV,
}));

app.get("/debug/ffmpeg", (_, res) => {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8", timeout: 5000 });
  res.json({
    ok: r.status === 0,
    version: (r.stdout || r.stderr || "").split("\n")[0],
    path: spawnSync("which", ["ffmpeg"], { encoding: "utf8" }).stdout?.trim(),
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Viralify API rodando na porta ${PORT}`));

module.exports = { app, prisma };
