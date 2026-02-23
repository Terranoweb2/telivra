"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Banknote, TrendingUp, ShoppingBag, Clock, ChefHat, ArrowLeft,
  Loader2, Calendar, CreditCard, Wallet, Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const periods = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Annee" },
];

const PIE_COLORS = ["#f97316", "#3b82f6"];

function fmt(n: number) {
  return n.toLocaleString("fr-FR");
}

interface CookStat {
  id: string;
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  revenue: number;
  avgPrepTime: number;
  activeOrders: number;
}

export default function EncaissementPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN" || role === "MANAGER";

  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [productPage, setProductPage] = useState(0);
  const PRODUCTS_PER_PAGE = 10;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCookId, setSelectedCookId] = useState<string | null>(null);
  const [selectedCookName, setSelectedCookName] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/stats/encaissement?period=${period}`;
      if (period === "custom" && customFrom && customTo) {
        url = `/api/stats/encaissement?from=${customFrom}&to=${customTo}`;
      }
      if (selectedCookId) {
        url += `&cookId=${selectedCookId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setData(d); setProductPage(0);
      }
    } catch {}
    setLoading(false);
  }, [period, customFrom, customTo, selectedCookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function selectCook(cook: CookStat) {
    setSelectedCookId(cook.id);
    setSelectedCookName(cook.name);
  }

  function clearCookFilter() {
    setSelectedCookId(null);
    setSelectedCookName("");
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const s = data?.summary || {};
  const paymentData = [
    { name: "Especes", value: s.cashRevenue || 0, count: s.cashCount || 0 },
    { name: "En ligne", value: s.onlineRevenue || 0, count: s.onlineCount || 0 },
  ];
  const totalPayment = paymentData.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isAdmin && selectedCookId && (
            <button onClick={clearCookFilter} className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Banknote className="w-6 h-6 text-orange-500" />
              {isAdmin ? (selectedCookId ? selectedCookName : "Encaissement Global") : "Mon Encaissement"}
            </h1>
            {data?.period && (
              <p className="text-xs text-gray-500 mt-0.5">
                {data.period.from} — {data.period.to}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Period filters */}
      <div className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); setCustomFrom(""); setCustomTo(""); }}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              period === p.key
                ? "bg-orange-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setPeriod("custom")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5",
            period === "custom"
              ? "bg-orange-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          )}
        >
          <Calendar className="w-3.5 h-3.5" /> Personnalise
        </button>
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white" />
            <span className="text-gray-500">—</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white" />
          </div>
        )}
      </div>

      {/* Summary cards — scroll horizontal sur mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
        <div className="snap-start shrink-0 w-[140px] lg:w-auto"><StatCard icon={TrendingUp} label="Revenu total" value={`${fmt(s.totalRevenue || 0)} F`} color="orange" /></div>
        <div className="snap-start shrink-0 w-[140px] lg:w-auto"><StatCard icon={ShoppingBag} label="Commandes" value={s.deliveredOrders || 0} sub={`/ ${s.totalOrders || 0} total`} color="blue" /></div>
        <div className="snap-start shrink-0 w-[140px] lg:w-auto"><StatCard icon={Wallet} label="Especes" value={`${fmt(s.cashRevenue || 0)} F`} color="green" /></div>
        <div className="snap-start shrink-0 w-[140px] lg:w-auto"><StatCard icon={CreditCard} label="En ligne" value={`${fmt(s.onlineRevenue || 0)} F`} color="purple" /></div>
        <div className="snap-start shrink-0 w-[140px] lg:w-auto"><StatCard icon={Percent} label="Reductions" value={`${fmt(s.discounts || 0)} F`} color="red" /></div>
        <div className="snap-start shrink-0 w-[140px] lg:w-auto"><StatCard icon={Clock} label="Temps moyen" value={`${s.averagePrepTime || 0} min`} color="cyan" /></div>
      </div>

      {/* ADMIN: Cooks table (global view) */}
      {isAdmin && !selectedCookId && data?.cooks && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-500" /> Cuisiniers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-800">
                  <th className="pb-3 font-medium">Cuisinier</th>
                  <th className="pb-3 font-medium text-center">Commandes</th>
                  <th className="pb-3 font-medium text-right">Revenu</th>
                  <th className="pb-3 font-medium text-center">Temps moy.</th>
                  <th className="pb-3 font-medium text-center">En cours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {data.cooks.map((cook: CookStat) => (
                  <tr
                    key={cook.id}
                    onClick={() => selectCook(cook)}
                    className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-orange-400">{cook.name[0]}</span>
                        </div>
                        <span className="font-medium text-white">{cook.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-gray-300">
                      {cook.deliveredOrders}<span className="text-gray-600">/{cook.totalOrders}</span>
                    </td>
                    <td className="py-3 text-right font-medium text-green-400">{fmt(cook.revenue)} F</td>
                    <td className="py-3 text-center text-gray-400">{cook.avgPrepTime} min</td>
                    <td className="py-3 text-center">
                      {cook.activeOrders > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                          {cook.activeOrders}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {data.cooks.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-500">Aucun cuisinier actif</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts — scroll horizontal sur mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
        {/* Revenue chart */}
        {data?.dailyData && data.dailyData.length > 0 && (
          <div className="snap-start shrink-0 w-[85vw] lg:w-auto lg:col-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h2 className="text-base font-semibold text-white mb-4">Revenus par jour</h2>
            <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyData}>
                <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(value: any) => [`${fmt(Number(value || 0))} F`, "Recette"]}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </div>
        )}

        {/* Payment breakdown pie chart */}
        <div className="snap-start shrink-0 w-[85vw] lg:w-auto bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <h2 className="text-base font-semibold text-white mb-4">Repartition paiement</h2>
          <div className="flex items-center gap-6">
            <div className="w-[140px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                    dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12 }}
                    formatter={(value: any) => [`${fmt(Number(value || 0))} F`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {paymentData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-sm text-gray-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">{fmt(item.value)} F</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({Math.round((item.value / totalPayment) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hourly distribution */}
        {data?.hourlyDistribution && data.hourlyDistribution.length > 0 && (
          <div className="snap-start shrink-0 w-[85vw] lg:w-auto bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h2 className="text-base font-semibold text-white mb-4">Heures de pointe</h2>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyDistribution}>
                  <XAxis dataKey="hour" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(h) => `${h}h`} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 12 }}
                    labelFormatter={(h) => `${h}h`}
                    formatter={(value: any) => [Number(value || 0), "Commandes"]}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Top products table with pagination */}
      {data?.products && data.products.length > 0 && (() => {
        const allProducts = data.products;
        const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
        const paged = allProducts.slice(productPage * PRODUCTS_PER_PAGE, (productPage + 1) * PRODUCTS_PER_PAGE);
        return (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Plats vendus</h2>
              <span className="text-xs text-gray-500">{allProducts.length} plats</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">Plat</th>
                    <th className="pb-3 font-medium text-center">Commandes</th>
                    <th className="pb-3 font-medium text-right">Revenu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {paged.map((p: any, i: number) => (
                    <tr key={p.name}>
                      <td className="py-2.5 text-gray-600 font-mono text-xs">{productPage * PRODUCTS_PER_PAGE + i + 1}</td>
                      <td className="py-2.5 text-white font-medium">{p.name}</td>
                      <td className="py-2.5 text-center text-gray-300">{p.quantity}</td>
                      <td className="py-2.5 text-right font-medium text-green-400">{fmt(p.revenue)} F</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
                <button
                  onClick={() => setProductPage(Math.max(0, productPage - 1))}
                  disabled={productPage === 0}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Precedent
                </button>
                <span className="text-xs text-gray-500">{productPage + 1} / {totalPages}</span>
                <button
                  onClick={() => setProductPage(Math.min(totalPages - 1, productPage + 1))}
                  disabled={productPage >= totalPages - 1}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string;
  color: "orange" | "blue" | "green" | "purple" | "red" | "cyan";
}) {
  const colors: Record<string, string> = {
    orange: "text-orange-400 bg-orange-600/15",
    blue: "text-blue-400 bg-blue-600/15",
    green: "text-green-400 bg-green-600/15",
    purple: "text-purple-400 bg-purple-600/15",
    red: "text-red-400 bg-red-600/15",
    cyan: "text-cyan-400 bg-cyan-600/15",
  };
  const [iconColor, bgColor] = colors[color].split(" ");

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", bgColor)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <p className="text-lg font-bold text-white leading-tight">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}
