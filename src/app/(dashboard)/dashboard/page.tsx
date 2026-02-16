"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2, ShoppingBag, TrendingUp, Truck, Clock,
  CheckCircle, Package, Users, MapPin, ArrowRight, XCircle, Calendar,
  Wallet, BarChart3, UtensilsCrossed, ChefHat, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatCard, StatCardBadge, StatCardCentered } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" },
  ACCEPTED: { label: "Acceptée", color: "bg-orange-500/20 text-orange-400" },
  PREPARING: { label: "En cuisine", color: "bg-orange-500/20 text-orange-400" },
  READY: { label: "Prêt", color: "bg-cyan-500/20 text-cyan-400" },
  PICKED_UP: { label: "Récupérée", color: "bg-indigo-500/20 text-indigo-400" },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400" },
  DELIVERED: { label: "Livrée", color: "bg-green-500/20 text-green-400" },
  CANCELLED: { label: "Annulée", color: "bg-red-500/20 text-red-400" },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VIEWER";
  const isAdmin = role === "ADMIN";

  const [revenue, setRevenue] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"day" | "week" | "month" | "custom">("day");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const promises: Promise<any>[] = [];

    if (isAdmin) {
      promises.push(
        fetch("/api/stats/revenue").then((r) => r.json()),
        fetch("/api/orders").then((r) => r.json()),
      );
    } else if (role === "DRIVER") {
      promises.push(
        Promise.resolve(null),
        fetch("/api/orders?as=driver").then((r) => r.json()),
      );
    } else {
      promises.push(
        Promise.resolve(null),
        fetch("/api/orders").then((r) => r.json()),
      );
    }

    Promise.all(promises).then(([rev, ord]) => {
      setRevenue(rev);
      setOrders(Array.isArray(ord) ? ord : []);
      setLoading(false);
    });
  }, [isAdmin, role]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const activeOrders = orders.filter((o) => ["PENDING", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "DELIVERING"].includes(o.status));
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");
  const recentOrders = orders.slice(0, 5);

  // Dashboard Admin
  if (isAdmin && revenue) {
    return (
      <div className="space-y-5">
        <PageHeader title="Dashboard" subtitle="Vue d'ensemble de votre activité" />

        {/* Recettes */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          <StatCard
            icon={Wallet}
            value={revenue.today.revenue.toLocaleString()}
            label="Recette du jour"
            sublabel={`${revenue.today.orders} commande${revenue.today.orders > 1 ? "s" : ""}`}
            color="green"
            className="min-w-[10rem] shrink-0 lg:min-w-0"
          />
          <StatCard
            icon={BarChart3}
            value={revenue.week.revenue.toLocaleString()}
            label="Cette semaine"
            sublabel={`${revenue.week.orders} commande${revenue.week.orders > 1 ? "s" : ""}`}
            color="orange"
            className="min-w-[10rem] shrink-0 lg:min-w-0"
          />
          <StatCard
            icon={TrendingUp}
            value={revenue.month.revenue.toLocaleString()}
            label="Ce mois"
            sublabel={`${revenue.month.orders} commande${revenue.month.orders > 1 ? "s" : ""}`}
            color="purple"
            className="min-w-[10rem] shrink-0 lg:min-w-0"
          />
          <StatCard
            icon={ShoppingBag}
            value={revenue.totals.orders}
            label="Total commandes"
            color="orange"
            className="min-w-[10rem] shrink-0 lg:min-w-0"
          />
        </div>

        {/* Stats cuisine */}
        {revenue.cookStats && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ChefHat className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Cuisine</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
              <StatCardCentered value={revenue.cookStats.pendingCook || 0} label="En attente" color="yellow" className="min-w-[6rem] shrink-0 flex-1 lg:min-w-0" />
              <StatCardCentered value={revenue.cookStats.preparing || 0} label="En cuisine" color="orange" className="min-w-[6rem] shrink-0 flex-1 lg:min-w-0" />
              <StatCardCentered value={revenue.cookStats.ready || 0} label="Prêtes" color="cyan" className="min-w-[6rem] shrink-0 flex-1 lg:min-w-0" />
              <StatCardCentered value={revenue.cookStats.prepared || 0} label="Préparées auj." color="green" className="min-w-[6rem] shrink-0 flex-1 lg:min-w-0" />
            </div>
          </div>
        )}

        {/* Stats activité */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          <StatCardBadge
            icon={Clock}
            value={revenue.totals.pending}
            label="En attente"
            color="yellow"
            className="min-w-[10rem] shrink-0 lg:min-w-0"
          />
          <StatCardBadge
            icon={Truck}
            value={revenue.totals.activeDeliveries}
            label="En livraison"
            color="purple"
            className="min-w-[10rem] shrink-0 lg:min-w-0"
          />
          <StatCardBadge
            icon={CheckCircle}
            value={revenue.totals.deliveredToday}
            label="Livrées auj."
            color="green"
            className="min-w-[10rem] shrink-0 lg:min-w-0"
          />
        </div>

        {/* Repartition paiement */}
        {revenue.paymentBreakdown && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
            <StatCardBadge
              icon={Wallet}
              value={(revenue.paymentBreakdown.cash?.revenue || 0).toLocaleString()}
              label={`Espèces (${revenue.paymentBreakdown.cash?.count || 0})`}
              color="yellow"
              className="min-w-[10rem] shrink-0 flex-1 lg:min-w-0"
            />
            <StatCardBadge
              icon={CreditCard}
              value={(revenue.paymentBreakdown.online?.revenue || 0).toLocaleString()}
              label={`En ligne (${revenue.paymentBreakdown.online?.count || 0})`}
              color="cyan"
              className="min-w-[10rem] shrink-0 flex-1 lg:min-w-0"
            />
          </div>
        )}

        {/* Graphique 7 jours */}
        {revenue.dailyRevenue && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Recettes - 7 derniers jours</h3>
                <Link href="/products" className="text-xs text-orange-400 flex items-center gap-1">
                  Voir plus <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-end justify-between gap-2 h-32">
                {revenue.dailyRevenue.map((day: any) => {
                  const maxRevenue = Math.max(...revenue.dailyRevenue.map((d: any) => d.revenue), 1);
                  const height = (day.revenue / maxRevenue) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-[9px] text-gray-500 font-medium">{day.count}</p>
                      <div className="w-full bg-gray-800 rounded-t-lg relative" style={{ height: "100px" }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(height, 3)}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-500">{day.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commandes récentes */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Commandes récentes</h3>
              <Link href="/livraison/order" className="text-xs text-orange-400 flex items-center gap-1">
                Tout voir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order: any) => {
                return (
                  <Card key={order.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {order.client?.name || order.guestName || `#${order.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <StatusBadge status={order.status} type="order" />
                    <p className="text-sm font-bold text-orange-400 shrink-0">{order.totalAmount?.toLocaleString()} F</p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard Client / Driver / Cook
  const isDriverRole = role === "DRIVER";

  const chartData = (() => {
    if (!isDriverRole) return [];
    const now = new Date();
    const bars: { label: string; count: number; revenue: number }[] = [];

    if (chartPeriod === "day") {
      // 7 derniers jours
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayOrders = orders.filter((o: any) => o.status === "DELIVERED" && o.createdAt?.slice(0, 10) === key);
        bars.push({
          label: d.toLocaleDateString("fr-FR", { weekday: "short" }),
          count: dayOrders.length,
          revenue: dayOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
        });
      }
    } else if (chartPeriod === "week") {
      // 4 dernières semaines
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        const startKey = weekStart.toISOString().slice(0, 10);
        const endKey = weekEnd.toISOString().slice(0, 10);
        const weekOrders = orders.filter((o: any) => {
          if (o.status !== "DELIVERED") return false;
          const d = o.createdAt?.slice(0, 10);
          return d >= startKey && d <= endKey;
        });
        bars.push({
          label: `${weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`,
          count: weekOrders.length,
          revenue: weekOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
        });
      }
    } else if (chartPeriod === "month") {
      // 6 derniers mois
      for (let i = 5; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = m.toISOString().slice(0, 7);
        const monthOrders = orders.filter((o: any) => o.status === "DELIVERED" && o.createdAt?.slice(0, 7) === mKey);
        bars.push({
          label: m.toLocaleDateString("fr-FR", { month: "short" }),
          count: monthOrders.length,
          revenue: monthOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
        });
      }
    } else if (chartPeriod === "custom" && customFrom && customTo) {
      // Jours entre les deux dates
      const from = new Date(customFrom);
      const to = new Date(customTo);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const maxBars = 14;
      if (diffDays <= maxBars) {
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(from);
          d.setDate(d.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          const dayOrders = orders.filter((o: any) => o.status === "DELIVERED" && o.createdAt?.slice(0, 10) === key);
          bars.push({
            label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
            count: dayOrders.length,
            revenue: dayOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
          });
        }
      } else {
        // Grouper par semaine
        const weeks = Math.ceil(diffDays / 7);
        for (let i = 0; i < weeks && i < maxBars; i++) {
          const wStart = new Date(from);
          wStart.setDate(wStart.getDate() + i * 7);
          const wEnd = new Date(wStart);
          wEnd.setDate(wEnd.getDate() + 6);
          if (wEnd > to) wEnd.setTime(to.getTime());
          const startKey = wStart.toISOString().slice(0, 10);
          const endKey = wEnd.toISOString().slice(0, 10);
          const wOrders = orders.filter((o: any) => {
            if (o.status !== "DELIVERED") return false;
            const d = o.createdAt?.slice(0, 10);
            return d >= startKey && d <= endKey;
          });
          bars.push({
            label: `${wStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`,
            count: wOrders.length,
            revenue: wOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
          });
        }
      }
    }
    return bars;
  })();

  const chartMax = Math.max(...chartData.map((b) => b.count), 1);
  const chartTotalCount = chartData.reduce((s, b) => s + b.count, 0);
  const chartTotalRevenue = chartData.reduce((s, b) => s + b.revenue, 0);

  // Gains du jour (livreur)
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDelivered = isDriverRole ? orders.filter((o: any) => o.status === "DELIVERED" && o.createdAt?.slice(0, 10) === todayKey) : [];
  const todayRevenue = todayDelivered.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
  const cancelledOrders = orders.filter((o: any) => o.status === "CANCELLED");

  return (
    <div className="space-y-5">
      <PageHeader
        title={isDriverRole ? "Espace livreur" : role === "COOK" ? "Espace cuisinier" : "Mon espace"}
        subtitle={`Bonjour, ${session?.user?.name || "Utilisateur"}`}
      >
        {isDriverRole && (
          <Link href="/livraison/order" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium !text-white transition-all shadow-lg active:scale-95 bg-gradient-to-r from-orange-600 to-orange-500">
            <Package className="w-3.5 h-3.5" /> Commandes
          </Link>
        )}
      </PageHeader>

      {/* Stats rapides — version améliorée pour livreur */}
      {isDriverRole ? (
        <>
          {/* Carte revenus du jour */}
          <Card className="relative overflow-hidden p-4">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-[radial-gradient(circle,#f97316,transparent)]" style={{ transform: "translate(30%, -30%)" }} />
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Gains du jour</p>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400">Actif</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{todayRevenue.toLocaleString()} <span className="text-base font-normal text-gray-400">FCFA</span></p>
            <p className="text-xs text-gray-500">{todayDelivered.length} livraison{todayDelivered.length > 1 ? "s" : ""} aujourd&apos;hui</p>
          </Card>

          {/* Stats scrollables */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <Card className="p-3.5 min-w-[140px] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10">
                  <Truck className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
                  <p className="text-[11px] text-gray-500">En cours</p>
                </div>
              </div>
            </Card>
            <Card className="p-3.5 min-w-[140px] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{deliveredOrders.length}</p>
                  <p className="text-[11px] text-gray-500">Livrées</p>
                </div>
              </div>
            </Card>
            <Card className="p-3.5 min-w-[140px] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{orders.length}</p>
                  <p className="text-[11px] text-gray-500">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-3.5 min-w-[140px] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{cancelledOrders.length}</p>
                  <p className="text-[11px] text-gray-500">Annulées</p>
                </div>
              </div>
            </Card>
          </div>


          {/* Graphe de suivi */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-400" /> Suivi des livraisons
                </h3>
              </div>

              {/* Filtres période */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                {([
                  { key: "day", label: "7 jours" },
                  { key: "week", label: "4 sem." },
                  { key: "month", label: "6 mois" },
                  { key: "custom", label: "Personnalisé" },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setChartPeriod(f.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                      chartPeriod === f.key
                        ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                        : "bg-gray-800/80 text-gray-400 hover:bg-gray-700"
                    )}
                  >
                    {f.key === "custom" && <Calendar className="w-3 h-3 inline mr-1" />}
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Dates personnalisées */}
              {chartPeriod === "custom" && (
                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 mb-1 block">Du</label>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 mb-1 block">Au</label>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
              )}

              {/* Totaux période */}
              {chartData.length > 0 && (
                <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-gray-800/50">
                  <div className="flex-1">
                    <p className="text-xl font-bold text-white">{chartTotalCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Livraisons</p>
                  </div>
                  <div className="w-px h-8 bg-gray-700" />
                  <div className="flex-1">
                    <p className="text-xl font-bold text-orange-400">{chartTotalRevenue.toLocaleString()} <span className="text-xs font-normal">F</span></p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revenus</p>
                  </div>
                </div>
              )}

              {/* Barres */}
              {chartData.length > 0 ? (
                <div className="flex items-end gap-2" style={{ height: "160px" }}>
                  {chartData.map((bar, i) => {
                    const pct = (bar.count / chartMax) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                          <p className="text-[10px] text-white font-medium">{bar.count} livr.</p>
                          <p className="text-[10px] text-orange-400 font-medium">{bar.revenue.toLocaleString()} F</p>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold">{bar.count > 0 ? bar.count : ""}</p>
                        <div className="w-full bg-gray-800/60 rounded-lg relative" style={{ height: "120px" }}>
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-700 ease-out"
                            style={{
                              height: `${Math.max(pct, bar.count > 0 ? 8 : 0)}%`,
                              background: bar.count > 0 ? "linear-gradient(to top, #c2410c, #ea580c, #fb923c)" : "transparent",
                              boxShadow: bar.count > 0 ? "0 0 12px rgba(249, 115, 22, 0.2)" : "none",
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium truncate max-w-full">{bar.label}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <BarChart3 className="w-8 h-8 text-gray-700 mb-2" />
                  <p className="text-xs">{chartPeriod === "custom" ? "Sélectionnez les dates" : "Aucune donnée"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Stats pour Cook / Client */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={role === "COOK" ? ChefHat : Truck}
              value={activeOrders.length}
              label={role === "COOK" ? "En préparation" : "Commandes en cours"}
              color="orange"
            />
            <StatCard
              icon={CheckCircle}
              value={deliveredOrders.length}
              label={role === "COOK" ? "Préparées" : "Commandes livrées"}
              color="green"
            />
          </div>

          {/* Actions rapides Cook / Client */}
          <div className="grid grid-cols-2 gap-3">
            {role === "CLIENT" && (
              <Link href="/livraison">
                <Card hover className="p-4 flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl"><ShoppingBag className="w-5 h-5 text-orange-400" /></div>
                  <div><p className="text-sm font-medium text-white">Commander</p><p className="text-xs text-gray-500">Passer une commande</p></div>
                </Card>
              </Link>
            )}
            {role === "COOK" && (
              <Link href="/cuisine">
                <Card hover className="p-4 flex items-center gap-3">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl"><ChefHat className="w-5 h-5 text-orange-400" /></div>
                  <div><p className="text-sm font-medium text-white">Cuisine</p><p className="text-xs text-gray-500">Voir les commandes</p></div>
                </Card>
              </Link>
            )}
            <Link href="/livraison/order">
              <Card hover className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-xl"><Package className="w-5 h-5 text-purple-400" /></div>
                <div><p className="text-sm font-medium text-white">Commandes</p><p className="text-xs text-gray-500">Voir toutes</p></div>
              </Card>
            </Link>
          </div>
        </>
      )}

      {/* Activité récente */}
      {recentOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Activité récente</h3>
          <div className="space-y-2">
            {recentOrders.map((order: any) => {
              const href = isDriverRole && order.delivery
                ? `/livraison/driver/${order.delivery.id}`
                : role === "COOK" ? `/cuisine` : `/livraison/order/${order.id}`;
              return (
                <Link key={order.id} href={href} className="block">
                  <Card hover className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {isDriverRole || role === "COOK" ? (order.client?.name || order.guestName || `#${order.id.slice(-6)}`) : `Commande #${order.id.slice(-6)}`}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <StatusBadge status={order.status} type="order" />
                        <p className="text-xs font-bold text-orange-400 mt-1">{order.totalAmount?.toLocaleString()} F</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          message={isDriverRole ? "Aucune livraison pour le moment" : role === "COOK" ? "Aucune commande en cuisine" : "Aucune commande pour le moment"}
        >
          {role === "CLIENT" && (
            <Link href="/livraison" className="inline-block mt-3 text-sm text-orange-400 hover:underline">
              Passer une commande
            </Link>
          )}
        </EmptyState>
      )}
    </div>
  );
}
