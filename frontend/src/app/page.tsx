"use client";
import { useState } from "react";
import { Zap, Video, TrendingUp, DollarSign, Check, ArrowRight, Star, Play, Menu, X } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    name: "FREE",
    price: "0",
    desc: "Comece hoje sem cartão",
    color: "border-gray-700",
    cta: "Começar grátis",
    ctaStyle: "btn-secondary w-full text-center",
    features: ["3 vídeos/mês", "Produtos em alta", "Download do vídeo", "Analytics básico"],
    noFeatures: ["Publicação automática", "Agendamento", "Multi-plataforma", "Suporte prioritário"],
  },
  {
    name: "PRO",
    price: "97",
    desc: "Para criadores sérios",
    color: "border-purple-500",
    cta: "Assinar PRO",
    ctaStyle: "btn-primary w-full text-center",
    badge: "MAIS POPULAR",
    features: ["30 vídeos/mês", "Publicação no TikTok", "Publicação no YouTube", "Agendamento inteligente", "Analytics completo", "Suporte por email"],
    noFeatures: ["Multi-conta", "API de integração"],
  },
  {
    name: "ULTRA",
    price: "297",
    desc: "Para agências e escala",
    color: "border-pink-500",
    cta: "Assinar ULTRA",
    ctaStyle: "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 w-full text-center block",
    features: ["Ilimitado", "TikTok + YouTube + Kwai", "Multi-conta", "API de integração", "Relatórios avançados", "Suporte VIP 24/7", "Onboarding dedicado"],
    noFeatures: [],
  },
];

const TESTIMONIALS = [
  { name: "Lucas M.", handle: "@lucasafiliado", text: "Primeiro mês com a Viralify: R$ 4.800 em comissões. Os vídeos ficam profissionais demais.", stars: 5 },
  { name: "Camila R.", handle: "@camiladigital", text: "Eu não sabia editar vídeo. Com a IA da Viralify publico 5 vídeos por dia no automático.", stars: 5 },
  { name: "Rafael S.", handle: "@rafaelafiliados", text: "Em 3 semanas tive 2M de views. CTR de 8% — absurdo. Valeu cada centavo do PRO.", stars: 5 },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

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
            <Link href="/registro" className="btn-primary py-2 px-5 text-sm">Começar grátis</Link>
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
            <Link href="/registro" className="btn-primary text-center block">Começar grátis</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700 text-purple-300 text-sm px-4 py-2 rounded-full mb-8">
          <Zap size={14} /> Powered by IA — TikTok + YouTube + Kwai
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
          Vídeos virais de afiliado<br />
          <span className="gradient-text">gerados por IA</span><br />
          em 60 segundos
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Escolha um produto do Mercado Livre, a IA cria roteiro, narração e vídeo cinematic. Publica automático. Você só coleta as comissões.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/registro" className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4">
            <Zap size={22} /> Gerar meu primeiro vídeo grátis
          </Link>
          <a href="#como-funciona" className="btn-secondary flex items-center justify-center gap-2 text-lg px-8 py-4">
            <Play size={20} /> Ver como funciona
          </a>
        </div>

        {/* Social proof mini */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Check size={14} className="text-green-400" /> Sem cartão de crédito</span>
          <span className="flex items-center gap-1"><Check size={14} className="text-green-400" /> 3 vídeos grátis por mês</span>
          <span className="flex items-center gap-1"><Check size={14} className="text-green-400" /> Cancele quando quiser</span>
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

      {/* How it works */}
      <section id="como-funciona" className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">3 passos. Simples assim.</h2>
          <p className="text-gray-400 text-lg">Você não precisa saber editar, gravar ou escrever. A IA faz tudo.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", icon: TrendingUp, title: "Escolha um produto", desc: "Veja os produtos mais vendidos do Mercado Livre em tempo real, com comissão e dados de venda.", color: "bg-blue-500" },
            { step: "02", icon: Zap,        title: "IA gera o vídeo",   desc: "Roteiro viral, narração em português, imagens cinematográficas — tudo automático em ~60s.",  color: "bg-purple-500" },
            { step: "03", icon: DollarSign, title: "Publique e ganhe",  desc: "Publica automático no TikTok, YouTube e Kwai. Cada clique no link de afiliado = comissão.",    color: "bg-green-500" },
          ].map(s => (
            <div key={s.step} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 relative overflow-hidden card-glow">
              <div className="text-7xl font-black text-gray-800 absolute -top-2 -right-2 leading-none">{s.step}</div>
              <div className={`w-14 h-14 rounded-2xl ${s.color} bg-opacity-20 flex items-center justify-center mb-6`}>
                <s.icon size={28} className={s.color.replace("bg-", "text-")} />
              </div>
              <h3 className="text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-gray-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-gray-900 border-y border-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">Tudo que você precisa para escalar</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Video,       title: "Vídeos IA",            desc: "Roteiro + narração + vídeo cinematic gerados automaticamente" },
              { icon: TrendingUp,  title: "Produtos em alta",     desc: "Dados ao vivo do Mercado Livre com comissão e volume de vendas" },
              { icon: Zap,         title: "Publicação automática", desc: "Publica no TikTok, YouTube Shorts e Kwai sem você fazer nada" },
              { icon: DollarSign,  title: "Rastreio de comissões", desc: "Veja exatamente quais vídeos geraram receita e quanto" },
              { icon: Star,        title: "Agendamento",           desc: "Programe publicações para horários de maior engajamento" },
              { icon: ArrowRight,  title: "Link de afiliado",      desc: "Cada vídeo inclui seu link rastreável na bio e na descrição" },
            ].map(f => (
              <div key={f.title} className="bg-gray-800 rounded-2xl p-6">
                <f.icon size={24} className="text-purple-400 mb-3" />
                <h4 className="font-bold mb-2">{f.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Criadores que já faturam com Viralify</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.handle} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 card-glow">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">"{t.text}"</p>
              <div>
                <p className="font-bold text-sm">{t.name}</p>
                <p className="text-gray-500 text-xs">{t.handle}</p>
              </div>
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
            <div key={plan.name} className={`bg-gray-900 border-2 ${plan.color} rounded-2xl p-8 relative ${plan.badge ? "md:-mt-4 md:mb-4" : ""}`}>
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
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

              <Link href={plan.price === "0" ? "/registro" : `/checkout?plan=${plan.name.toLowerCase()}`} className={plan.ctaStyle}>
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
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Comece a faturar com afiliados<br />
            <span className="gradient-text">ainda hoje</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">Sem cartão de crédito. Sem compromisso. 3 vídeos grátis agora.</p>
          <Link href="/registro" className="btn-primary inline-flex items-center gap-2 text-lg px-10 py-4">
            <Zap size={22} /> Criar conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 px-6 text-center text-gray-600 text-sm">
        <p className="mb-2 font-bold text-gray-400">VIRALIFY</p>
        <p>© {new Date().getFullYear()} Viralify. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
