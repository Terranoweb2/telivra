"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ChefHat, ArrowLeft, CheckCircle, TrendingUp,
  Flame, ShoppingBag, XCircle, Timer, BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

export default function CookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cooks/${id}`).then((r) => {
      if (!r.ok) { router.push("/cooks"); return; }
      return r.json();
    }).then((d) => {
      if (d) setData(d);
      setLoading(false);
    });
  }, [id, router]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!data) return null;

  const { cook, summary: s, dailyData, topProducts } = data;

  const stats = [
    { icon: Flame, value: s.inKitchen, label: "En cuisine", color: "text-orange-400" },
    { icon: CheckCircle, value: s.delivered, label: "Livrées", color: "text-green-400" },
    { icon: XCircle, value: s.cancelled, label: "Annulées", color: "text-red-400" },
    { icon: Timer, value: `${s.avgPrepTimeMin} min`, label: "Temps moy.", color: "text-cyan-400" },
    { icon: TrendingUp, value: s.totalRevenue.toLocaleString() + " F", label: "Recette", color: "text-purple-400" },
    { icon: ShoppingBag, value: s.avgOrderValue.toLocaleString() + " F", label: "Panier moy.", color: "text-yellow-400" },
  ];

  return (
    <div className="space-y-4 pb-10">
      <PageHeader title={cook.name} subtitle="Statistiques du cuisinier">
        <Link href="/cooks" className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
      </PageHeader>

      {/* Stat cards â 2 rangées de 3 */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((st, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl px-2 py-2.5 text-center">
            <st.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${st.color}`} />
            <p className="text-sm font-bold text-white leading-tight">{st.value}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{st.label}</p>
          </div>
        ))}
      </div>

      {/* Graphique barres â 30 derniers jours */}
      {dailyData?.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-400" /> Recettes (30 derniers jours)
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "12px", fontSize: "12px" }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(value: any) => [`${Number(value || 0).toLocaleString()} FCFA`, "Recette"]}
                  />
                  <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top produits */}
      {topProducts?.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-white mb-3">Top produits</h3>
            <div className="space-y-1.5">
              {topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-800/50 last:border-0">
                  <span className="w-5 h-5 rounded-full bg-orange-600/20 text-orange-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-xs text-white truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-500 shrink-0">{p.quantity} vendus</span>
                  <span className="text-xs font-semibold text-orange-400 shrink-0">{p.revenue.toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
