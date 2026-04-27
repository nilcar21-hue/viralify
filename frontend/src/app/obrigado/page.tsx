"use client";
import { useEffect, useState } from "react";
import { Check, Zap, ArrowRight, Star, Clock, Gift, X } from "lucide-react";
import Link from "next/link";

const UPSELL = {
  title: "ESPERA! Oferta exclusiva para novos membros",
  subtitle: "Essa oferta desaparece em:",
  offer: "ULTRA — Vídeos Ilimitados",
  desc: "Você acabou de garantir o PRO (30 vídeos/mês). Quer publicar sem limite, todos os dias, nas 6 plataformas?",
  price: "197",
  oldPrice: "297",
  cta: "SIM! Quero o ULTRA agora",
  ctaUrl: "https://pay.hotmart.com/P105580233D?offerId=ultra",
  skip: "Não, prefiro ficar limitado a 30 vídeos/mês",
  features: [
    "Vídeos ilimitados todo mês",
    "TikTok + YouTube + Kwai + Instagram + Shopee",
    "Multi-conta (gerencie 3 perfis)",
    "API de integração",
    "Suporte VIP 24/7",
    "Relatórios avançados",
    "Onboarding dedicado 1:1",
  ],
};

export default function ObrigadoPage() {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutos
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header confirmação */}
      <div className="bg-green-900/30 border-b border-green-700 py-6 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-green-400 mb-2">Pagamento confirmado!</h1>
          <p className="text-gray-300">Bem-vindo ao Viralify PRO. Seu acesso está sendo liberado.</p>
        </div>
      </div>

      {/* Próximos passos */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <Zap size={20} className="text-purple-400" /> Próximos passos
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Verifique seu email", desc: "Enviamos os dados de acesso para o email cadastrado" },
              { step: "2", title: "Acesse o app", desc: "Entre em viralify.angralocal.online com seu login e senha" },
              { step: "3", title: "Gere seu primeiro vídeo", desc: "Escolha um produto e clique em Gerar — em 60s seu vídeo fica pronto" },
            ].map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold shrink-0">{s.step}</div>
                <div>
                  <p className="font-bold text-sm">{s.title}</p>
                  <p className="text-gray-400 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="https://viralify.angralocal.online/login" target="_blank"
            className="mt-6 block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all">
            Acessar o app agora
          </Link>
        </div>

        {/* UPSELL */}
        {!dismissed && (
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-2xl overflow-hidden">
            {/* Timer */}
            <div className="bg-yellow-500 px-6 py-3 flex items-center justify-between">
              <span className="font-black text-black text-sm uppercase">{UPSELL.title}</span>
              <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-lg">
                <Clock size={14} className="text-black" />
                <span className="font-black text-black">{mm}:{ss}</span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Gift size={20} className="text-yellow-400" />
                <h3 className="font-black text-xl">{UPSELL.offer}</h3>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">{UPSELL.desc}</p>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {UPSELL.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-green-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Preço */}
              <div className="bg-gray-800 rounded-xl p-4 mb-6 text-center">
                <p className="text-gray-500 text-sm line-through mb-1">De R$ {UPSELL.oldPrice}/mês</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-gray-400 text-sm">R$</span>
                  <span className="text-5xl font-black text-yellow-400">{UPSELL.price}</span>
                  <span className="text-gray-400 text-sm">/mês</span>
                </div>
                <p className="text-green-400 text-sm font-bold mt-1">Economia de R$ 100/mês — só nessa página</p>
              </div>

              {/* CTAs */}
              <a href={UPSELL.ctaUrl} target="_blank"
                className="block w-full text-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black py-4 px-6 rounded-xl transition-all text-lg mb-3">
                {UPSELL.cta} <ArrowRight size={20} className="inline ml-1" />
              </a>
              <button onClick={() => setDismissed(true)}
                className="block w-full text-center text-gray-600 hover:text-gray-400 text-sm py-2 transition-colors">
                {UPSELL.skip}
              </button>
            </div>
          </div>
        )}

        {/* Após dispensar upsell */}
        {dismissed && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
            <Star size={32} className="text-yellow-400 mx-auto mb-3" />
            <h3 className="font-bold mb-2">Você tem 30 dias para experimentar</h3>
            <p className="text-gray-400 text-sm mb-4">Se quiser fazer upgrade para ULTRA a qualquer momento, acesse Configurações dentro do app.</p>
            <Link href="https://viralify.angralocal.online/login" target="_blank"
              className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-8 rounded-xl">
              Começar agora
            </Link>
          </div>
        )}

        {/* Depoimentos rápidos */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { name: "Lucas M.", text: "Em 2 dias já tinha R$ 800 em comissões. Simplesmente incrível.", stars: 5 },
            { name: "Camila R.", text: "Publiquei 5 vídeos no primeiro dia. Nunca foi tão fácil.", stars: 5 },
          ].map(t => (
            <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex gap-1 mb-2">
                {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}
              </div>
              <p className="text-gray-300 text-sm mb-2">"{t.text}"</p>
              <p className="text-gray-500 text-xs font-bold">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
