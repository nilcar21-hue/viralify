"use client";
import { useEffect, useState } from "react";
import { Video, Plus, Trash2, Share2, Eye, Clock, CheckCircle, XCircle, Loader } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PUBLISHED:  { label: "Publicado",  color: "bg-green-900 text-green-400",    icon: CheckCircle },
  READY:      { label: "Pronto",     color: "bg-blue-900 text-blue-400",      icon: CheckCircle },
  GENERATING: { label: "Gerando...", color: "bg-yellow-900 text-yellow-400",  icon: Loader },
  FAILED:     { label: "Falhou",     color: "bg-red-900 text-red-400",        icon: XCircle },
  PENDING:    { label: "Pendente",   color: "bg-gray-700 text-gray-400",      icon: Clock },
};

export default function Videos() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadVideos() {
    const token = localStorage.getItem("token");
    const r = await fetch(`${API}/videos`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setVideos(d.videos || []);
    setLoading(false);
  }

  useEffect(() => { loadVideos(); }, []);

  async function deleteVideo(id: string) {
    if (!confirm("Excluir este vídeo?")) return;
    setDeleting(id);
    const token = localStorage.getItem("token");
    await fetch(`${API}/videos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setVideos(v => v.filter(x => x.id !== id));
    setDeleting(null);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Meus Vídeos</h1>
          <p className="text-gray-400 mt-1">{videos.length} vídeo{videos.length !== 1 ? "s" : ""} gerado{videos.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/videos/novo" className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Novo Vídeo
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-24">
          <Video size={64} className="text-gray-700 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-gray-300 mb-2">Nenhum vídeo ainda</h2>
          <p className="text-gray-500 mb-8">Gere seu primeiro vídeo viral com IA em segundos.</p>
          <Link href="/videos/novo" className="btn-primary">Criar primeiro vídeo</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((v: any) => {
            const s = STATUS_MAP[v.status] || STATUS_MAP.PENDING;
            const SIcon = s.icon;
            return (
              <div key={v.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4 card-glow">
                {/* Thumbnail / preview */}
                <div className="w-full h-40 bg-gray-800 rounded-xl flex items-center justify-center relative overflow-hidden">
                  {v.videoUrl ? (
                    <video src={v.videoUrl} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Video size={36} className="text-gray-600" />
                  )}
                  <span className={`absolute top-3 right-3 flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${s.color} ${v.status === "GENERATING" ? "animate-pulse" : ""}`}>
                    <SIcon size={12} className={v.status === "GENERATING" ? "animate-spin" : ""} />
                    {s.label}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="font-semibold text-sm line-clamp-2 mb-1">{v.title || "Gerando título..."}</p>
                  <p className="text-gray-500 text-xs">{new Date(v.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>

                {/* Stats */}
                {v.status === "PUBLISHED" && (
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Eye size={12} /> {(v.views || 0).toLocaleString()} views</span>
                    <span className="flex items-center gap-1"><Share2 size={12} /> {v.platforms?.join(", ") || "—"}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {v.status === "READY" && (
                    <Link href={`/videos/${v.id}`} className="btn-primary flex-1 text-center text-sm py-2">
                      Publicar
                    </Link>
                  )}
                  {v.status === "PUBLISHED" && (
                    <Link href={`/videos/${v.id}`} className="btn-secondary flex-1 text-center text-sm py-2">
                      Ver detalhes
                    </Link>
                  )}
                  <button
                    onClick={() => deleteVideo(v.id)}
                    disabled={deleting === v.id}
                    className="p-2 rounded-xl bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    {deleting === v.id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
