"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2, ShoppingBag, TrendingUp, Truck, Clock,
  CheckCircle, Package, Users, MapPin, ArrowRight,
  Wallet, BarChart3, UtensilsCrossed, ChefHat, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400" },
  ACCEPTED: { label: "Acceptee", color: "bg-orange-500/20 text-orange-400" },
  PREPARING: { label: "En cuisine", color: "bg-orange-500/20 text-orange-400" },
  READY: { label: "Pret", color: "bg-cyan-500/20 text-cyan-400" },
  PICKED_UP: { label: "Recuperee", color: "bg-indigo-500/20 text-indigo-400" },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400" },
  DELIVERED: { label: "Livree", color: "bg-green-500/20 text-green-400" },
  CANCELLED: { label: "Annulee", color: "bg-red-500/20 text-red-400" },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VIEWER";
  const isAdmin = role === "ADMIN";

  const [revenue, setRevenue] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Vue d&apos;ensemble de votre activite</p>
        </div>

        {/* Recettes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-xl p-4">
            <Wallet className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">{revenue.today.revenue.toLocaleString()}</p>
            <p className="text-xs text-green-400/70">Recette du jour</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{revenue.today.orders} commande{revenue.today.orders > 1 ? "s" : ""}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
            <BarChart3 className="w-5 h-5 text-orange-400 mb-2" />
            <p className="text-2xl font-bold text-white">{revenue.week.revenue.toLocaleString()}</p>
            <p className="text-xs text-orange-400/70">Cette semaine</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{revenue.week.orders} commande{revenue.week.orders > 1 ? "s" : ""}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
            <TrendingUp className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">{revenue.month.revenue.toLocaleString()}</p>
            <p className="text-xs text-purple-400/70">Ce mois</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{revenue.month.orders} commande{revenue.month.orders > 1 ? "s" : ""}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
            <ShoppingBag className="w-5 h-5 text-orange-400 mb-2" />
            <p className="text-2xl font-bold text-white">{revenue.totals.orders}</p>
            <p className="text-xs text-orange-400/70">Total commandes</p>
          </div>
        </div>

        {/* Stats cuisine */}
        {revenue.cookStats && (
          <div className="bg-gradient-to-r from-orange-600/10 to-amber-600/10 border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ChefHat className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Cuisine</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-yellow-400">{revenue.cookStats.pendingCook || 0}</p>
                <p className="text-[10px] text-gray-400">En attente</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-orange-400">{revenue.cookStats.preparing || 0}</p>
                <p className="text-[10px] text-gray-400">En cuisine</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-cyan-400">{revenue.cookStats.ready || 0}</p>
                <p className="text-[10px] text-gray-400">Pretes</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-400">{revenue.cookStats.prepared || 0}</p>
                <p className="text-[10px] text-gray-400">Preparees auj.</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats activite + paiement */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 rounded-xl"><Clock className="w-5 h-5 text-yellow-400" /></div>
            <div>
              <p className="text-xl font-bold text-white">{revenue.totals.pending}</p>
              <p className="text-xs text-gray-500">En attente</p>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl"><Truck className="w-5 h-5 text-purple-400" /></div>
            <div>
              <p className="text-xl font-bold text-white">{revenue.totals.activeDeliveries}</p>
              <p className="text-xs text-gray-500">En livraison</p>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl"><CheckCircle className="w-5 h-5 text-green-400" /></div>
            <div>
              <p className="text-xl font-bold text-white">{revenue.totals.deliveredToday}</p>
              <p className="text-xs text-gray-500">Livrees auj.</p>
            </div>
          </div>
        </div>

        {/* Repartition paiement */}
        {revenue.paymentBreakdown && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/10 rounded-xl"><Wallet className="w-5 h-5 text-yellow-400" /></div>
              <div>
                <p className="text-lg font-bold text-white">{(revenue.paymentBreakdown.cash?.revenue || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Especes ({revenue.paymentBreakdown.cash?.count || 0})</p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl"><CreditCard className="w-5 h-5 text-cyan-400" /></div>
              <div>
                <p className="text-lg font-bold text-white">{(revenue.paymentBreakdown.online?.revenue || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">En ligne ({revenue.paymentBreakdown.online?.count || 0})</p>
              </div>
            </div>
          </div>
        )}

        {/* Graphique 7 jours */}
        {revenue.dailyRevenue && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
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
          </div>
        )}

        {/* Commandes recentes */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Commandes recentes</h3>
              <Link href="/livraison/order" className="text-xs text-orange-400 flex items-center gap-1">
                Tout voir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order: any) => {
                const st = statusLabels[order.status] || statusLabels.PENDING;
                return (
                  <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {order.client?.name || order.guestName || `#${order.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium shrink-0", st.color)}>{st.label}</span>
                    <p className="text-sm font-bold text-orange-400 shrink-0">{order.totalAmount?.toLocaleString()} F</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard Client / Driver / Cook
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {role === "DRIVER" ? "Espace livreur" : role === "COOK" ? "Espace cuisinier" : "Mon espace"}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Bonjour, {session?.user?.name || "Utilisateur"}
        </p>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
          {role === "COOK" ? <ChefHat className="w-5 h-5 text-orange-400 mb-2" /> : <Truck className="w-5 h-5 text-orange-400 mb-2" />}
          <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
          <p className="text-xs text-orange-400/70">
            {role === "DRIVER" ? "Livraisons en cours" : role === "COOK" ? "En preparation" : "Commandes en cours"}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-500/20 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{deliveredOrders.length}</p>
          <p className="text-xs text-green-400/70">
            {role === "DRIVER" ? "Livrees" : role === "COOK" ? "Preparees" : "Commandes livrees"}
          </p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3">
        {role === "CLIENT" && (
          <Link href="/livraison" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 rounded-xl"><ShoppingBag className="w-5 h-5 text-orange-400" /></div>
            <div><p className="text-sm font-medium text-white">Commander</p><p className="text-xs text-gray-500">Passer une commande</p></div>
          </Link>
        )}
        {role === "COOK" && (
          <Link href="/cuisine" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 rounded-xl"><ChefHat className="w-5 h-5 text-orange-400" /></div>
            <div><p className="text-sm font-medium text-white">Cuisine</p><p className="text-xs text-gray-500">Voir les commandes</p></div>
          </Link>
        )}
        <Link href="/livraison/order" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 rounded-xl"><Package className="w-5 h-5 text-purple-400" /></div>
          <div><p className="text-sm font-medium text-white">Commandes</p><p className="text-xs text-gray-500">Voir toutes</p></div>
        </Link>
        <Link href="/map" className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl"><MapPin className="w-5 h-5 text-cyan-400" /></div>
          <div><p className="text-sm font-medium text-white">Carte</p><p className="text-xs text-gray-500">Voir la carte</p></div>
        </Link>
      </div>

      {/* Commandes recentes */}
      {recentOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Activite recente</h3>
          <div className="space-y-2">
            {recentOrders.map((order: any) => {
              const st = statusLabels[order.status] || statusLabels.PENDING;
              const href = role === "DRIVER" && order.delivery
                ? `/livraison/driver/${order.delivery.id}`
                : role === "COOK" ? `/cuisine` : `/livraison/order/${order.id}`;
              return (
                <Link key={order.id} href={href}
                  className="block bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {role === "DRIVER" || role === "COOK" ? (order.client?.name || order.guestName || `#${order.id.slice(-6)}`) : `Commande #${order.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", st.color)}>{st.label}</span>
                      <p className="text-xs font-bold text-orange-400 mt-1">{order.totalAmount?.toLocaleString()} F</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {role === "DRIVER" ? "Aucune livraison pour le moment" : role === "COOK" ? "Aucune commande en cuisine" : "Aucune commande pour le moment"}
          </p>
          {role === "CLIENT" && (
            <Link href="/livraison" className="inline-block mt-3 text-sm text-orange-400 hover:underline">
              Passer une commande
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
