"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap, TrendingUp, Video, DollarSign } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email ou senha incorretos");
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
        {/* Gradiente de fundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-transparent to-pink-900/20 pointer-events-none" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        {/* Logo */}
        <Link href="/" className="relative z-10">
          <span className="text-2xl font-black gradient-text">VIRALIFY</span>
        </Link>

        {/* Central */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Vídeos virais em<br />
              <span className="gradient-text">60 segundos.</span>
            </h2>
            <p className="text-gray-400 text-lg">
              IA gera roteiro, voz e vídeo para qualquer produto de afiliado.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Video, value: "12.400+", label: "Vídeos gerados" },
              { icon: TrendingUp, value: "4.8★", label: "Avaliação média" },
              { icon: DollarSign, value: "R$50/h", label: "Economia média" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                <Icon size={20} className="text-purple-400 mx-auto mb-2" />
                <p className="text-white font-bold text-lg">{value}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>

          {/* Depoimento */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              &ldquo;Gerei 15 vídeos em uma tarde e triplicou minha comissão no mês seguinte. Melhor ferramenta que já usei.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">M</div>
              <div>
                <p className="text-white text-sm font-medium">Marcos A.</p>
                <p className="text-gray-500 text-xs">Afiliado Mercado Livre</p>
              </div>
              <div className="ml-auto flex text-yellow-400 text-xs">★★★★★</div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            <h1 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h1>
            <p className="text-gray-400 text-sm">Entre na sua conta para continuar</p>
          </div>

          {/* Erro global */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6 flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                className="input placeholder-gray-600"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Senha</label>
                <a href="#" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="input placeholder-gray-600 pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
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
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 h-12 text-base mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><Zap size={18} /> Entrar</>
              }
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs">ou</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Link registro */}
          <p className="text-center text-gray-400 text-sm">
            Não tem conta?{" "}
            <Link href="/registro" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
              Criar conta grátis
            </Link>
          </p>

          {/* Termos */}
          <p className="text-center text-gray-600 text-xs mt-8">
            Ao entrar, você concorda com os{" "}
            <a href="#" className="text-gray-500 hover:text-gray-400">Termos de Uso</a>
            {" "}e{" "}
            <a href="#" className="text-gray-500 hover:text-gray-400">Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  );
}
