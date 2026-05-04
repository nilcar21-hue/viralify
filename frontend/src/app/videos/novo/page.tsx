"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Zap, Check, ArrowLeft, Loader, Link2, ImagePlus, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

type Mode = "catalogo" | "link" | "custom";

export default function NovoVideo() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"produto" | "gerando" | "pronto">("produto");
  const [mode, setMode] = useState<Mode>("catalogo");

  // Catálogo
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  // Link ML
  const [mlUrl, setMlUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlProduct, setUrlProduct] = useState<any>(null);
  const [urlError, setUrlError] = useState("");

  // Produto customizado
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCommission, setCustomCommission] = useState("8");
  const [customThumb, setCustomThumb] = useState(""); // URL ou base64
  const [customThumbPreview, setCustomThumbPreview] = useState("");

  // Geração
  const [videoId, setVideoId] = useState("");
  const [video, setVideo] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/products/trending`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoadingProducts(false); })
      .catch(() => setLoadingProducts(false));
  }, []);

  const [searching, setSearching] = useState(false);

  // Busca em tempo real — banco local + ML API
  useEffect(() => {
    if (mode !== "catalogo" || !search.trim()) return;
    const token = localStorage.getItem("token");
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/products/from-search`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: search }),
        });
        const d = await res.json();
        if (d.products?.length) setProducts(d.products);
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [search, mode]);

  async function buscarPorLink() {
    if (!mlUrl.trim()) return;
    setLoadingUrl(true);
    setUrlError("");
    setUrlProduct(null);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/products/from-url`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: mlUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrlProduct(data.product);
      setSelected(data.product);
    } catch (e: any) {
      setUrlError(e.message);
    } finally {
      setLoadingUrl(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setCustomThumbPreview(result);
      setCustomThumb(result); // base64 — será enviado como thumbnailUrl
    };
    reader.readAsDataURL(file);
  }

  async function criarProdutoCustom() {
    if (!customTitle || !customPrice) return null;
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/products/custom`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: customTitle,
        price: customPrice,
        commission: customCommission,
        thumbnailUrl: customThumb,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.product;
  }

  async function gerarVideo() {
    setError("");
    let produto = selected;

    if (mode === "custom") {
      try {
        produto = await criarProdutoCustom();
        if (!produto) { setError("Preencha título e preço."); return; }
      } catch (e: any) {
        setError(e.message); return;
      }
    }

    if (!produto) { setError("Selecione um produto."); return; }

    const token = localStorage.getItem("token");
    setStep("gerando");

    try {
      const res = await fetch(`${API}/videos/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ productId: produto.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoId(data.videoId);

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

  const produtoAtivo = mode === "catalogo" ? selected : mode === "link" ? urlProduct : (customTitle && customPrice ? { title: customTitle, price: customPrice } : null);

  // ── TELA GERANDO ──
  if (step === "gerando") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-purple-900 flex items-center justify-center mx-auto mb-6">
          <Loader size={40} className="text-purple-400 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Gerando seu vídeo...</h2>
        <p className="text-gray-400 mb-6">A IA está criando o roteiro, narração e vídeo. Aguarde ~60 segundos.</p>
        <div className="space-y-3 text-left bg-gray-900 rounded-2xl p-6">
          {["Gerando roteiro viral com IA", "Criando narração em português", "Buscando imagens do produto", "Montando vídeo cinematic"].map((s, i) => (
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

  // ── TELA PRONTO ──
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

  // ── TELA PRINCIPAL ──
  const filtrados = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pb-40">
      {/* Header */}
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

      {/* Abas de modo */}
      <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-xl border border-gray-800">
        {([
          { key: "catalogo", label: "Catálogo", icon: Search },
          { key: "link", label: "Colar Link ML", icon: Link2 },
          { key: "custom", label: "Produto próprio", icon: ImagePlus },
        ] as { key: Mode; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setSelected(null); setUrlProduct(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === key
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── MODO: CATÁLOGO ── */}
      {mode === "catalogo" && (
        <>
          <div className="relative mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="input pl-11 pr-11"
              placeholder="Buscar qualquer produto (Air Fryer, Nike, iPhone...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {searching && <Loader size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />}
          </div>
          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <Loader size={32} className="text-purple-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtrados.slice(0, 12).map((p: any) => (
                <button
                  key={p.id || p.mlId}
                  onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
                    selected?.id === p.id
                      ? "border-purple-500 bg-purple-900/20"
                      : "border-gray-800 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <img
                    src={p.thumbnail || "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=400&h=400&fit=crop"}
                    alt={p.title}
                    className="w-full h-40 object-contain bg-gray-800 rounded-xl mb-3"
                    onError={e => { (e.target as HTMLImageElement).src = "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=400&h=400&fit=crop"; }}
                  />
                  <p className="text-sm font-medium line-clamp-2 mb-2">{p.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold text-sm">R$ {Number(p.price).toFixed(2)}</span>
                    <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-1 rounded-full">{p.commission}% comissão</span>
                  </div>
                  {p.trending && <span className="text-xs bg-pink-900 text-pink-400 px-2 py-1 rounded-full mt-2 inline-block">🔥 Em alta</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODO: LINK ML ── */}
      {mode === "link" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-gray-300 font-medium mb-1">Cole o link do produto</p>
            <p className="text-gray-500 text-sm mb-4">Funciona com qualquer site — Mercado Livre, Shopee, Amazon, Shein, Magalu, AliExpress e outros.</p>
            <div className="flex gap-3">
              <input
                className="input flex-1"
                placeholder="https://www.amazon.com.br/produto ou shopee.com.br/..."
                value={mlUrl}
                onChange={e => setMlUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && buscarPorLink()}
              />
              <button
                onClick={buscarPorLink}
                disabled={loadingUrl || !mlUrl.trim()}
                className="btn-primary px-5 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {loadingUrl ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
                Buscar
              </button>
            </div>
            {urlError && <p className="text-red-400 text-sm mt-3">{urlError}</p>}
          </div>

          {urlProduct && (
            <div className="bg-gray-900 border-2 border-purple-500 rounded-2xl p-5 flex gap-4 items-start">
              <img
                src={urlProduct.thumbnail || "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=200&h=200&fit=crop"}
                alt={urlProduct.title}
                className="w-28 h-28 object-contain bg-gray-800 rounded-xl shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?w=200&h=200&fit=crop"; }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm line-clamp-3">{urlProduct.title}</p>
                  <Check size={20} className="text-purple-400 shrink-0 mt-0.5" />
                </div>
                <p className="text-green-400 font-bold mt-2">R$ {Number(urlProduct.price).toFixed(2)}</p>
                <p className="text-yellow-400 text-xs mt-1">{urlProduct.commission}% comissão</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODO: PRODUTO PRÓPRIO ── */}
      {mode === "custom" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
          <p className="text-gray-300 font-medium">Informe os dados do produto</p>

          {/* Upload foto */}
          <div>
            <p className="text-sm text-gray-400 mb-2">Foto do produto</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {customThumbPreview ? (
              <div className="relative w-40 h-40">
                <img src={customThumbPreview} alt="preview" className="w-40 h-40 object-contain bg-gray-800 rounded-xl" />
                <button
                  onClick={() => { setCustomThumbPreview(""); setCustomThumb(""); }}
                  className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-40 h-40 border-2 border-dashed border-gray-700 hover:border-purple-500 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-purple-400 transition-colors"
              >
                <ImagePlus size={28} />
                <span className="text-xs text-center px-2">Clique para adicionar foto do produto</span>
              </button>
            )}
          </div>

          {/* Nome */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nome do produto *</label>
            <input
              className="input"
              placeholder="Ex: Tênis Nike Air Max 270"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
            />
          </div>

          {/* Preço e comissão */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Preço (R$) *</label>
              <input
                className="input"
                type="number"
                placeholder="199.90"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Comissão (%)</label>
              <input
                className="input"
                type="number"
                placeholder="8"
                value={customCommission}
                onChange={e => setCustomCommission(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── BOTÃO GERAR FIXO NO RODAPÉ ── */}
      {produtoAtivo && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50">
          <div className="max-w-4xl mx-auto bg-gray-900 border border-purple-500 rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-purple-900/30">
            <div className="min-w-0 mr-4">
              <p className="font-medium text-sm line-clamp-1">{produtoAtivo.title}</p>
              {produtoAtivo.price && (
                <p className="text-green-400 text-sm">R$ {Number(produtoAtivo.price).toFixed(2)}</p>
              )}
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
