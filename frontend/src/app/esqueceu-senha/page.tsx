"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

export default function EsqueceuSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      const resp = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSent(true);
      } else {
        setError(data.error || "Erro ao enviar email");
      }
    } catch {
      setError("Sem conexão com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm">
          <ArrowLeft size={16} /> Voltar para o login
        </Link>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Email enviado!</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Se existe uma conta com <strong className="text-white">{email}</strong>, você receberá um link para redefinir sua senha em instantes.
              </p>
              <p className="text-gray-500 text-xs mb-6">Verifique também a caixa de spam.</p>
              <Link href="/login" className="btn-primary w-full block text-center">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-purple-900/40 rounded-2xl flex items-center justify-center mb-6">
                <Mail size={28} className="text-purple-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Esqueceu sua senha?</h1>
              <p className="text-gray-400 text-sm mb-8">
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoFocus
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                    ⚠ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full btn-primary py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
