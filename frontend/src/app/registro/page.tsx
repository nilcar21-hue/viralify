"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Check } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

export default function Registro() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black gradient-text">VIRALIFY</span>
          </Link>
          <p className="text-gray-400 mt-2">Crie sua conta grátis</p>
        </div>

        {/* Benefits */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {["3 vídeos grátis", "Sem cartão", "Cancele quando quiser"].map(b => (
            <span key={b} className="flex items-center gap-1.5 text-xs text-green-400">
              <Check size={12} /> {b}
            </span>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 card-glow">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Nome completo</label>
              <input
                className="input"
                placeholder="Seu nome"
                value={form.name}
                onChange={set("name")}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Email</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Senha</label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={set("password")}
                minLength={6}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Zap size={18} /> Criar conta grátis</>
              }
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-6">
            Ao criar conta você concorda com os{" "}
            <a href="#" className="text-purple-400">Termos de Uso</a>
            {" "}e{" "}
            <a href="#" className="text-purple-400">Política de Privacidade</a>
          </p>

          <p className="text-center text-gray-500 text-sm mt-4">
            Já tem conta?{" "}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
