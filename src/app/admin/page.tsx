"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut, SessionProvider } from "next-auth/react";
import Link from "next/link";
import {
  Shield, Loader2, Eye, EyeOff, BarChart3, Users, Wallet,
  ShoppingBag, TrendingUp, Truck, Clock, CheckCircle, Package,
  LogOut, ChefHat, CreditCard, ArrowRight, Settings,
  UserPlus, Utensils, MapPin, Bell,
} from "lucide-react";
import { Toaster } from "sonner";

/* ---------- Login Screen ---------- */
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Identifiants incorrects");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_60%)]" />
      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/20 mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Telivra <span className="text-violet-400">Admin</span></h1>
          <p className="text-gray-500 text-sm mt-1">Panneau d&apos;administration</p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-500">
            <BarChart3 className="w-4 h-4 text-violet-500" />
            <span className="text-xs">Statistiques</span>
          </div>
          <div className="w-px h-3 bg-gray-800" />
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="w-4 h-4 text-violet-500" />
            <span className="text-xs">Gestion</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Email administrateur</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="admin@telivra.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Acc&eacute;der &agrave; l&apos;administration
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Pas admin ? <a href="/" className="text-violet-500 hover:underline">Retour &agrave; l&apos;accueil</a>
        </p>
      </div>
    </div>
  );
}

/* ---------- Admin Dashboard ---------- */
function AdminDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Admin";
  const role = (session?.user as any)?.role;

  const [revenue, setRevenue] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats/revenue").then((r) => r.json()).catch(() => null),
      fetch("/api/orders").then((r) => r.json()).catch(() => []),
    ]).then(([rev, ord]) => {
      setRevenue(rev);
      setOrders(Array.isArray(ord) ? ord : []);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement du dashboard...</p>
      </div>
    </div>
  );

  const recentOrders = orders.slice(0, 5);
  const statusColors: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-500/10",
    ACCEPTED: "text-orange-400 bg-orange-500/10",
    PREPARING: "text-orange-400 bg-orange-500/10",
    READY: "text-cyan-400 bg-cyan-500/10",
    PICKED_UP: "text-indigo-400 bg-indigo-500/10",
    DELIVERING: "text-purple-400 bg-purple-500/10",
    DELIVERED: "text-green-400 bg-green-500/10",
    CANCELLED: "text-red-400 bg-red-500/10",
  };
  const statusLabels: Record<string, string> = {
    PENDING: "En attente", ACCEPTED: "Accept\u00e9e", PREPARING: "En cuisine",
    READY: "Pr\u00eat", PICKED_UP: "R\u00e9cup\u00e9r\u00e9e", DELIVERING: "En livraison",
    DELIVERED: "Livr\u00e9e", CANCELLED: "Annul\u00e9e",
  };

  const quickLinks = [
    { href: "/dashboard", icon: BarChart3, label: "Dashboard complet", color: "violet", desc: "Stats d\u00e9taill\u00e9es" },
    { href: "/products", icon: Utensils, label: "Produits", color: "orange", desc: "Menu & plats" },
    { href: "/cuisine", icon: ChefHat, label: "Cuisine", color: "amber", desc: "Gestion cuisine" },
    { href: "/livraison/order", icon: Package, label: "Commandes", color: "blue", desc: "Toutes les commandes" },
    { href: "/users", icon: Users, label: "Utilisateurs", color: "green", desc: "Gestion des comptes" },
    { href: "/drivers", icon: Truck, label: "Livreurs", color: "emerald", desc: "Gestion livreurs" },
    { href: "/statistiques", icon: TrendingUp, label: "Statistiques", color: "purple", desc: "Rapports avanc\u00e9s" },
    { href: "/settings", icon: Settings, label: "Param\u00e8tres", color: "gray", desc: "Configuration" },
  ];

  const colorMap: Record<string, string> = {
    violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-400",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/20 text-green-400",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-400",
    gray: "from-gray-500/20 to-gray-600/10 border-gray-500/20 text-gray-400",
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Admin</h1>
                <p className="text-[11px] text-gray-500">{userName}</p>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/admin" })}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-5 pb-8">
        {/* Revenue cards */}
        {revenue && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-green-400" />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Aujourd&apos;hui</span>
              </div>
              <p className="text-xl font-bold text-white">{(revenue.today?.revenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">{revenue.today?.orders || 0} commandes</p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Semaine</span>
              </div>
              <p className="text-xl font-bold text-white">{(revenue.week?.revenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">{revenue.week?.orders || 0} commandes</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Mois</span>
              </div>
              <p className="text-xl font-bold text-white">{(revenue.month?.revenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">{revenue.month?.orders || 0} commandes</p>
            </div>
            <div className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total</span>
              </div>
              <p className="text-xl font-bold text-white">{revenue.totals?.orders || 0}</p>
              <p className="text-[10px] text-gray-500">commandes au total</p>
            </div>
          </div>
        )}

        {/* Kitchen & Activity stats */}
        {revenue && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{revenue.totals?.pending || 0}</p>
              <p className="text-[9px] text-gray-400">En attente</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
              <Truck className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{revenue.totals?.activeDeliveries || 0}</p>
              <p className="text-[9px] text-gray-400">En livraison</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{revenue.totals?.deliveredToday || 0}</p>
              <p className="text-[9px] text-gray-400">Livr&eacute;es auj.</p>
            </div>
          </div>
        )}

        {/* Payment breakdown */}
        {revenue?.paymentBreakdown && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
              <Wallet className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">{(revenue.paymentBreakdown.cash?.revenue || 0).toLocaleString()} F</p>
                <p className="text-[10px] text-gray-400">Esp&egrave;ces ({revenue.paymentBreakdown.cash?.count || 0})</p>
              </div>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">{(revenue.paymentBreakdown.online?.revenue || 0).toLocaleString()} F</p>
                <p className="text-[10px] text-gray-400">En ligne ({revenue.paymentBreakdown.online?.count || 0})</p>
              </div>
            </div>
          </div>
        )}

        {/* 7-day chart */}
        {revenue?.dailyRevenue && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">7 derniers jours</h3>
              <Link href="/statistiques" className="text-xs text-violet-400 flex items-center gap-1 hover:underline">
                D&eacute;tails <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex items-end justify-between gap-2 h-28">
              {revenue.dailyRevenue.map((day: any, idx: number) => {
                const maxRev = Math.max(...revenue.dailyRevenue.map((d: any) => d.revenue), 1);
                const height = (day.revenue / maxRev) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-[9px] text-gray-500 font-medium">{day.count > 0 ? day.count : ""}</p>
                    <div className="w-full bg-gray-800 rounded-t-lg relative" style={{ height: "80px" }}>
                      <div className="absolute bottom-0 left-0 right-0 rounded-t-lg transition-all"
                        style={{ height: `${Math.max(height, 3)}%`, background: "linear-gradient(to top, #7c3aed, #a78bfa)" }} />
                    </div>
                    <p className="text-[10px] text-gray-500">{day.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick links grid */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-violet-400" />
            Gestion rapide
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`bg-gradient-to-br ${colorMap[link.color]} border rounded-xl p-3.5 hover:scale-[1.02] transition-transform`}>
                <link.icon className="w-5 h-5 mb-2" />
                <p className="text-sm font-medium text-white">{link.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Commandes r&eacute;centes</h3>
              <Link href="/livraison/order" className="text-xs text-violet-400 flex items-center gap-1 hover:underline">
                Tout voir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {order.client?.name || order.guestName || `#${order.id.slice(-6)}`}
                    </p>
                    <p className="text-[10px] text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || "text-gray-400 bg-gray-800"}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <p className="text-sm font-bold text-violet-400 shrink-0">{order.totalAmount?.toLocaleString()} F</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Toaster position="top-center" theme="dark" richColors />
    </div>
  );
}

/* ---------- Main wrapper ---------- */
function AdminApp() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!session) return <AdminLogin />;

  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <Shield className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acc&egrave;s refus&eacute;</h2>
        <p className="text-gray-500 text-sm mb-4">Vous n&apos;&ecirc;tes pas autoris&eacute; &agrave; acc&eacute;der &agrave; cette page.</p>
        <button onClick={() => signOut({ callbackUrl: "/admin" })}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors">
          Se d&eacute;connecter
        </button>
      </div>
    );
  }

  return <AdminDashboard />;
}

export default function AdminPage() {
  return (
    <SessionProvider>
      <AdminApp />
    </SessionProvider>
  );
}
