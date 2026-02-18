"use client";


import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2, Printer, Wallet, ShoppingBag, TrendingUp,
  BarChart3, CreditCard, Tag, Calendar, ArrowRight, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getCachedSettings } from "@/lib/settings-cache";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";


const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  PREPARING: "En cuisine",
  READY: "Prete",
  PICKED_UP: "Récupérée",
  DELIVERING: "En livraison",
  DELIVERED: "Livree",
  CANCELLED: "Annulée",
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
  const [period, setPeriodState] = useState(() => { if (typeof window !== "undefined") { const p = new URLSearchParams(window.location.search); return (p.get("tab")) || "month"; } return "month"; });
  const setPeriod = (v: string) => {
    setPeriodState(v);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", v);
    window.history.replaceState({}, "", url.toString());
  };
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { data: session } = useSession();
  const managerName = (session?.user as any)?.name || "Gerant";
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

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSections, setPrintSections] = useState({
    summary: true,
    chart: true,
    topProducts: true,
    statusBreakdown: true,
    deliveryMode: true,
    accounting: true,
  });

  function handlePrint() {
    setShowPrintModal(true);
  }

  function executePrint() {
    setShowPrintModal(false);
    setTimeout(() => window.print(), 200);
  }

  function togglePrintSection(key: string) {
    setPrintSections((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
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
          <p className="text-sm mt-1">Gerant : {managerName}</p>
          <h2 className="text-base font-semibold mt-2">Rapport Statistiques & Comptabilite</h2>
          <p className="text-sm mt-1">Periode : {periodLabel}</p>
          <p className="text-xs text-gray-500 mt-1">Genere le {new Date().toLocaleDateString("fr-FR")} a {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="no-print sticky top-14 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 bg-gray-900/95 backdrop-blur-sm">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
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
              "px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0",
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
          <div data-print-section="summary" className={cn(!printSections.summary && "print-hide", "flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0")}>
            <Card className="min-w-[11rem] shrink-0 lg:min-w-0">
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10"><Wallet className="w-5 h-5 text-green-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Revenu total</p>
                  <p className="text-lg font-bold text-white">{s.totalRevenue?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[11rem] shrink-0 lg:min-w-0">
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10"><ShoppingBag className="w-5 h-5 text-orange-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Commandes</p>
                  <p className="text-lg font-bold text-white">{s.totalOrders}</p>
                  <p className="text-[10px] text-gray-600">{s.deliveredOrders} livrées / {s.cancelledOrders} annulées{s.pickupOrders > 0 && ` / ${s.pickupOrders} a emporter`}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[11rem] shrink-0 lg:min-w-0">
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10"><TrendingUp className="w-5 h-5 text-purple-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Panier moyen</p>
                  <p className="text-lg font-bold text-white">{s.averageOrderValue?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[11rem] shrink-0 lg:min-w-0">
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10"><Tag className="w-5 h-5 text-red-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Reductions</p>
                  <p className="text-lg font-bold text-white">-{s.discounts?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[11rem] shrink-0 lg:min-w-0">
              <CardContent className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10"><BarChart3 className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <p className="text-xs text-gray-500">Revenu net</p>
                  <p className="text-lg font-bold text-green-400">{s.netRevenue?.toLocaleString()} <span className="text-xs font-normal text-gray-500">FCFA</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[11rem] shrink-0 lg:min-w-0">
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
          <div className={cn(!printSections.chart && "print-hide")}>
          {data.dailyData?.length > 0 && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-400" /> Recettes par jour
                </h3>
                <div className="h-56">
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
          </div>

          {/* Top produits */}
          <div className={cn(!printSections.topProducts && "print-hide")}>
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
          <div className={cn(!printSections.statusBreakdown && "print-hide")}>
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
          </div>

          {/* Repartition par mode de livraison */}
          <div className={cn(!printSections.deliveryMode && "print-hide")}>
          {data.deliveryModeBreakdown && (data.deliveryModeBreakdown.pickup > 0 || data.deliveryModeBreakdown.delivery > 0) && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-white mb-4">Repartition par mode</h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-xl">
                    <Truck className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Livraison</span>
                    <span className="text-sm font-bold text-white">{data.deliveryModeBreakdown.delivery}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-xl">
                    <ShoppingBag className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-400">À emporter</span>
                    <span className="text-sm font-bold text-white">{data.deliveryModeBreakdown.pickup}</span>
                  </div>
                  {s.pickupDelivered > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-xl">
                      <ShoppingBag className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-gray-400">Remis au client</span>
                      <span className="text-sm font-bold text-white">{s.pickupDelivered}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          </div>

          {/* Tableau comptable detaille */}
          <div className={cn(!printSections.accounting && "print-hide")}>
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
                        <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">Annulées</th>
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
          </div>

          {/* Modal impression */}
          {showPrintModal && (
            <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPrintModal(false)}>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-1">Imprimer le rapport</h3>
                <p className="text-xs text-gray-500 mb-4">Choisissez les sections a inclure</p>
                <div className="space-y-2 mb-5">
                  {[
                    { key: "summary", label: "Resume (cartes)" },
                    { key: "chart", label: "Graphique recettes" },
                    { key: "topProducts", label: "Top 10 produits" },
                    { key: "statusBreakdown", label: "Repartition par statut" },
                    { key: "deliveryMode", label: "Mode de livraison" },
                    { key: "accounting", label: "Tableau comptable" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={printSections[item.key as keyof typeof printSections]}
                        onChange={() => togglePrintSection(item.key)}
                        className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-800"
                      />
                      <span className="text-sm text-gray-300">{item.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowPrintModal(false)}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors">
                    Annuler
                  </button>
                  <button onClick={executePrint}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    <Printer className="w-4 h-4" /> Imprimer
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
