"use client";
import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { Eye, MousePointer, DollarSign, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function MetricCard({ icon: Icon, label, value, color, change }: any) {
  const positive = change >= 0;
  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 card-glow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
          <Icon size={22} className={color.replace("bg-", "text-")} />
        </div>
        {change !== undefined && (
          <span className={`text-sm font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
            {positive ? "+" : ""}{change}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [chart, setChart] = useState<any[]>([]);
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(30);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/analytics/dashboard`, { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/chart`, { headers: h }).then(r => r.json()),
    ]).then(([d, c]) => {
      setDash(d);
      setChart(c.chart || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sliced = period === 7 ? chart.slice(-7) : chart;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const totais = dash?.totais || {};
  const semana = dash?.semana || {};

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold gradient-text">Analytics</h1>
          <p className="text-gray-400 mt-1">Desempenho dos seus vídeos</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Eye}          label="Total de views"    value={(totais.views || 0).toLocaleString()}      color="bg-blue-500"   change={12} />
        <MetricCard icon={MousePointer} label="Cliques totais"    value={(totais.clicks || 0).toLocaleString()}     color="bg-pink-500"   change={dash?.ctr?.replace("%","")} />
        <MetricCard icon={DollarSign}   label="Receita (R$)"      value={(totais.receita || 0).toFixed(2)}          color="bg-green-500"  change={8} />
        <MetricCard icon={TrendingUp}   label="CTR médio"         value={dash?.ctr || "0%"}                         color="bg-purple-500" />
      </div>

      {/* Esta semana vs mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold mb-4 text-gray-300">Esta semana</h3>
          <div className="space-y-3">
            {[
              { label: "Views", value: (semana.views || 0).toLocaleString(), color: "bg-blue-500" },
              { label: "Cliques", value: (semana.clicks || 0).toLocaleString(), color: "bg-pink-500" },
              { label: "Conversões", value: (semana.conversions || 0).toLocaleString(), color: "bg-green-500" },
              { label: "Receita", value: `R$ ${(semana.revenue || 0).toFixed(2)}`, color: "bg-purple-500" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-400">{item.label}</span>
                </div>
                <span className="font-semibold text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold mb-4 text-gray-300">Distribuição de plataformas</h3>
          <div className="space-y-3">
            {[
              { name: "TikTok",  pct: 58, color: "bg-pink-500" },
              { name: "YouTube", pct: 28, color: "bg-red-500" },
              { name: "Kwai",    pct: 14, color: "bg-yellow-500" },
            ].map(p => (
              <div key={p.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{p.name}</span>
                  <span className="font-medium">{p.pct}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full">
                  <div className={`h-2 rounded-full ${p.color}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Evolução</h2>
          <div className="flex gap-2">
            {([7, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${period === d ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={sliced}>
            <defs>
              <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF0050" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF0050" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 11 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12 }} />
            <Area type="monotone" dataKey="views"  stroke="#7C3AED" fill="url(#gViews)"  name="Views"   strokeWidth={2} />
            <Area type="monotone" dataKey="clicks" stroke="#FF0050" fill="url(#gClicks)" name="Cliques" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
