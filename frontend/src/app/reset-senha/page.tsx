"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

export default function ResetSenha() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Link inválido. Solicite um novo link.");
  }, [token]);

  function senhaForca(s: string) {
    let score = 0;
    if (s.length >= 8) score++;
    if (/[A-Z]/.test(s)) score++;
    if (/[0-9]/.test(s)) score++;
    if (/[^A-Za-z0-9]/.test(s)) score++;
    return score;
  }

  const forca = senhaForca(password);
  const forcaLabel = ["", "Fraca", "Média", "Boa", "Forte"][forca] || "";
  const forcaCor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][forca] || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("As senhas não coincidem"); return; }
    if (password.length < 6) { setError("Senha muito curta (mínimo 6 caracteres)"); return; }

    setLoading(true);
    setError("");

    try {
      const resp = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await resp.json();
      if (data.ok) {
        setDone(true);
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setError(data.error || "Erro ao redefinir senha");
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black gradient-text">VIRALIFY</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Senha redefinida!</h2>
              <p className="text-gray-400 text-sm mb-2">Sua senha foi alterada com sucesso.</p>
              <p className="text-gray-500 text-xs">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Nova senha</h2>
              <p className="text-gray-400 text-sm mb-8">Digite e confirme sua nova senha.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      autoFocus
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= forca ? forcaCor : "bg-gray-700"}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${["","text-red-400","text-yellow-400","text-blue-400","text-green-400"][forca]}`}>{forcaLabel}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                    />
                    {confirm && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {password === confirm
                          ? <CheckCircle size={18} className="text-green-400" />
                          : <XCircle size={18} className="text-red-400" />}
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                    ⚠ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !token || !password || !confirm}
                  className="w-full btn-primary py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Salvando..." : "Redefinir senha"}
                </button>
              </form>

              <p className="text-center mt-6 text-sm text-gray-500">
                Lembrou a senha?{" "}
                <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                  Fazer login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
