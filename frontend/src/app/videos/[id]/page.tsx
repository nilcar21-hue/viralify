"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Share2, Youtube, CheckCircle, Loader, XCircle } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

export default function VideoDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/videos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setVideo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function publish(platform: string) {
    setPublishing(true);
    const token = localStorage.getItem("token");
    await fetch(`${API}/videos/${id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ platforms: [platform] }),
    });
    setPublished(true);
    setPublishing(false);
  }

  function download() {
    if (!video?.videoUrl) return;
    const url = video.videoUrl.startsWith("http") ? video.videoUrl : `${API}${video.videoUrl}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `viralify-${id}.mp4`;
    a.click();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!video || video.error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <XCircle size={48} className="text-red-400" />
      <p className="text-gray-400">Vídeo não encontrado.</p>
      <Link href="/videos" className="btn-primary">Voltar</Link>
    </div>
  );

  const videoUrl = video.videoUrl
    ? (video.videoUrl.startsWith("http") ? video.videoUrl : `${API}${video.videoUrl}`)
    : null;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <Link href="/videos" className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={18} /> Voltar para Meus Vídeos
      </Link>

      <h1 className="text-2xl font-bold mb-2 gradient-text">{video.title || "Vídeo gerado"}</h1>
      <p className="text-gray-500 text-sm mb-8">
        {new Date(video.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
      </p>

      {/* Player */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full aspect-video" />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center bg-gray-900">
            {video.status === "GENERATING" ? (
              <div className="text-center">
                <Loader size={40} className="text-purple-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Gerando vídeo... aguarde</p>
              </div>
            ) : (
              <p className="text-gray-500">Vídeo não disponível</p>
            )}
          </div>
        )}
      </div>

      {/* Roteiro */}
      {video.script && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="font-bold mb-3 text-gray-300">Roteiro</h2>
          <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{video.script}</p>
        </div>
      )}

      {/* Ações */}
      {video.status === "READY" && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-300 mb-4">Publicar ou Baixar</h2>

          {published ? (
            <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 text-green-400 p-4 rounded-xl">
              <CheckCircle size={20} />
              <span>Publicação iniciada com sucesso!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => publish("youtube")}
                disabled={publishing}
                className="flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
              >
                {publishing ? <Loader size={18} className="animate-spin" /> : <Youtube size={18} />}
                Publicar no YouTube
              </button>

              <button
                onClick={download}
                className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                <Download size={18} />
                Baixar MP4
              </button>
            </div>
          )}
        </div>
      )}

      {video.status === "PUBLISHED" && (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 text-green-400 p-4 rounded-xl">
          <CheckCircle size={20} />
          <span>Vídeo publicado em {video.platforms?.join(", ") || "plataformas"}</span>
        </div>
      )}
    </div>
  );
}
