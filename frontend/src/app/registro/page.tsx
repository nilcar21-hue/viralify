"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, Check, Shield, Clock, Star } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

function senhaForca(senha: string): { nivel: number; texto: string; cor: string } {
  if (!senha) return { nivel: 0, texto: "", cor: "" };
  let pts = 0;
  if (senha.length >= 6) pts++;
  if (senha.length >= 10) pts++;
  if (/[A-Z]/.test(senha)) pts++;
  if (/[0-9]/.test(senha)) pts++;
  if (/[^A-Za-z0-9]/.test(senha)) pts++;
  if (pts <= 1) return { nivel: 1, texto: "Fraca", cor: "bg-red-500" };
  if (pts <= 3) return { nivel: 2, texto: "Média", cor: "bg-yellow-500" };
  return { nivel: 3, texto: "Forte", cor: "bg-green-500" };
}

export default function Registro() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const forca = senhaForca(form.password);

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { setError("Senha deve ter no mínimo 6 caracteres."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar conta");
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LADO ESQUERDO — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-pink-900/20 pointer-events-none" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <Link href="/" className="relative z-10">
          <span className="text-2xl font-black gradient-text">VIRALIFY</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Comece a faturar<br />
              <span className="gradient-text">ainda hoje.</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Crie vídeos profissionais de afiliado em segundos, sem editar nada.
            </p>
          </div>

          {/* Benefícios */}
          <div className="space-y-3">
            {[
              { icon: Star, text: "3 vídeos grátis para testar — sem cartão" },
              { icon: Clock, text: "Vídeo pronto em menos de 60 segundos" },
              { icon: Shield, text: "Cancele quando quiser, sem compromisso" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-purple-400" />
                </div>
                <p className="text-gray-300 text-sm">{text}</p>
              </div>
            ))}
          </div>

          {/* Depoimentos */}
          <div className="space-y-3">
            {[
              { inicial: "A", nome: "Ana Lima", cargo: "Afiliada Shopee", texto: "Primeiro mês já paguei o plano 10x. Incrível." },
              { inicial: "R", nome: "Ricardo M.", cargo: "Afiliado Amazon", texto: "Antes levava horas editando. Agora é um clique." },
            ].map(({ inicial, nome, cargo, texto }) => (
              <div key={nome} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-gray-300 text-xs mb-2">&ldquo;{texto}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">{inicial}</div>
                  <p className="text-gray-400 text-xs">{nome} · {cargo}</p>
                  <span className="ml-auto text-yellow-400 text-xs">★★★★★</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-gray-600 text-xs">© 2026 Viralify. Todos os direitos reservados.</p>
      </div>

      {/* ── LADO DIREITO — formulário ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-950">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/"><span className="text-3xl font-black gradient-text">VIRALIFY</span></Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Criar conta grátis</h1>
            <p className="text-gray-400 text-sm">3 vídeos grátis — sem cartão de crédito</p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["✓ Grátis", "✓ Sem cartão", "✓ Cancele quando quiser"].map(b => (
              <span key={b} className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full">
                {b}
              </span>
            ))}
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6 flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Nome completo</label>
              <input
                className="input placeholder-gray-600"
                placeholder="Seu nome"
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                className="input placeholder-gray-600"
                placeholder="seu@email.com"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                required
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="input placeholder-gray-600 pr-11"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Indicador de força */}
              {form.password && (
                <div className="pt-1 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3].map(n => (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          n <= forca.nivel ? forca.cor : "bg-gray-800"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${forca.nivel === 1 ? "text-red-400" : forca.nivel === 2 ? "text-yellow-400" : "text-green-400"}`}>
                    Senha {forca.texto}
                  </p>
                </div>
              )}
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 h-12 text-base mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Zap size={18} /> Criar conta grátis</>
              }
            </button>
          </form>

          {/* Link login */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
              Entrar
            </Link>
          </p>

          {/* Termos */}
          <p className="text-center text-gray-600 text-xs mt-6">
            Ao criar conta você concorda com os{" "}
            <a href="#" className="text-gray-500 hover:text-gray-400">Termos de Uso</a>
            {" "}e{" "}
            <a href="#" className="text-gray-500 hover:text-gray-400">Política de Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  );
}
