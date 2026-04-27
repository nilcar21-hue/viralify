const router = require("express").Router();
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, planGuard } = require("../middleware/auth");

const prisma = new PrismaClient();

// GET /products — lista produtos com filtros
router.get("/", authMiddleware, async (req, res) => {
  const { category, trending, search, page = 1, limit = 20 } = req.query;
  const where = {};
  if (category) where.category = category;
  if (trending === "true") where.trending = true;
  if (search) where.title = { contains: search, mode: "insensitive" };

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: [{ trending: "desc" }, { sold: "desc" }],
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /products/trending — top produtos em alta (sync com ML)
router.get("/trending", authMiddleware, async (req, res) => {
  try {
    // Busca produtos trending diretamente no Mercado Livre
    const categories = ["MLB1051", "MLB1648", "MLB1144"]; // Celulares, Informática, Eletrônicos
    const results = [];

    for (const cat of categories) {
      const { data } = await axios.get(
        `https://api.mercadolibre.com/sites/MLB/search?category=${cat}&sort=relevance&limit=10`,
        { timeout: 5000 }
      ).catch(() => ({ data: { results: [] } }));

      for (const item of data.results || []) {
        results.push({
          mlId: item.id,
          title: item.title,
          price: item.price,
          commission: 8, // % médio ML
          affiliateUrl: `https://produto.mercadolivre.com.br/${item.id}`,
          category: item.category_id,
          thumbnail: item.thumbnail?.replace("I.jpg", "O.jpg"),
          rating: item.seller?.seller_reputation?.level_id ? 4.5 : 4.0,
          sold: item.sold_quantity || 0,
          trending: true,
        });
      }
    }

    // Salva no banco (upsert)
    for (const p of results) {
      await prisma.product.upsert({
        where: { mlId: p.mlId },
        update: { ...p },
        create: { ...p },
      }).catch(() => {});
    }

    res.json({ products: results.slice(0, 30) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /products/:id/save — salva produto para o usuário
router.post("/:id/save", authMiddleware, async (req, res) => {
  try {
    await prisma.userProduct.upsert({
      where: { userId_productId: { userId: req.user.id, productId: req.params.id } },
      update: {},
      create: { userId: req.user.id, productId: req.params.id },
    });
    res.json({ saved: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /products/saved — produtos salvos pelo usuário
router.get("/saved", authMiddleware, async (req, res) => {
  try {
    const saved = await prisma.userProduct.findMany({
      where: { userId: req.user.id },
      include: { product: true },
    });
    res.json({ products: saved.map(s => s.product) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /products/categories
router.get("/categories", authMiddleware, async (req, res) => {
  res.json({
    categories: [
      { id: "MLB1051", name: "Celulares", emoji: "📱" },
      { id: "MLB1648", name: "Informática", emoji: "💻" },
      { id: "MLB1144", name: "Eletrônicos", emoji: "🔌" },
      { id: "MLB1574", name: "Beleza", emoji: "💄" },
      { id: "MLB1499", name: "Casa", emoji: "🏠" },
      { id: "MLB1276", name: "Esportes", emoji: "⚽" },
    ],
  });
});

module.exports = router;
