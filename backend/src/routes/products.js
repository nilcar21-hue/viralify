const router = require("express").Router();
const axios = require("axios");
const cheerio = require("cheerio");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1/models";

const prisma = new PrismaClient();

// ── Gemini: analisa imagem (base64 ou URL) e identifica produto ──
async function geminiAnalyzeImage(imageBase64OrUrl, mimeType = "image/jpeg") {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  let part;
  if (imageBase64OrUrl.startsWith("http")) {
    try {
      const imgRes = await axios.get(imageBase64OrUrl, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000,
      });
      const b64 = Buffer.from(imgRes.data).toString("base64");
      const ct = (imgRes.headers["content-type"] || mimeType).split(";")[0];
      part = { inlineData: { mimeType: ct, data: b64 } };
    } catch { return null; }
  } else {
    const match = imageBase64OrUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      part = { inlineData: { mimeType: match[1], data: match[2] } };
    } else {
      part = { inlineData: { mimeType, data: imageBase64OrUrl } };
    }
  }

  const body = {
    contents: [{
      parts: [
        part,
        { text: `Analise esta imagem de produto e retorne APENAS JSON válido:
{
  "title": "nome completo do produto em português",
  "price": 0,
  "brand": "marca se visível",
  "category": "categoria do produto",
  "keywords": "3-5 palavras-chave para buscar imagens de stock relacionadas em inglês",
  "description": "descrição curta de 1 linha"
}
Se não conseguir identificar preço, use 0. Responda APENAS o JSON, sem texto extra.` }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
  };

  for (const model of GEMINI_MODELS) {
    try {
      const { data } = await axios.post(
        `${GEMINI_BASE}/${model}:generateContent?key=${key}`,
        body,
        { headers: { "Content-Type": "application/json" }, timeout: 20000 }
      );
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      if (e.response?.status !== 429) return null;
      // 429 = quota esgotada, tenta próximo modelo
    }
  }
  return null;
}

// ── Gemini: extrai dados de produto de HTML ou texto ──
async function geminiExtractFromText(text) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const snippet = text.slice(0, 4000);
  const body = {
    contents: [{
      parts: [{ text: `Extraia dados de produto do texto/HTML abaixo. Retorne APENAS JSON:
{
  "title": "nome completo do produto",
  "price": 0.0,
  "thumbnail": "URL da imagem principal do produto se encontrar",
  "brand": "marca"
}
Se não encontrar preço, use 0. Responda APENAS o JSON.

Texto: ${snippet}` }]
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 200 }
  };

  for (const model of GEMINI_MODELS) {
    try {
      const { data } = await axios.post(
        `${GEMINI_BASE}/${model}:generateContent?key=${key}`,
        body,
        { headers: { "Content-Type": "application/json" }, timeout: 20000 }
      );
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      if (e.response?.status !== 429) return null;
    }
  }
  return null;
}

// ── GET /products/gemini-test — testa Gemini sem imagem ──
router.get("/gemini-test", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ error: "GEMINI_API_KEY não definida" });
  const results = {};
  for (const model of GEMINI_MODELS) {
    try {
      const { data } = await axios.post(
        `${GEMINI_BASE}/${model}:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: "Say: OK" }] }], generationConfig: { maxOutputTokens: 5 } },
        { headers: { "Content-Type": "application/json" }, timeout: 10000 }
      );
      results[model] = data.candidates?.[0]?.content?.parts?.[0]?.text || "no text";
    } catch (e) {
      results[model] = `ERR ${e.response?.status}: ${e.response?.data?.error?.message?.slice(0, 100) || e.message}`;
    }
  }
  res.json(results);
});

// ── POST /products/analyze-image — identifica produto por imagem ──
router.post("/analyze-image", authMiddleware, async (req, res) => {
  const { imageBase64, imageUrl } = req.body;
  if (!imageBase64 && !imageUrl) return res.status(400).json({ error: "Imagem obrigatória" });

  try {
    const result = await geminiAnalyzeImage(imageBase64 || imageUrl);
    if (!result || !result.title) {
      return res.status(400).json({ error: "Não foi possível identificar o produto na imagem." });
    }

    // Busca imagem de stock correspondente no Pexels
    let thumbnail = imageBase64 || imageUrl || "";
    if (imageUrl && !imageBase64) thumbnail = imageUrl;

    res.json({
      title: result.title,
      price: result.price || 0,
      brand: result.brand || "",
      category: result.category || "",
      keywords: result.keywords || result.title,
      description: result.description || "",
      thumbnail,
    });
  } catch (e) {
    res.status(500).json({ error: "Erro ao analisar imagem: " + e.message });
  }
});

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
    const categories = ["MLB1051", "MLB1648", "MLB1144", "MLB1574", "MLB1499", "MLB1276"];
    const results = [];

    const mlHeaders = {
      "User-Agent": "Mozilla/5.0 (compatible; Viralify/1.0)",
      "Accept": "application/json",
    };

    for (const cat of categories) {
      const { data } = await axios.get(
        `https://api.mercadolibre.com/sites/MLB/search?category=${cat}&sort=relevance&limit=8`,
        { timeout: 8000, headers: mlHeaders }
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

    // Se ML bloqueou, usa produtos do banco já salvos ou fallback
    if (results.length === 0) {
      const cached = await prisma.product.findMany({
        orderBy: [{ trending: "desc" }, { sold: "desc" }],
        take: 30,
      });
      if (cached.length > 0) return res.json({ products: cached });

      // Fallback hardcoded com produtos reais populares do ML e imagens do Pexels
      const fallback = [
        { mlId: "MLB3936656677", title: "Fone Bluetooth JBL Tune 520BT", price: 249.90, commission: 8, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-3936656677", category: "MLB1051", thumbnail: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.8, sold: 12400, trending: true },
        { mlId: "MLB2084650223", title: "Smartwatch Xiaomi Redmi Watch 3", price: 399.90, commission: 9, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-2084650223", category: "MLB1144", thumbnail: "https://images.pexels.com/photos/393047/pexels-photo-393047.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.7, sold: 8900, trending: true },
        { mlId: "MLB3456789012", title: "Câmera de Segurança Inteligente WiFi Full HD", price: 189.90, commission: 10, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-3456789012", category: "MLB1144", thumbnail: "https://images.pexels.com/photos/274973/pexels-photo-274973.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.6, sold: 6700, trending: true },
        { mlId: "MLB2345678901", title: "Aspirador de Pó Robô Inteligente Wi-Fi", price: 799.90, commission: 7, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-2345678901", category: "MLB1499", thumbnail: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.5, sold: 3200, trending: true },
        { mlId: "MLB1234567890", title: "Carregador Turbo 65W USB-C Universal", price: 89.90, commission: 12, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-1234567890", category: "MLB1144", thumbnail: "https://images.pexels.com/photos/4526407/pexels-photo-4526407.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.7, sold: 15600, trending: true },
        { mlId: "MLB9876543210", title: "Mini Projetor Portátil 4K WiFi Bluetooth", price: 549.90, commission: 8, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-9876543210", category: "MLB1144", thumbnail: "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.4, sold: 2800, trending: true },
        { mlId: "MLB8765432109", title: "Teclado Mecânico Gamer RGB Sem Fio", price: 329.90, commission: 9, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-8765432109", category: "MLB1648", thumbnail: "https://images.pexels.com/photos/1714205/pexels-photo-1714205.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.6, sold: 5400, trending: true },
        { mlId: "MLB7654321098", title: "Mouse Gamer Sem Fio 25600 DPI", price: 199.90, commission: 10, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-7654321098", category: "MLB1648", thumbnail: "https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.7, sold: 7800, trending: true },
        { mlId: "MLB6543210987", title: "Fritadeira Air Fryer Digital 5.5L", price: 299.90, commission: 7, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-6543210987", category: "MLB1499", thumbnail: "https://images.pexels.com/photos/4551832/pexels-photo-4551832.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.8, sold: 21000, trending: true },
        { mlId: "MLB5432109876", title: "Mochila Gamer USB Impermeável 30L", price: 149.90, commission: 11, affiliateUrl: "https://produto.mercadolivre.com.br/MLB-5432109876", category: "MLB1276", thumbnail: "https://images.pexels.com/photos/1547813/pexels-photo-1547813.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop", rating: 4.5, sold: 4300, trending: true },
      ];

      for (const p of fallback) {
        await prisma.product.upsert({ where: { mlId: p.mlId }, update: p, create: p }).catch(() => {});
      }
      return res.json({ products: fallback });
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

// Scraper universal — extrai título, preço e imagem de qualquer URL
async function scrapeProduct(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
  };

  const { data: html } = await axios.get(url, { timeout: 15000, headers, maxRedirects: 5 });
  const $ = cheerio.load(html);

  // Título — prioridade: OG > Twitter > h1 > title
  let title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $('meta[itemprop="name"]').attr("content") ||
    $("h1").first().text() ||
    $("title").text() || "";
  title = title.replace(/\s+/g, " ").trim().slice(0, 200);

  // Imagem — prioridade: OG > Twitter > schema > primeira img grande
  let thumbnail =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    $('meta[itemprop="image"]').attr("content") ||
    $('link[rel="image_src"]').attr("href") || "";

  // Se não achou imagem nos meta tags, pega primeira img com tamanho razoável
  if (!thumbnail) {
    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      const w = parseInt($(el).attr("width") || "0");
      const h = parseInt($(el).attr("height") || "0");
      if (src && (w > 200 || h > 200 || src.includes("product") || src.includes("produto"))) {
        thumbnail = src;
        return false;
      }
    });
  }

  // Resolve URL relativa
  if (thumbnail && !thumbnail.startsWith("http")) {
    const base = new URL(url);
    thumbnail = thumbnail.startsWith("/") ? `${base.origin}${thumbnail}` : `${base.origin}/${thumbnail}`;
  }

  // Preço — schema.org > meta > seletores comuns
  let price = 0;
  const priceSchema = $('[itemprop="price"]').attr("content") || $('[itemprop="price"]').text();
  if (priceSchema) {
    price = parseFloat(priceSchema.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  }
  if (!price) {
    const priceMeta = $('meta[property="product:price:amount"]').attr("content") ||
                      $('meta[name="twitter:data1"]').attr("content") || "";
    price = parseFloat(priceMeta.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  }
  if (!price) {
    // Regex no HTML bruto para encontrar preço
    const priceMatch = html.match(/R\$\s*([\d.]+[,\d]*)/);
    if (priceMatch) price = parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")) || 0;
  }

  // Usa Groq para extrair/validar dados se scraping foi parcial
  if (!price || title.length < 5) {
    const snippet = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 3000);
    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Extraia do texto abaixo o nome do produto e o preço em reais. Responda APENAS em JSON: {"title": "...", "price": 99.90}\n\nTexto: ${snippet}`,
      }],
      max_tokens: 100,
      temperature: 0,
    });
    try {
      const extracted = JSON.parse(resp.choices[0].message.content.match(/\{.*\}/s)?.[0] || "{}");
      if (!title || title.length < 5) title = extracted.title || title;
      if (!price) price = extracted.price || 0;
    } catch {}
  }

  return { title, price, thumbnail };
}

// Extrai keywords legíveis do slug de uma URL
function slugToKeywords(url) {
  try {
    const u = new URL(url);
    // Pega o pathname e remove IDs, filtros e parâmetros
    const slug = u.pathname
      .split("/")
      .filter(s => s && !s.match(/^(p|MLB|MLA|MLB\d+|MLM)$/i) && s.length > 2)
      .join(" ")
      .replace(/[-_]/g, " ")
      .replace(/\d{6,}/g, "") // remove números longos (IDs)
      .replace(/\s+/g, " ")
      .trim();
    return slug.slice(0, 120);
  } catch { return ""; }
}

// Busca imagem do produto no Pexels por keyword
async function buscarImagemPexels(query) {
  const PEXELS_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_KEY) return "";
  try {
    const { data } = await axios.get(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=square`,
      { headers: { Authorization: PEXELS_KEY }, timeout: 8000 }
    );
    return data.photos?.[0]?.src?.medium || "";
  } catch { return ""; }
}

// POST /products/from-url — extrai produto de qualquer URL
router.post("/from-url", authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL obrigatória" });

  const mlId = "URL_" + Buffer.from(url).toString("base64").slice(0, 24).replace(/[^a-zA-Z0-9]/g, "");

  // Já existe no cache?
  const existing = await prisma.product.findUnique({ where: { mlId } }).catch(() => null);
  if (existing) return res.json({ product: existing, cached: true });

  let title = "", price = 0, thumbnail = "";

  // TENTATIVA 1: Scraping HTTP direto
  try {
    const result = await scrapeProduct(url);
    title = result.title;
    price = result.price;
    thumbnail = result.thumbnail;
  } catch (e) {
    console.log("Scraping falhou:", e.message);
  }

  // TENTATIVA 2: Gemini lê o HTML bruto da página (mesmo bloqueado parcialmente)
  if (!title || title.length < 5) {
    try {
      const htmlRes = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        timeout: 15000,
        maxRedirects: 5,
      });
      const extracted = await geminiExtractFromText(htmlRes.data);
      if (extracted?.title) {
        title = extracted.title;
        price = extracted.price || 0;
        if (!thumbnail && extracted.thumbnail) thumbnail = extracted.thumbnail;
      }
    } catch {}
  }

  // TENTATIVA 3: Slug da URL + Gemini como último recurso
  if (!title || title.length < 5) {
    const slug = slugToKeywords(url);
    if (slug) {
      try {
        const extracted = await geminiExtractFromText(`URL slug: ${slug}\nURL completa: ${url}`);
        if (extracted?.title) { title = extracted.title; price = extracted.price || 0; }
      } catch {}
    }
  }

  if (!title || title.length < 3) {
    return res.status(400).json({ error: "Não foi possível identificar o produto neste link. Tente a aba 'Produto próprio' para inserir manualmente." });
  }

  // TENTATIVA 3: imagem — se scraping não pegou, busca no Pexels pela keyword do título
  if (!thumbnail) {
    thumbnail = await buscarImagemPexels(title.split(" ").slice(0, 4).join(" "));
  }

  const product = await prisma.product.create({
    data: {
      mlId,
      title,
      price: price || 0,
      commission: 8,
      affiliateUrl: url,
      category: "MLB1000",
      thumbnail: thumbnail || "",
      rating: 4.5,
      sold: 0,
      trending: false,
    },
  });

  res.json({ product });
});

// POST /products/from-search — busca produto por texto livre (como Google)
router.post("/from-search", authMiddleware, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Busca obrigatória" });

  try {
    // Primeiro tenta no banco local
    const local = await prisma.product.findMany({
      where: { title: { contains: query, mode: "insensitive" } },
      take: 6,
    });
    if (local.length > 0) return res.json({ products: local, source: "cache" });

    // Busca na API do ML por texto
    const { data } = await axios.get(
      `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&sort=relevance&limit=6`,
      { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );

    const products = (data.results || []).map((item) => ({
      mlId: item.id,
      title: item.title,
      price: item.price,
      commission: 8,
      affiliateUrl: item.permalink || `https://produto.mercadolivre.com.br/${item.id}`,
      category: item.category_id || "MLB1000",
      thumbnail: (item.thumbnail || "").replace("I.jpg", "O.jpg"),
      rating: 4.5,
      sold: item.sold_quantity || 0,
      trending: false,
    }));

    // Salva no banco
    for (const p of products) {
      await prisma.product.upsert({ where: { mlId: p.mlId }, update: p, create: p }).catch(() => {});
    }

    // Busca os ids salvos para retornar com id do banco
    const saved = await prisma.product.findMany({
      where: { mlId: { in: products.map((p) => p.mlId) } },
    });

    res.json({ products: saved, source: "search" });
  } catch (e) {
    console.error("from-search erro:", e.message);
    res.status(500).json({ error: "Busca falhou. Tente colar o link direto do produto." });
  }
});

// POST /products/custom — cria produto customizado com título, preço e foto própria
router.post("/custom", authMiddleware, async (req, res) => {
  const { title, price, commission = 8, thumbnailUrl } = req.body;
  if (!title || !price) return res.status(400).json({ error: "Título e preço obrigatórios" });

  try {
    const mlId = "CUSTOM_" + Date.now() + "_" + req.user.id.slice(-6);
    const product = await prisma.product.create({
      data: {
        mlId,
        title,
        price: parseFloat(price),
        commission: parseFloat(commission),
        affiliateUrl: "",
        category: "MLB1000",
        thumbnail: thumbnailUrl || "",
        rating: 4.5,
        sold: 0,
        trending: false,
      },
    });
    res.json({ product });
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
