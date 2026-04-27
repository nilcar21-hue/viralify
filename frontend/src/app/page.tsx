"use client";
import { useState } from "react";
import { Zap, Video, TrendingUp, DollarSign, Check, ArrowRight, Star, Play, Menu, X, Bot, Mic, Film, Share2, ShoppingBag, Youtube } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    name: "FREE",
    price: "0",
    desc: "Comece hoje sem cartão",
    color: "border-gray-700",
    cta: "Começar grátis",
    ctaStyle: "block w-full text-center bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200",
    features: ["3 vídeos/mês", "Produtos em alta ML", "Download do vídeo", "Analytics básico"],
    noFeatures: ["Publicação automática", "Agendamento", "Multi-plataforma", "Suporte prioritário"],
  },
  {
    name: "PRO",
    price: "97",
    desc: "Para criadores sérios",
    color: "border-purple-500",
    cta: "Assinar PRO — R$ 97/mês",
    ctaStyle: "block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200",
    badge: "MAIS POPULAR",
    features: ["30 vídeos/mês", "TikTok + YouTube + Kwai", "Agendamento inteligente", "Analytics completo", "Narração IA em PT-BR", "Suporte por email"],
    noFeatures: ["Multi-conta", "API de integração"],
  },
  {
    name: "ULTRA",
    price: "297",
    desc: "Para agências e escala",
    color: "border-pink-500",
    cta: "Assinar ULTRA",
    ctaStyle: "block w-full text-center bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200",
    features: ["Vídeos ilimitados", "TikTok + YouTube + Kwai", "Multi-conta", "API de integração", "Relatórios avançados", "Suporte VIP 24/7", "Onboarding dedicado"],
    noFeatures: [],
  },
];

const TESTIMONIALS = [
  {
    name: "Lucas Mendes",
    handle: "@lucasafiliado_ml",
    role: "Afiliado Mercado Livre",
    text: "Primeiro mês com a Viralify: R$ 4.800 em comissões. Os vídeos ficam tão profissionais que as pessoas não acreditam que foi IA.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    result: "R$ 4.800/mês",
  },
  {
    name: "Camila Rodrigues",
    handle: "@camiladigital",
    role: "Criadora de Conteúdo",
    text: "Eu não sabia editar vídeo. Hoje publico 5 vídeos por dia no automático. Sem aparecer, sem gravar, sem complicação.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    result: "5 vídeos/dia",
  },
  {
    name: "Rafael Souza",
    handle: "@rafaelafiliados",
    role: "Afiliado TikTok Shop",
    text: "Em 3 semanas tive 2 milhões de views. CTR de 8% — absurdo. Valeu cada centavo do PRO.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    result: "2M de views",
  },
  {
    name: "Ana Paula Lima",
    handle: "@anapaula.ml",
    role: "Dona de casa → Afiliada",
    text: "Comecei sem saber nada. Em 2 meses já tiro R$ 2.300 por mês só com o Mercado Livre. A Viralify fez tudo pelo meu negócio.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    result: "R$ 2.300/mês",
  },
  {
    name: "Marcos Oliveira",
    handle: "@marcosviral",
    role: "Ex-CLT, agora afiliado",
    text: "Larguei o emprego depois de 4 meses usando a Viralify. Hoje fatura 3x mais do que o meu salário antigo.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    result: "3x o salário",
  },
  {
    name: "Juliana Costa",
    handle: "@juliana.afiliada",
    role: "Afiliada Shopee + ML",
    text: "Uso para Mercado Livre e Shopee. A narração em português fica incrível, parece locutor profissional.",
    stars: 5,
    avatar: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop",
    result: "2 plataformas",
  },
];

const PLATFORMS = [
  { name: "TikTok", color: "bg-black border-gray-700", icon: "🎵" },
  { name: "YouTube Shorts", color: "bg-red-950 border-red-900", icon: "▶️" },
  { name: "Kwai", color: "bg-yellow-950 border-yellow-900", icon: "⚡" },
  { name: "Instagram Reels", color: "bg-purple-950 border-purple-900", icon: "📸" },
  { name: "Shopee Vídeos", color: "bg-orange-950 border-orange-900", icon: "🛍️" },
  { name: "Mercado Livre", color: "bg-yellow-950 border-yellow-900", icon: "🛒" },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-black gradient-text">VIRALIFY</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#precos" className="hover:text-white transition-colors">Preços</a>
            <a href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Entrar</Link>
            <Link href="/registro" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2 px-5 rounded-xl text-sm transition-all">Começar grátis</Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 px-6 py-4 space-y-3">
            <a href="#como-funciona" className="block text-gray-400 hover:text-white py-2">Como funciona</a>
            <a href="#precos" className="block text-gray-400 hover:text-white py-2">Preços</a>
            <a href="#depoimentos" className="block text-gray-400 hover:text-white py-2">Depoimentos</a>
            <Link href="/login" className="block text-gray-400 hover:text-white py-2">Entrar</Link>
            <Link href="/registro" className="block text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-xl">Começar grátis</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700 text-purple-300 text-sm px-4 py-2 rounded-full mb-8">
          <Zap size={14} /> Cole o link do produto — a IA faz o resto
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
          Vídeos de afiliado<br />
          <span className="gradient-text">gerados por IA</span><br />
          sem aparecer na câmera
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-6">
          Cole o link do produto. A IA cria roteiro viral, narração em português e vídeo pronto para TikTok, YouTube e Shopee — em menos de 60 segundos.
        </p>

        <p className="text-base text-gray-500 max-w-xl mx-auto mb-10">
          Funciona para <span className="text-white font-semibold">Mercado Livre</span>, <span className="text-white font-semibold">Shopee</span>, <span className="text-white font-semibold">Amazon</span> e qualquer marketplace.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/registro" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-xl text-lg flex items-center justify-center gap-2 transition-all">
            <Zap size={22} /> Gerar meu primeiro vídeo grátis
          </Link>
          <a href="#demo" className="border border-gray-700 hover:border-gray-500 text-white font-bold py-4 px-8 rounded-xl text-lg flex items-center justify-center gap-2 transition-all">
            <Play size={20} /> Ver demo ao vivo
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Check size={14} className="text-green-400" /> Sem cartão de crédito</span>
          <span className="flex items-center gap-1"><Check size={14} className="text-green-400" /> Sem aparecer na câmera</span>
          <span className="flex items-center gap-1"><Check size={14} className="text-green-400" /> Cancele quando quiser</span>
          <span className="flex items-center gap-1"><Check size={14} className="text-green-400" /> 3 vídeos grátis por mês</span>
        </div>
      </section>

      {/* Stats strip */}
      <div className="bg-gray-900 border-y border-gray-800 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "12.400+", label: "Vídeos gerados" },
            { value: "R$ 2.1M+", label: "Comissões geradas" },
            { value: "3.200+", label: "Criadores ativos" },
            { value: "94%", label: "Taxa de satisfação" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-black gradient-text mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Demo */}
      <section id="demo" className="py-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4">Veja o resultado em tempo real</h2>
          <p className="text-gray-400 text-lg">Do link do produto ao vídeo viral em menos de 60 segundos</p>
        </div>

        <div className="relative rounded-3xl overflow-hidden border border-gray-800 bg-gray-900 aspect-video">
          <video
            controls
            poster=""
            className="w-full h-full object-cover"
            preload="metadata"
          >
            <source src="https://viralify-production.up.railway.app/uploads/viralify-vsl.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Mini steps below video */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            { icon: "🔗", label: "Cole o link" },
            { icon: "🤖", label: "IA cria roteiro" },
            { icon: "🎙️", label: "Narração PT-BR" },
            { icon: "🎬", label: "Vídeo pronto" },
          ].map((s, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <div className="py-12 px-6 bg-gray-900 border-y border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500 text-sm mb-6 uppercase tracking-widest">Publica automaticamente em</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {PLATFORMS.map(p => (
              <div key={p.name} className={`${p.color} border rounded-xl p-3 text-center`}>
                <div className="text-2xl mb-1">{p.icon}</div>
                <p className="text-xs text-gray-400 font-medium leading-tight">{p.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">3 passos. Simples assim.</h2>
          <p className="text-gray-400 text-lg">Você não precisa saber editar, gravar ou aparecer. A IA faz tudo.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              emoji: "🔗",
              title: "Cole o link do produto",
              desc: "Link do Mercado Livre, Shopee, Amazon ou qualquer marketplace. A IA identifica o produto, preço e comissão automaticamente.",
              color: "from-blue-600 to-blue-800",
            },
            {
              step: "02",
              emoji: "🤖",
              title: "IA cria o vídeo completo",
              desc: "Roteiro viral no estilo TikTok, narração em português com voz humana real, e vídeo cinematic — tudo pronto em ~60 segundos.",
              color: "from-purple-600 to-pink-600",
            },
            {
              step: "03",
              emoji: "💰",
              title: "Publique e receba comissões",
              desc: "Um clique publica no TikTok, YouTube Shorts e Kwai. Seu link de afiliado vai embutido. Cada venda = comissão na sua conta.",
              color: "from-green-600 to-emerald-600",
            },
          ].map(s => (
            <div key={s.step} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 relative overflow-hidden hover:border-gray-600 transition-colors">
              <div className="text-7xl font-black text-gray-800/50 absolute -top-2 -right-2 leading-none">{s.step}</div>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-6 text-2xl`}>
                {s.emoji}
              </div>
              <h3 className="text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-gray-900 border-y border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">Tudo que você precisa para escalar</h2>
            <p className="text-gray-400">Uma plataforma completa — do produto ao vídeo publicado.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: "🤖", title: "Roteiro viral IA",        desc: "Llama 3.3 cria scripts no estilo dos vídeos mais virais do TikTok Brasil" },
              { emoji: "🎙️", title: "Narração humana PT-BR",   desc: "Voz natural em português, sem sotaque robótico — parece locutor profissional" },
              { emoji: "🎬", title: "Vídeo cinematic",         desc: "Vídeo vertical 1080x1920 pronto para TikTok, Reels e Shorts" },
              { emoji: "📊", title: "Produtos em alta ML",     desc: "Dados ao vivo do Mercado Livre com comissão e volume de vendas" },
              { emoji: "⚡", title: "Publicação automática",   desc: "Publica no TikTok, YouTube Shorts e Kwai sem você fazer nada" },
              { emoji: "💸", title: "Rastreio de comissões",   desc: "Veja exatamente quais vídeos geraram receita e quanto" },
            ].map(f => (
              <div key={f.title} className="bg-gray-800 hover:bg-gray-750 rounded-2xl p-6 transition-colors">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <h4 className="font-bold mb-2">{f.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Criadores que já faturam com Viralify</h2>
          <p className="text-gray-400 text-lg">Resultados reais de pessoas reais — sem aparecer na câmera</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.handle} className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-6 transition-colors">
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.handle}</p>
                  <p className="text-purple-400 text-xs mt-0.5">{t.role}</p>
                </div>
                <div className="bg-green-900/40 border border-green-700 text-green-400 text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                  {t.result}
                </div>
              </div>
              <div className="flex gap-1 mb-3">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 leading-relaxed text-sm">"{t.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Investimento que se paga no primeiro vídeo</h2>
          <p className="text-gray-400 text-lg">Comece grátis. Escale quando quiser.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name} className={`bg-gray-900 border-2 ${plan.color} rounded-2xl p-8 relative ${plan.badge ? "md:-mt-4 md:mb-4 shadow-2xl shadow-purple-900/30" : ""}`}>
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-black text-lg mb-1">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-gray-400 text-sm">R$</span>
                  <span className="text-5xl font-black">{plan.price}</span>
                  {plan.price !== "0" && <span className="text-gray-400 text-sm">/mês</span>}
                </div>
              </div>

              <Link
                href={plan.price === "0" ? "/registro" : "https://pay.hotmart.com/P105580233D"}
                className={plan.ctaStyle}
                target={plan.price !== "0" ? "_blank" : undefined}
              >
                {plan.cta}
              </Link>

              <div className="mt-8 space-y-3">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm">
                    <Check size={16} className="text-green-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
                {(plan.noFeatures || []).map(f => (
                  <div key={f} className="flex items-center gap-3 text-sm text-gray-600">
                    <X size={16} className="shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-xl mx-auto">
          <p className="text-center text-gray-400 text-sm font-semibold mb-4 uppercase tracking-widest">Formas de pagamento aceitas</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">💠</div>
              <p className="text-xs font-bold text-blue-400">PIX</p>
              <p className="text-xs text-gray-500">Aprovação imediata</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">💳</div>
              <p className="text-xs font-bold text-white">Cartão</p>
              <p className="text-xs text-gray-500">Até 12x sem juros</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">📄</div>
              <p className="text-xs font-bold text-yellow-400">Boleto</p>
              <p className="text-xs text-gray-500">Vence em 3 dias</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">🔒 Pagamento seguro</span>
            <span>•</span>
            <span>Processado pela Hotmart</span>
            <span>•</span>
            <span>Garantia 30 dias</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-b from-gray-950 to-purple-950/20">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-6">🚀</div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Comece a faturar com afiliados<br />
            <span className="gradient-text">ainda hoje</span>
          </h2>
          <p className="text-gray-400 text-lg mb-4">Sem cartão de crédito. Sem compromisso. Sem aparecer na câmera.</p>
          <p className="text-gray-500 text-base mb-10">3 vídeos grátis agora — veja o resultado antes de assinar.</p>
          <Link href="/registro" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all">
            <Zap size={22} /> Criar conta grátis — é agora ou nunca
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <span className="text-2xl font-black gradient-text">VIRALIFY</span>
            <div className="flex gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Termos de uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Suporte</a>
            </div>
          </div>
          <p className="text-center text-gray-600 text-sm">© {new Date().getFullYear()} Viralify. Todos os direitos reservados. Produto distribuído pela Hotmart.</p>
        </div>
      </footer>
    </div>
  );
}
