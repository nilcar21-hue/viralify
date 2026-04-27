const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// POST /webhooks/stripe — pagamentos
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

module.exports = router;
