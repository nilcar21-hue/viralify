"use client";
import { useEffect, useState } from "react";
import { Search, Bookmark, BookmarkCheck, TrendingUp, ArrowLeft, Filter } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const CATEGORIES = ["Todos", "Eletrônicos", "Moda", "Casa", "Esportes", "Beleza", "Livros", "Games", "Alimentos"];

export default function Produtos() {
  const [products, setProducts] = useState<any[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/products/trending`, { headers: h }).then(r => r.json()),
      fetch(`${API}/products/saved`, { headers: h }).then(r => r.json()),
    ]).then(([trending, savedRes]) => {
      setProducts(trending.products || []);
      const savedIds = new Set<string>((savedRes.products || []).map((p: any) => p.mlId));
      setSaved(savedIds);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggleSave(p: any) {
    setSavingId(p.mlId);
    const token = localStorage.getItem("token");
    await fetch(`${API}/products/${p.mlId}/save`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(p.mlId)) next.delete(p.mlId); else next.add(p.mlId);
      return next;
    });
    setSavingId(null);
  }

  const filtered = products.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || p.category === category;
    return matchSearch && matchCat;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold gradient-text">Produtos em Alta</h1>
          <p className="text-gray-400 mt-1">Mercado Livre — atualizado ao vivo</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input pl-11"
          placeholder="Buscar produto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`whitespace-nowrap text-sm px-4 py-2 rounded-full transition-colors ${
              category === cat
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-gray-500 text-sm mb-4">{filtered.length} produto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p: any) => {
          const isSaved = saved.has(p.mlId);
          return (
            <div key={p.mlId} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-colors group">
              {/* Image */}
              <div className="relative h-44 bg-gray-800 flex items-center justify-center">
                <img
                  src={p.thumbnail}
                  alt={p.title}
                  className="w-full h-full object-contain p-2"
                />
                {p.trending && (
                  <span className="absolute top-2 left-2 text-xs bg-pink-900/80 text-pink-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingUp size={10} /> Em alta
                  </span>
                )}
                <button
                  onClick={() => toggleSave(p)}
                  disabled={savingId === p.mlId}
                  className="absolute top-2 right-2 p-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 transition-colors"
                >
                  {isSaved
                    ? <BookmarkCheck size={16} className="text-purple-400" />
                    : <Bookmark size={16} className="text-gray-400" />
                  }
                </button>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-medium line-clamp-2 mb-3 group-hover:text-purple-300 transition-colors">{p.title}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-green-400 font-bold text-lg">R$ {p.price?.toFixed(2)}</span>
                  <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-1 rounded-full font-medium">
                    {p.commission}% comissão
                  </span>
                </div>
                {p.sold && (
                  <p className="text-gray-600 text-xs mb-3">{p.sold.toLocaleString()} vendidos</p>
                )}
                <Link
                  href={`/videos/novo?product=${p.mlId}`}
                  className="btn-primary w-full text-center text-sm py-2 block"
                >
                  Gerar vídeo
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Filter size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum produto encontrado para "{search}"</p>
        </div>
      )}
    </div>
  );
}
