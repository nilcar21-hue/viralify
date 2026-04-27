const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

// POST /webhooks/stripe — pagamentos Stripe
router.post("/stripe", async (req, res) => {
  const { type, data } = req.body;

  if (type === "checkout.session.completed") {
    const { customer_email, metadata } = data.object;
    const { plan } = metadata || {};
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.user.updateMany({
      where: { email: customer_email },
      data: { plan: plan || "PRO", planExpiresAt: expiresAt },
    });
  }

  res.json({ received: true });
});

// POST /webhooks/hotmart — pagamentos Hotmart
router.post("/hotmart", async (req, res) => {
  try {
    const { event, data } = req.body;

    // Hotmart envia o token no header para validação
    const hotToken = req.headers["x-hotmart-hottok"] || req.headers["hottok"];
    const expectedToken = process.env.HOTMART_WEBHOOK_TOKEN;
    if (expectedToken && hotToken !== expectedToken) {
      return res.status(401).json({ error: "Token inválido" });
    }

    if (event === "PURCHASE_COMPLETE" || event === "PURCHASE_APPROVED") {
      const buyer = data?.buyer;
      const purchase = data?.purchase;
      if (!buyer?.email) return res.json({ received: true });

      const email = buyer.email.toLowerCase();
      const name = buyer.name || "Usuário Viralify";
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Verifica se já existe
      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        // Cria conta automaticamente com senha aleatória
        const tempPassword = Math.random().toString(36).slice(-8) + "V1@";
        const hashed = await bcrypt.hash(tempPassword, 10);
        user = await prisma.user.create({
          data: {
            email,
            name,
            password: hashed,
            plan: "PRO",
            planExpiresAt: expiresAt,
          },
        });
        console.log(`Hotmart: conta criada para ${email}`);
      } else {
        // Atualiza plano do usuário existente
        await prisma.user.update({
          where: { email },
          data: { plan: "PRO", planExpiresAt: expiresAt },
        });
        console.log(`Hotmart: plano atualizado para ${email}`);
      }
    }

    if (event === "PURCHASE_REFUNDED" || event === "PURCHASE_CANCELLED") {
      const email = data?.buyer?.email?.toLowerCase();
      if (email) {
        await prisma.user.updateMany({
          where: { email },
          data: { plan: "FREE", planExpiresAt: null },
        });
        console.log(`Hotmart: plano cancelado para ${email}`);
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error("Hotmart webhook erro:", e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
