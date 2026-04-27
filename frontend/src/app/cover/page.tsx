export default function CoverPage() {
  return (
    <div style={{
      width: "1920px",
      height: "1080px",
      background: "linear-gradient(135deg, #0f0520 0%, #1a0a2e 50%, #0d0019 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow circles */}
      <div style={{
        position: "absolute", width: "600px", height: "600px",
        borderRadius: "50%", background: "radial-gradient(circle, #7c3aed33 0%, transparent 70%)",
        top: "-100px", left: "-100px",
      }} />
      <div style={{
        position: "absolute", width: "500px", height: "500px",
        borderRadius: "50%", background: "radial-gradient(circle, #ec489933 0%, transparent 70%)",
        bottom: "-50px", right: "-50px",
      }} />

      {/* Badge */}
      <div style={{
        background: "#7c3aed22", border: "1px solid #7c3aed",
        borderRadius: "100px", padding: "10px 30px", marginBottom: "40px",
        color: "#c084fc", fontSize: "28px", letterSpacing: "3px",
        textTransform: "uppercase",
      }}>
        IA • TikTok • YouTube • Shopee • Kwai
      </div>

      {/* Logo */}
      <div style={{
        fontSize: "140px", fontWeight: "900", letterSpacing: "-4px",
        background: "linear-gradient(90deg, #a855f7, #ec4899)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: "20px", lineHeight: 1,
      }}>
        VIRALIFY
      </div>

      {/* Subtitle */}
      <div style={{
        fontSize: "52px", color: "#e2e8f0", fontWeight: "700",
        marginBottom: "20px", textAlign: "center",
      }}>
        Vídeos de Afiliado com IA em 60 segundos
      </div>

      {/* Description */}
      <div style={{
        fontSize: "34px", color: "#94a3b8", textAlign: "center",
        maxWidth: "1200px", lineHeight: 1.5, marginBottom: "60px",
      }}>
        Cole o link do produto → IA cria roteiro + narração + vídeo → Publique e receba comissões
      </div>

      {/* CTA Button */}
      <div style={{
        background: "linear-gradient(90deg, #7c3aed, #ec4899)",
        borderRadius: "20px", padding: "25px 80px",
        fontSize: "44px", fontWeight: "900", color: "white",
        letterSpacing: "1px",
      }}>
        COMEÇAR GRÁTIS — SEM CARTÃO
      </div>

      {/* Bottom stats */}
      <div style={{
        position: "absolute", bottom: "50px",
        display: "flex", gap: "80px", color: "#64748b", fontSize: "26px",
      }}>
        <span>✓ 3 vídeos grátis/mês</span>
        <span>✓ Sem aparecer na câmera</span>
        <span>✓ PIX • Cartão • Boleto</span>
        <span>✓ Garantia 30 dias</span>
      </div>
    </div>
  );
}
