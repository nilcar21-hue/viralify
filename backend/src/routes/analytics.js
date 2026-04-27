const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const prisma = new PrismaClient();

// GET /analytics/dashboard — resumo completo
router.get("/dashboard", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const hoje = new Date();
  const mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const semana = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalVideos, videosPublicados, metricas, metricasSemana, topVideos] = await Promise.all([
    prisma.video.count({ where: { userId } }),
    prisma.video.count({ where: { userId, status: "PUBLISHED" } }),
    prisma.metric.aggregate({
      where: { userId, date: { gte: mes } },
      _sum: { views: true, clicks: true, conversions: true, revenue: true },
    }),
    prisma.metric.aggregate({
      where: { userId, date: { gte: semana } },
      _sum: { views: true, clicks: true, conversions: true, revenue: true },
    }),
    prisma.metric.groupBy({
      by: ["videoId"],
      where: { userId, videoId: { not: null } },
      _sum: { views: true, clicks: true, revenue: true },
      orderBy: { _sum: { revenue: "desc" } },
      take: 5,
    }),
  ]);

  res.json({
    totais: {
      videos: totalVideos,
      publicados: videosPublicados,
      views: metricas._sum.views || 0,
      clicks: metricas._sum.clicks || 0,
      conversoes: metricas._sum.conversions || 0,
      receita: metricas._sum.revenue || 0,
    },
    semana: {
      views: metricasSemana._sum.views || 0,
      clicks: metricasSemana._sum.clicks || 0,
      receita: metricasSemana._sum.revenue || 0,
    },
    topVideos,
    ctr: metricas._sum.views
      ? ((metricas._sum.clicks / metricas._sum.views) * 100).toFixed(2) + "%"
      : "0%",
    conversionRate: metricas._sum.clicks
      ? ((metricas._sum.conversions / metricas._sum.clicks) * 100).toFixed(2) + "%"
      : "0%",
  });
});

// POST /analytics/click — registra clique (chamado pelo link de afiliado)
router.post("/click", async (req, res) => {
  const { videoId, userId, platform } = req.body;
  try {
    await prisma.metric.create({
      data: { userId, videoId, clicks: 1, platform },
    });
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// GET /analytics/chart — dados para gráfico (últimos 30 dias)
router.get("/chart", authMiddleware, async (req, res) => {
  const dias = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    dias.push(d);
  }

  const metricas = await prisma.metric.findMany({
    where: {
      userId: req.user.id,
      date: { gte: dias[0] },
    },
  });

  const chart = dias.map(d => {
    const dayMetrics = metricas.filter(m => {
      const md = new Date(m.date);
      return md.toDateString() === d.toDateString();
    });
    return {
      date: d.toISOString().split("T")[0],
      views: dayMetrics.reduce((a, m) => a + m.views, 0),
      clicks: dayMetrics.reduce((a, m) => a + m.clicks, 0),
      revenue: dayMetrics.reduce((a, m) => a + m.revenue, 0),
    };
  });

  res.json({ chart });
});

module.exports = router;
