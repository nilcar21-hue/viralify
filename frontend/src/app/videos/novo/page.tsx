"use client";
import { useState, useEffect } from "react";
import { Search, Zap, Check, ArrowLeft, Loader } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function NovoVideo() {
  const router = useRouter();
  const [step, setStep] = useState<"produto" | "gerando" | "pronto">("produto");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [videoId, setVideoId] = useState<string>("");
  const [video, setVideo] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/products/trending`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProducts(d.products || []));
  }, []);

  const filtrados = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  async function gerarVideo() {
    if (!selected) return;
    const token = localStorage.getItem("token");
    setStep("gerando");
    setError("");

    try {
      const res = await fetch(`${API}/videos/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoId(data.videoId);

      // Polling status
      const poll = setInterval(async () => {
        const r = await fetch(`${API}/videos/${data.videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const v = await r.json();
        if (v.status === "READY" || v.status === "FAILED") {
          clearInterval(poll);
          setVideo(v);
          setStep("pronto");
        }
      }, 5000);
    } catch (e: any) {
      setError(e.message);
      setStep("produto");
    }
  }

  if (step === "gerando") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-purple-900 flex items-center justify-center mx-auto mb-6">
          <Loader size={40} className="text-purple-400 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Gerando seu vídeo...</h2>
        <p className="text-gray-400 mb-6">A IA está criando o roteiro, narração e vídeo. Aguarde ~60 segundos.</p>
        <div className="space-y-3 text-left bg-gray-900 rounded-2xl p-6">
          {["Gerando roteiro viral com IA", "Criando narração em português", "Montando vídeo cinematic", "Finalizando..."].map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i < 2 ? "bg-green-500" : "bg-gray-700 animate-pulse"}`}>
                {i < 2 && <Check size={12} />}
              </div>
              <span className={i < 2 ? "text-white" : "text-gray-500"}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (step === "pronto") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        {video?.status === "READY" ? (
          <>
            <div className="w-24 h-24 rounded-full bg-green-900 flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Vídeo pronto!</h2>
            <p className="text-gray-400 mb-6">{video.title}</p>
            <div className="flex gap-3">
              <Link href="/videos" className="btn-secondary flex-1 text-center">Ver todos</Link>
              <Link href={`/videos/${video.id}`} className="btn-primary flex-1 text-center">Publicar agora</Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2 text-red-400">Erro ao gerar</h2>
            <p className="text-gray-400 mb-6">Tente novamente com outro produto.</p>
            <button onClick={() => setStep("produto")} className="btn-primary">Tentar novamente</button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Vídeo</h1>
          <p className="text-gray-400 text-sm">Escolha um produto para divulgar</p>
        </div>
      </div>

      {error && <div className="bg-red-900 border border-red-700 text-red-300 p-4 rounded-xl mb-6">{error}</div>}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input pl-11"
          placeholder="Buscar produto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filtrados.slice(0, 12).map((p: any) => (
          <button
            key={p.id || p.mlId}
            onClick={() => setSelected(selected?.mlId === p.mlId ? null : p)}
            className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
              selected?.mlId === p.mlId
                ? "border-purple-500 bg-purple-900/20"
                : "border-gray-800 bg-gray-900 hover:border-gray-600"
            }`}
          >
            <img
              src={p.thumbnail}
              alt={p.title}
              className="w-full h-40 object-contain bg-gray-800 rounded-xl mb-3"
            />
            <p className="text-sm font-medium line-clamp-2 mb-2">{p.title}</p>
            <div className="flex items-center justify-between">
              <span className="text-green-400 font-bold">R$ {p.price?.toFixed(2)}</span>
              <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-1 rounded-full">
                {p.commission}% comissão
              </span>
            </div>
            {p.trending && (
              <span className="text-xs bg-pink-900 text-pink-400 px-2 py-1 rounded-full mt-2 inline-block">
                🔥 Em alta
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CTA */}
      {selected && (
        <div className="fixed bottom-6 left-0 right-0 px-6">
          <div className="max-w-4xl mx-auto bg-gray-900 border border-purple-500 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm line-clamp-1">{selected.title}</p>
              <p className="text-green-400 text-sm">R$ {selected.price?.toFixed(2)} — {selected.commission}% comissão</p>
            </div>
            <button onClick={gerarVideo} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Zap size={18} /> Gerar Vídeo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
