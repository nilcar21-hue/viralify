const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { enviarBoasVindas, enviarPlanoAtualizado } = require("../services/emailService");

const prisma = new PrismaClient();

function gerarSenhaTemporaria() {
  const palavras = ["Solar", "Luna", "Tiger", "Cyber", "Nova", "Storm", "Flash", "Alpha", "Viper", "Nexo"];
  const p = palavras[Math.floor(Math.random() * palavras.length)];
  const n = Math.floor(Math.random() * 900) + 100;
  return `${p}${n}!`;
}

// POST /webhooks/hotmart
router.post("/hotmart", async (req, res) => {
  res.json({ received: true });

  try {
    const { event, data } = req.body;
    console.log(`[Hotmart] evento: ${event}`);

    if (event === "PURCHASE_COMPLETE" || event === "PURCHASE_APPROVED") {
      const buyer = data?.buyer;
      if (!buyer?.email) return;

      const email = buyer.email.toLowerCase().trim();
      const name = buyer.name || "Usuário Viralify";
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const offerId = data?.purchase?.offer?.code || "";
      const plan = offerId.toLowerCase().includes("ultra") ? "ULTRA" : "PRO";

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        const tempPassword = gerarSenhaTemporaria();
        const hashed = await bcrypt.hash(tempPassword, 10);
        user = await prisma.user.create({
          data: { email, name, password: hashed, plan, planExpiresAt: expiresAt },
        });
        console.log(`[Hotmart] conta criada: ${email} | plano: ${plan}`);
        await enviarBoasVindas({ email, name, password: tempPassword, plan });
      } else {
        await prisma.user.update({
          where: { email },
          data: { plan, planExpiresAt: expiresAt },
        });
        console.log(`[Hotmart] plano atualizado: ${email} → ${plan}`);
        await enviarPlanoAtualizado({ email, name: user.name, plan });
      }
    }

    if (event === "PURCHASE_REFUNDED" || event === "PURCHASE_CANCELLED") {
      const email = data?.buyer?.email?.toLowerCase()?.trim();
      if (email) {
        await prisma.user.updateMany({
          where: { email },
          data: { plan: "FREE", planExpiresAt: null },
        });
        console.log(`[Hotmart] plano cancelado: ${email}`);
      }
    }
  } catch (e) {
    console.error("[Hotmart] erro:", e.message);
  }
});

router.post("/stripe", async (req, res) => {
  res.json({ received: true });
});

module.exports = router;
