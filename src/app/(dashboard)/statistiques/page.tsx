"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Printer, Wallet, ShoppingBag, TrendingUp,
  BarChart3, CreditCard, Tag, Calendar, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCachedSettings } from "@/lib/settings-cache";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#f97316", "#06b6d4"];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptee",
  PREPARING: "En cuisine",
  READY: "Prete",
  PICKED_UP: "Recuperee",
  DELIVERING: "En livraison",
  DELIVERED: "Livree",
  CANCELLED: "Annulee",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500",
  ACCEPTED: "bg-orange-500",
  PREPARING: "bg-orange-400",
  READY: "bg-cyan-500",
  PICKED_UP: "bg-indigo-500",
  DELIVERING: "bg-purple-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

type Period = "today" | "week" | "month" | "year" | "custom";

export default function StatistiquesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [restaurantName, setRestaurantName] = useState("Restaurant");

  useEffect(() => {
    getCachedSettings().then((s) => {
      if (s?.restaurantName) setRestaurantName(s.restaurantName);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/stats/detailed";
      if (period === "custom" && customFrom && customTo) {
        url += `?from=${customFrom}&to=${customTo}`;
      } else {
        url += `?period=${period}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {}
    setLoading(false);
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (period !== "custom" || (customFrom && customTo)) {
      fetchData();
    }
  }, [fetchData]);

  function handlePrint() {
    window.print();
  }

  const periodLabel = period === "today" ? "Aujourd'hui"
    : period === "week" ? "Cette semaine"
    : period === "month" ? "Ce mois"
    : period === "year" ? "Cette annee"
    : customFrom && customTo ? `Du ${customFrom} au ${customTo}` : "";

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  }

  const s = data?.summary || {};
  const pieData = data?.paymentBreakdown ? [
    { name: "Especes", value: data.paymentBreakdown.cash?.revenue || 0, count: data.paymentBreakdown.cash?.count || 0 },
    { name: "En ligne", value: data.paymentBreakdown.online?.revenue || 0, count: data.paymentBreakdown.online?.count || 0 },
  ] : [];
  const pieTotal = pieData.reduce((a: number, b: any) => a + b.value, 0);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="no-print">
        <PageHeader title="Statistiques" subtitle="Comptabilite et performances">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimer
          </button>
        </PageHeader>
      </div>

      {/* Print header */}
      <div className="print-only hidden">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold">{restaurantName}</h1>
          <h2 className="text-lg mt-1">Rapport Statistiques & Comptabilite</h2>
          <p className="text-sm mt-2">Periode : {periodLabel}</p>
          <p className="text-xs text-gray-500 mt-1">Genere le {new Date().toLocaleDateString("fr-FR")} a {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="no-print flex flex-wrap gap-2">
        {([
          { key: "today", label: "Aujourd'hui" },
          { key: "week", label: "Semaine" },
          { key: "month", label: "Mois" },
          { key: "year", label: "Annee" },
          { key: "custom", label: "Personnalise" },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setPeriod(f.key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              period === f.key
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            )}
          >
            {f.key === "custom" && <Calendar className="w-3.5 h-3.5 inline mr-1.5" />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Custom dates */}
      {period === "custom" && (
        <div className="no-print flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Du</label>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Au</label>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500" />
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-orange-500 animate-spin" /></div>
      )}

      {data && !loading && (
        <>
          {/* Cartes resume */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10"><Wallet className="w-5 h-5 text-green-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Revenu total</p>
                  <p className="text-lg font-bold text-white">{s.totalRevenue?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10"><ShoppingBag className="w-5 h-5 text-orange-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Commandes</p>
                  <p className="text-lg font-bold text-white">{s.totalOrders}</p>
                  <p className="text-[10px] text-gray-600">{s.deliveredOrders} livrees / {s.cancelledOrders} annulees</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10"><TrendingUp className="w-5 h-5 text-purple-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Panier moyen</p>
                  <p className="text-lg font-bold text-white">{s.averageOrderValue?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10"><Tag className="w-5 h-5 text-red-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Reductions</p>
                  <p className="text-lg font-bold text-white">-{s.discounts?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10"><BarChart3 className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Revenu net</p>
                  <p className="text-lg font-bold text-green-400">{s.netRevenue?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-yellow-500/10"><CreditCard className="w-5 h-5 text-yellow-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Especes / En ligne</p>
                  <p className="text-sm font-bold text-white">{data.paymentBreakdown?.cash?.count || 0} / {data.paymentBreakdown?.online?.count || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique barres */}
          {data.dailyData?.length > 0 && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-400" /> Recettes par jour
                </h3>
                <div className="h-64 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                        tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "12px", fontSize: "12px" }}
                        labelStyle={{ color: "#9ca3af" }}
                        formatter={(value) => [`${Number(value || 0).toLocaleString()} FCFA`, "Recette"]}
                      />
                      <Bar dataKey="revenue" fill="#ea580c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pie chart paiement + Top produits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie */}
            {pieTotal > 0 && (
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-white mb-4">Repartition paiement</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80} paddingAngle={4}>
                          {pieData.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "12px", fontSize: "12px" }}
                          formatter={(value) => [`${Number(value || 0).toLocaleString()} FCFA`]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-2">
                    {pieData.map((d: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-xs text-gray-400">{d.name} ({d.count})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top produits */}
            {data.topProducts?.length > 0 && (
              <Card>
                <CardContent>
                  <h3 className="text-sm font-semibold text-white mb-4">Top 10 produits</h3>
                  <div className="space-y-2">
                    {data.topProducts.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-800/50 last:border-0">
                        <span className="w-6 h-6 rounded-full bg-orange-600/20 text-orange-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm text-white truncate">{p.name}</span>
                        <span className="text-xs text-gray-500 shrink-0">{p.quantity} vendus</span>
                        <span className="text-sm font-semibold text-orange-400 shrink-0">{p.revenue.toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Repartition par statut */}
          {data.ordersByStatus && Object.keys(data.ordersByStatus).length > 0 && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-white mb-4">Repartition par statut</h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.ordersByStatus).map(([status, count]: [string, any]) => (
                    <div key={status} className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-xl">
                      <div className={cn("w-2.5 h-2.5 rounded-full", STATUS_COLORS[status] || "bg-gray-500")} />
                      <span className="text-xs text-gray-400">{STATUS_LABELS[status] || status}</span>
                      <span className="text-sm font-bold text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tableau comptable detaille */}
          {data.dailyData?.length > 0 && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-white mb-4">Detail comptable</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">Date</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">Commandes</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">Livrees</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">Annulees</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">Recette</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyData.map((day: any) => (
                        <tr key={day.date} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                          <td className="py-2 px-2 text-gray-300">{day.label}</td>
                          <td className="py-2 px-2 text-right text-gray-400">{day.orders}</td>
                          <td className="py-2 px-2 text-right text-green-400">{day.delivered}</td>
                          <td className="py-2 px-2 text-right text-red-400">{day.cancelled}</td>
                          <td className="py-2 px-2 text-right font-semibold text-white">{day.revenue.toLocaleString()} F</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-700">
                        <td className="py-2 px-2 font-bold text-white">Total</td>
                        <td className="py-2 px-2 text-right font-bold text-white">{data.dailyData.reduce((a: number, d: any) => a + d.orders, 0)}</td>
                        <td className="py-2 px-2 text-right font-bold text-green-400">{data.dailyData.reduce((a: number, d: any) => a + d.delivered, 0)}</td>
                        <td className="py-2 px-2 text-right font-bold text-red-400">{data.dailyData.reduce((a: number, d: any) => a + d.cancelled, 0)}</td>
                        <td className="py-2 px-2 text-right font-bold text-orange-400">{data.dailyData.reduce((a: number, d: any) => a + d.revenue, 0).toLocaleString()} F</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
