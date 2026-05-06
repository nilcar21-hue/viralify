"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, CheckCircle, Loader, XCircle, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

const PLATFORMS = [
  {
    id: "youtube",
    label: "YouTube",
    sublabel: "Shorts",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    color: "bg-red-600 hover:bg-red-500",
    uploadUrl: "https://studio.youtube.com/channel/upload",
  },
  {
    id: "instagram",
    label: "Instagram",
    sublabel: "Reels",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    color: "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400",
    uploadUrl: "https://www.instagram.com/reels/upload",
  },
  {
    id: "tiktok",
    label: "TikTok",
    sublabel: "Vídeo",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    color: "bg-black hover:bg-gray-900 border border-gray-600",
    uploadUrl: "https://www.tiktok.com/upload",
  },
  {
    id: "kwai",
    label: "Kwai",
    sublabel: "Upload",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.95 15.536l-3.182-3.182-1.768 1.768-3.182-3.182L12 7.758l4.95 4.95-4.95 4.95v-2.122z"/>
      </svg>
    ),
    color: "bg-orange-500 hover:bg-orange-400",
    uploadUrl: "https://www.kwai.com/share",
  },
];

export default function VideoDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [publishedTo, setPublishedTo] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API}/videos/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setVideo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  function getVideoUrl() {
    if (!video?.videoUrl) return null;
    return video.videoUrl.startsWith("http") ? video.videoUrl : `${API}${video.videoUrl}`;
  }

  async function download() {
    const url = getVideoUrl();
    if (!url) return;
    setDownloading(true);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `viralify-${id}.mp4`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // fallback direto
      const a = document.createElement("a");
      a.href = url;
      a.download = `viralify-${id}.mp4`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  function openPlatform(platform: typeof PLATFORMS[0]) {
    // Marcar como publicado
    setPublishedTo(prev => prev.includes(platform.id) ? prev : [...prev, platform.id]);

    // Primeiro baixa o vídeo se possível
    const url = getVideoUrl();
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `viralify-${platform.id}.mp4`;
      a.click();
    }

    // Abre a plataforma em nova aba após breve delay
    setTimeout(() => {
      window.open(platform.uploadUrl, "_blank", "noopener,noreferrer");
    }, 800);
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

  const videoUrl = getVideoUrl();
  const videoDisponivel = videoUrl && video.videoUrl?.startsWith("http");

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
        {videoDisponivel ? (
          <video src={videoUrl!} controls className="w-full aspect-video" preload="metadata" playsInline />
        ) : (
          <div className="w-full aspect-video flex flex-col items-center justify-center bg-gray-900 gap-3">
            {video.status === "GENERATING" ? (
              <>
                <Loader size={40} className="text-purple-400 animate-spin" />
                <p className="text-gray-400">Gerando vídeo... aguarde ~60s</p>
              </>
            ) : video.status === "READY" ? (
              <>
                <XCircle size={36} className="text-yellow-500" />
                <p className="text-gray-400 text-sm text-center px-4">Vídeo expirou do servidor temporário.<br/>Gere novamente para obter um link permanente.</p>
                <Link href="/videos/novo" className="btn-primary text-sm">Gerar novo vídeo</Link>
              </>
            ) : (
              <>
                <XCircle size={36} className="text-red-500" />
                <p className="text-gray-500">Vídeo não disponível</p>
              </>
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

      {/* Publicar / Baixar */}
      {(video.status === "READY" || video.status === "PUBLISHED") && videoDisponivel && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Share2 size={18} className="text-purple-400" />
            <h2 className="font-bold text-white">Publicar nas redes sociais</h2>
          </div>

          <p className="text-gray-400 text-sm mb-5">
            Clique em uma plataforma — o vídeo será baixado automaticamente e a página de upload abrirá em seguida.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => openPlatform(p)}
                className={`relative flex items-center gap-3 text-white font-bold py-3.5 px-5 rounded-xl transition-all duration-200 ${p.color} ${publishedTo.includes(p.id) ? "ring-2 ring-green-500" : ""}`}
              >
                {p.icon}
                <div className="text-left">
                  <div className="text-sm leading-none">{p.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{p.sublabel}</div>
                </div>
                {publishedTo.includes(p.id) && (
                  <CheckCircle size={14} className="text-green-400 absolute top-2 right-2" />
                )}
                <ExternalLink size={12} className="ml-auto opacity-50" />
              </button>
            ))}
          </div>

          <div className="bg-blue-950 border border-blue-800 rounded-xl p-3 mb-5">
            <p className="text-blue-300 text-xs leading-relaxed">
              💡 <strong>Como publicar:</strong> O vídeo será baixado para seu dispositivo. Após o download, faça o upload na plataforma que abrirá automaticamente.
            </p>
          </div>

          {/* Baixar separado */}
          <button
            onClick={download}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
          >
            {downloading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
            {downloading ? "Baixando..." : "Apenas Baixar MP4"}
          </button>
        </div>
      )}

      {/* Status publicado */}
      {publishedTo.length > 0 && (
        <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 text-green-400 p-4 rounded-xl">
          <CheckCircle size={20} />
          <span>Vídeo enviado para: {publishedTo.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
