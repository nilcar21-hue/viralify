"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Video, ShoppingBag, Eye, DollarSign, TrendingUp, Plus, Zap } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://viralify-production.up.railway.app";

function StatCard({ icon: Icon, label, value, color, sub }: any) {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 card-glow border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-opacity-20 ${color}`}>
          <Icon size={24} className={color.replace("bg-", "text-")} />
        </div>
        {sub && <span className="text-green-400 text-sm font-medium">{sub}</span>}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API}/analytics/dashboard`, { headers }).then(r => r.json()),
      fetch(`${API}/analytics/chart`, { headers }).then(r => r.json()),
      fetch(`${API}/videos?limit=5`, { headers }).then(r => r.json()),
    ]).then(([dash, ch, vids]) => {
      setData(dash);
      setChart(ch.chart || []);
      setVideos(vids.videos || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Carregando dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-gray-400 mt-1">Seu painel de controle Viralify</p>
        </div>
        <Link href="/videos/novo" className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Novo Vídeo
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Video}       label="Vídeos gerados"  value={data?.totais?.videos || 0}                    color="bg-purple-500" />
        <StatCard icon={Eye}         label="Views este mês"  value={(data?.totais?.views || 0).toLocaleString()}  color="bg-blue-500"   sub="+12%" />
        <StatCard icon={TrendingUp}  label="Cliques"         value={(data?.totais?.clicks || 0).toLocaleString()} color="bg-pink-500"   sub={data?.ctr} />
        <StatCard icon={DollarSign}  label="Receita (R$)"    value={(data?.totais?.receita || 0).toFixed(2)}      color="bg-green-500"  sub="+8%" />
      </div>

      {/* Gráfico */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-8 border border-gray-800">
        <h2 className="text-xl font-bold mb-6">Performance — últimos 30 dias</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chart}>
            <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12 }}
              labelStyle={{ color: "#fff" }}
            />
            <Bar dataKey="views"  fill="#7C3AED" radius={[4,4,0,0]} name="Views" />
            <Bar dataKey="clicks" fill="#FF0050" radius={[4,4,0,0]} name="Cliques" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Últimos vídeos */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Últimos vídeos</h2>
          <Link href="/videos" className="text-purple-400 hover:text-purple-300 text-sm">Ver todos →</Link>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <Zap size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Nenhum vídeo gerado ainda</p>
            <Link href="/videos/novo" className="btn-primary">Criar primeiro vídeo</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((v: any) => (
              <div key={v.id} className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl">
                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                  <Video size={20} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{v.title}</p>
                  <p className="text-gray-400 text-xs mt-1">{new Date(v.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  v.status === "PUBLISHED" ? "bg-green-900 text-green-400" :
                  v.status === "READY"     ? "bg-blue-900 text-blue-400" :
                  v.status === "GENERATING"? "bg-yellow-900 text-yellow-400 animate-pulse" :
                  v.status === "FAILED"    ? "bg-red-900 text-red-400" :
                  "bg-gray-700 text-gray-400"
                }`}>
                  {v.status === "PUBLISHED" ? "Publicado" :
                   v.status === "READY"      ? "Pronto" :
                   v.status === "GENERATING" ? "Gerando..." :
                   v.status === "FAILED"     ? "Falhou" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
