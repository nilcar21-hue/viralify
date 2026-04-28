require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawnSync } = require("child_process");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const authRoutes      = require("./routes/auth");
const productRoutes   = require("./routes/products");
const videoRoutes     = require("./routes/videos");
const analyticsRoutes = require("./routes/analytics");
const webhookRoutes   = require("./routes/webhooks");
const { generateVSL } = require("./services/vslGenerator");

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://viralify-ia.vercel.app",
    "https://viralify.angralocal.online",
    "https://frontend-five-eta-63.vercel.app",
    /\.vercel\.app$/,
    /\.angralocal\.online$/,
  ]
}));
app.use(express.json());

app.use("/auth",      authRoutes);
app.use("/products",  productRoutes);
app.use("/videos",    videoRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/webhooks",  webhookRoutes);

// Servir uploads com CORS aberto para vídeos
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
}, express.static(path.join(__dirname, "../uploads")));

app.get("/health", (_, res) => res.json({ status: "ok", version: "1.0.0" }));

// GET /vsl — retorna VSL já gerada ou status
app.get("/vsl", (_, res) => {
  const vslPath = path.join(__dirname, "../uploads/viralify-vsl.mp4");
  if (fs.existsSync(vslPath)) {
    return res.json({ status: "ready", url: "/uploads/viralify-vsl.mp4" });
  }
  res.json({ status: "not_generated" });
});

// POST /vsl/generate — gera a VSL (protegido por token simples)
app.post("/vsl/generate", async (req, res) => {
  const token = req.headers["x-admin-token"];
  if (token !== process.env.ADMIN_TOKEN && token !== "viralify_admin_2025") {
    return res.status(401).json({ error: "Não autorizado" });
  }
  res.json({ status: "generating", message: "VSL sendo gerada em background — aguarde ~3 minutos" });
  const outputDir = path.join(__dirname, "../uploads/vsl_tmp");
  const outputPath = path.join(__dirname, "../uploads/viralify-vsl.mp4");
  generateVSL(outputDir, outputPath).catch(e => console.error("VSL erro:", e.message));
});

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
