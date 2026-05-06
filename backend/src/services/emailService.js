const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Viralify <noreply@viralify.com.br>";

// Email de boas-vindas após compra no Hotmart (conta nova)
async function enviarBoasVindas({ email, name, password, plan }) {
  const planLabel = plan === "ULTRA" ? "ULTRA" : "PRO";
  const videoLimit = plan === "ULTRA" ? "Ilimitados" : "30 vídeos/mês";

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `🎉 Bem-vindo ao Viralify ${planLabel}! Seus dados de acesso`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#030712;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030712;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:40px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:32px;font-weight:900;letter-spacing:-1px;">VIRALIFY</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px;">Vídeos virais em 60 segundos</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="color:white;font-size:24px;margin:0 0 8px;">Olá, ${name.split(" ")[0]}! 👋</h2>
          <p style="color:#94a3b8;font-size:16px;margin:0 0 32px;line-height:1.6;">
            Seu plano <strong style="color:#c084fc;">${planLabel}</strong> está ativo. Aqui estão seus dados de acesso:
          </p>

          <!-- Credenciais -->
          <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:32px;border:1px solid #334155;">
            <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">Seus dados de acesso</p>
            <div style="margin-bottom:12px;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Email</p>
              <p style="color:white;font-size:16px;font-weight:600;margin:0;">${email}</p>
            </div>
            <div>
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">Senha temporária</p>
              <p style="color:#4ade80;font-size:20px;font-weight:700;margin:0;font-family:monospace;letter-spacing:2px;">${password}</p>
            </div>
          </div>

          <!-- Plano -->
          <div style="background:#1e1b4b;border-radius:12px;padding:24px;margin-bottom:32px;border:1px solid #312e81;">
            <p style="color:#a5b4fc;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Seu plano ${planLabel} inclui</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <p style="color:white;margin:4px 0;">✅ ${videoLimit}</p>
              <p style="color:white;margin:4px 0;">✅ Roteiro com IA por influencer</p>
              <p style="color:white;margin:4px 0;">✅ Voz natural ElevenLabs</p>
              <p style="color:white;margin:4px 0;">✅ Vídeos com imagem real do produto</p>
              <p style="color:white;margin:4px 0;">✅ Links permanentes no Cloudflare R2</p>
            </div>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:32px;">
            <a href="https://viralify-ia.vercel.app/login" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px;">
              Acessar minha conta →
            </a>
          </div>

          <!-- Aviso senha -->
          <div style="background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #f59e0b;">
            <p style="color:#fbbf24;font-size:13px;margin:0;">
              ⚠️ <strong>Troque sua senha</strong> após o primeiro acesso em Conta → Alterar Senha.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #1e293b;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">
            Dúvidas? Responda este email ou acesse <a href="https://viralify-ia.vercel.app" style="color:#7c3aed;">viralify-ia.vercel.app</a>
          </p>
          <p style="color:#334155;font-size:11px;margin:8px 0 0;">© 2026 Viralify. Todos os direitos reservados.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Boas-vindas enviado para ${email}`);
    return true;
  } catch (e) {
    console.error(`[Email] Falhou para ${email}:`, e.message);
    return false;
  }
}

// Email de plano atualizado (usuário já tinha conta)
async function enviarPlanoAtualizado({ email, name, plan }) {
  const planLabel = plan === "ULTRA" ? "ULTRA" : "PRO";
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `✅ Seu plano Viralify ${planLabel} está ativo!`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#030712;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030712;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:40px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:32px;font-weight:900;">VIRALIFY</h1>
        </td></tr>
        <tr><td style="padding:40px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">🚀</div>
          <h2 style="color:white;font-size:24px;margin:0 0 16px;">Plano ${planLabel} ativado, ${name.split(" ")[0]}!</h2>
          <p style="color:#94a3b8;font-size:16px;margin:0 0 32px;line-height:1.6;">
            Seu upgrade foi processado com sucesso. Faça login e comece a gerar vídeos virais agora.
          </p>
          <a href="https://viralify-ia.vercel.app/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px;">
            Ir para o Dashboard →
          </a>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #1e293b;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 Viralify. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Plano atualizado enviado para ${email}`);
    return true;
  } catch (e) {
    console.error(`[Email] Falhou para ${email}:`, e.message);
    return false;
  }
}

// Email de recuperação de senha
async function enviarResetSenha({ email, name, resetToken }) {
  const resetUrl = `https://viralify-ia.vercel.app/reset-senha?token=${resetToken}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "🔐 Redefinir sua senha — Viralify",
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#030712;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030712;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:40px;text-align:center;">
          <h1 style="margin:0;color:white;font-size:32px;font-weight:900;">VIRALIFY</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:white;font-size:22px;margin:0 0 16px;">Redefinir senha</h2>
          <p style="color:#94a3b8;font-size:16px;margin:0 0 32px;line-height:1.6;">
            Olá, ${name.split(" ")[0]}. Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo:
          </p>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:white;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:700;font-size:16px;">
              Redefinir minha senha →
            </a>
          </div>
          <div style="background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #ef4444;">
            <p style="color:#fca5a5;font-size:13px;margin:0;">
              ⚠️ Este link expira em <strong>1 hora</strong>. Se você não solicitou isso, ignore este email.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #1e293b;text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">© 2026 Viralify. Todos os direitos reservados.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Reset senha enviado para ${email}`);
    return true;
  } catch (e) {
    console.error(`[Email] Reset falhou para ${email}:`, e.message);
    return false;
  }
}

module.exports = { enviarBoasVindas, enviarPlanoAtualizado, enviarResetSenha };
