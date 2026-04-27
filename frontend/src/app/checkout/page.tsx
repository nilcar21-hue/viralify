"use client";
import { useSearchParams } from "next/navigation";
import { Check, Lock, Shield, Zap, Star } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const PLANS: Record<string, { name: string; price: string; features: string[]; hotmartUrl: string }> = {
  pro: {
    name: "Viralify PRO",
    price: "97",
    hotmartUrl: "https://pay.hotmart.com/P105580233D",
    features: ["30 vídeos/mês", "TikTok + YouTube + Kwai", "Narração IA PT-BR", "Agendamento inteligente", "Analytics completo", "Suporte por email"],
  },
  ultra: {
    name: "Viralify ULTRA",
    price: "297",
    hotmartUrl: "https://pay.hotmart.com/P105580233D?offerId=ultra",
    features: ["Vídeos ilimitados", "6 plataformas", "Multi-conta", "API integração", "Suporte VIP 24/7", "Onboarding 1:1"],
  },
};

function CheckoutContent() {
  const params = useSearchParams();
  const planKey = params.get("plan") || "pro";
  const plan = PLANS[planKey] || PLANS.pro;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">VIRALIFY</span>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-6 text-center">
            <p className="text-purple-300 text-sm mb-1">Você está assinando</p>
            <h1 className="text-2xl font-black">{plan.name}</h1>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className="text-gray-300 text-sm">R$</span>
              <span className="text-5xl font-black">{plan.price}</span>
              <span className="text-gray-300 text-sm">/mês</span>
            </div>
          </div>

          <div className="p-6">
            {/* Features */}
            <div className="space-y-3 mb-6">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-3 text-sm">
                  <Check size={16} className="text-green-400 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {/* Pagamento */}
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Formas de pagamento</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: "💠", label: "PIX", sub: "Imediato" },
                  { icon: "💳", label: "Cartão", sub: "12x" },
                  { icon: "📄", label: "Boleto", sub: "3 dias" },
                ].map(m => (
                  <div key={m.label} className="bg-gray-700 rounded-lg p-2 text-center">
                    <div className="text-xl mb-0.5">{m.icon}</div>
                    <p className="text-xs font-bold">{m.label}</p>
                    <p className="text-xs text-gray-400">{m.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <a href={plan.hotmartUrl} target="_blank"
              className="block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-4 px-6 rounded-xl transition-all text-lg mb-3">
              <Zap size={18} className="inline mr-2" />
              Finalizar compra segura
            </a>

            {/* Garantias */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Lock size={12} /> SSL</span>
              <span className="flex items-center gap-1"><Shield size={12} /> Garantia 30 dias</span>
              <span className="flex items-center gap-1"><Star size={12} /> Hotmart</span>
            </div>
          </div>
        </div>

        {/* Order Bump */}
        <div className="mt-4 bg-gray-900 border-2 border-yellow-500/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 w-5 h-5 accent-yellow-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-yellow-400 mb-1">
                ✅ Adicionar: 10 Roteiros Virais Prontos — R$ 27
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Pacote com 10 roteiros testados e validados para os produtos mais vendidos do Mercado Livre.
                Copie, cole e gere — sem precisar editar nada. Entrega imediata.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Ao continuar você concorda com os <a href="#" className="underline">Termos de Uso</a> e a <a href="#" className="underline">Política de Privacidade</a>
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Carregando...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
