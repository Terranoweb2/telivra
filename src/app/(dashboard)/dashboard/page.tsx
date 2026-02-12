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
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatCard, StatCardBadge, StatCardCentered } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";

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
        <PageHeader title="Dashboard" subtitle="Vue d'ensemble de votre activite" />

        {/* Recettes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Wallet}
            value={revenue.today.revenue.toLocaleString()}
            label="Recette du jour"
            sublabel={`${revenue.today.orders} commande${revenue.today.orders > 1 ? "s" : ""}`}
            color="green"
          />
          <StatCard
            icon={BarChart3}
            value={revenue.week.revenue.toLocaleString()}
            label="Cette semaine"
            sublabel={`${revenue.week.orders} commande${revenue.week.orders > 1 ? "s" : ""}`}
            color="orange"
          />
          <StatCard
            icon={TrendingUp}
            value={revenue.month.revenue.toLocaleString()}
            label="Ce mois"
            sublabel={`${revenue.month.orders} commande${revenue.month.orders > 1 ? "s" : ""}`}
            color="purple"
          />
          <StatCard
            icon={ShoppingBag}
            value={revenue.totals.orders}
            label="Total commandes"
            color="orange"
          />
        </div>

        {/* Stats cuisine */}
        {revenue.cookStats && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ChefHat className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Cuisine</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <StatCardCentered value={revenue.cookStats.pendingCook || 0} label="En attente" color="yellow" />
              <StatCardCentered value={revenue.cookStats.preparing || 0} label="En cuisine" color="orange" />
              <StatCardCentered value={revenue.cookStats.ready || 0} label="Pretes" color="cyan" />
              <StatCardCentered value={revenue.cookStats.prepared || 0} label="Preparees auj." color="green" />
            </div>
          </div>
        )}

        {/* Stats activite */}
        <div className="grid grid-cols-3 gap-3">
          <StatCardBadge
            icon={Clock}
            value={revenue.totals.pending}
            label="En attente"
            color="yellow"
          />
          <StatCardBadge
            icon={Truck}
            value={revenue.totals.activeDeliveries}
            label="En livraison"
            color="purple"
          />
          <StatCardBadge
            icon={CheckCircle}
            value={revenue.totals.deliveredToday}
            label="Livrees auj."
            color="green"
          />
        </div>

        {/* Repartition paiement */}
        {revenue.paymentBreakdown && (
          <div className="grid grid-cols-2 gap-3">
            <StatCardBadge
              icon={Wallet}
              value={(revenue.paymentBreakdown.cash?.revenue || 0).toLocaleString()}
              label={`Especes (${revenue.paymentBreakdown.cash?.count || 0})`}
              color="yellow"
            />
            <StatCardBadge
              icon={CreditCard}
              value={(revenue.paymentBreakdown.online?.revenue || 0).toLocaleString()}
              label={`En ligne (${revenue.paymentBreakdown.online?.count || 0})`}
              color="cyan"
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
  return (
    <div className="space-y-5">
      <PageHeader
        title={role === "DRIVER" ? "Espace livreur" : role === "COOK" ? "Espace cuisinier" : "Mon espace"}
        subtitle={`Bonjour, ${session?.user?.name || "Utilisateur"}`}
      />

      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={role === "COOK" ? ChefHat : Truck}
          value={activeOrders.length}
          label={role === "DRIVER" ? "Livraisons en cours" : role === "COOK" ? "En preparation" : "Commandes en cours"}
          color="orange"
        />
        <StatCard
          icon={CheckCircle}
          value={deliveredOrders.length}
          label={role === "DRIVER" ? "Livrees" : role === "COOK" ? "Preparees" : "Commandes livrees"}
          color="green"
        />
      </div>

      {/* Actions rapides */}
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
        <Link href="/map">
          <Card hover className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl"><MapPin className="w-5 h-5 text-cyan-400" /></div>
            <div><p className="text-sm font-medium text-white">Carte</p><p className="text-xs text-gray-500">Voir la carte</p></div>
          </Card>
        </Link>
      </div>

      {/* Commandes recentes */}
      {recentOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Activite recente</h3>
          <div className="space-y-2">
            {recentOrders.map((order: any) => {
              const href = role === "DRIVER" && order.delivery
                ? `/livraison/driver/${order.delivery.id}`
                : role === "COOK" ? `/cuisine` : `/livraison/order/${order.id}`;
              return (
                <Link key={order.id} href={href} className="block">
                  <Card hover className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {role === "DRIVER" || role === "COOK" ? (order.client?.name || order.guestName || `#${order.id.slice(-6)}`) : `Commande #${order.id.slice(-6)}`}
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
          message={role === "DRIVER" ? "Aucune livraison pour le moment" : role === "COOK" ? "Aucune commande en cuisine" : "Aucune commande pour le moment"}
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
