"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn, signOut, SessionProvider } from "next-auth/react";
import {
  ChefHat, Loader2, Eye, EyeOff, Flame, Bell, Wifi, Clock,
  CheckCircle, User, Timer, XCircle, Truck, BellRing, Ban,
  Star, CreditCard, LogOut, ChevronLeft, ChevronRight, Package,
  AlertTriangle, WifiOff, RefreshCw,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { playSound } from "@/lib/sounds";

const ITEMS_PER_PAGE = 12;

/* ---------- Login Screen ---------- */
function KitchenLogin() {
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_60%)]" />
      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Telivra <span className="text-amber-400">Cuisine</span></h1>
          <p className="text-gray-500 text-sm mt-1">Espace cuisinier</p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-500">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-xs">Commandes en direct</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="cuisinier@telivra.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 transition-colors" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
            Acc&eacute;der &agrave; la cuisine
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Pas cuisinier ? <a href="/" className="text-amber-500 hover:underline">Retour &agrave; l&apos;accueil</a>
        </p>
      </div>
    </div>
  );
}

/* ---------- Cooking Countdown (inline) ---------- */
function CookCountdown({ cookAcceptedAt, cookingTimeMin, onReady }: { cookAcceptedAt: string; cookingTimeMin: number; onReady?: () => void }) {
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const reminderPlayed = useRef(false);

  useEffect(() => {
    const totalMs = cookingTimeMin * 60 * 1000;
    const update = () => {
      const elapsed = Date.now() - new Date(cookAcceptedAt).getTime();
      const rem = Math.max(0, totalMs - elapsed);
      setRemaining(Math.ceil(rem / 1000));
      setProgress(Math.min(100, (elapsed / totalMs) * 100));
      if (rem <= 30000 && rem > 0 && !reminderPlayed.current) {
        reminderPlayed.current = true;
        playSound("order-ready");
      }
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [cookAcceptedAt, cookingTimeMin]);

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const isOverdue = remaining === 0;
  const isWarning = remaining > 0 && remaining <= 30;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Timer className={`w-3.5 h-3.5 ${isOverdue ? "text-red-400" : isWarning ? "text-yellow-400 animate-pulse" : "text-amber-400"}`} />
          <span className={`text-xs font-bold ${isOverdue ? "text-red-400" : isWarning ? "text-yellow-400" : "text-white"}`}>
            {isOverdue ? "Temps écoulé !" : `${min}:${sec.toString().padStart(2, "0")}`}
          </span>
        </div>
        <span className="text-[10px] text-gray-500">{cookingTimeMin}min</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-1000 ${isOverdue ? "bg-red-500" : isWarning ? "bg-yellow-500" : progress > 75 ? "bg-yellow-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      {isOverdue && onReady && (
        <button onClick={onReady}
          className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors animate-pulse">
          <CheckCircle className="w-3 h-3" /> Marquer prête
        </button>
      )}
    </div>
  );
}

/* ---------- Kitchen Dashboard ---------- */
function KitchenDashboard() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const userName = session?.user?.name || "Cuisinier";

  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [readying, setReadying] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setPage(1); }, [tab]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/cook");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        setIsOnline(true);
      }
    } catch {
      setIsOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    pollRef.current = setInterval(loadOrders, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadOrders]);

  useDeliverySocket({
    asCook: true,
    onNewOrder: useCallback(() => {
      loadOrders();
      setNewAlert(true);
      playSound("new-order");
      setTimeout(() => setNewAlert(false), 5000);
    }, [loadOrders]),
    onStatusChange: useCallback(() => { loadOrders(); }, [loadOrders]),
    onCookAccepted: useCallback(() => { loadOrders(); }, [loadOrders]),
    onOrderReady: useCallback(() => { loadOrders(); }, [loadOrders]),
  });

  async function acceptOrder(orderId: string) {
    setAccepting(orderId);
    const res = await fetch(`/api/orders/${orderId}/cook-accept`, { method: "POST" });
    if (res.ok) { await loadOrders(); setTab("preparing"); toast.success("Commande acceptée"); }
    else toast.error("Erreur");
    setAccepting(null);
  }

  async function markReady(orderId: string) {
    setReadying(orderId);
    const res = await fetch(`/api/orders/${orderId}/cook-ready`, { method: "POST" });
    if (res.ok) { await loadOrders(); toast.success("Commande prête !"); }
    else toast.error("Erreur");
    setReadying(null);
  }

  async function notifyCook(orderId: string) {
    setNotifying(orderId);
    const res = await fetch(`/api/orders/${orderId}/notify-cook`, { method: "POST" });
    if (res.ok) toast.success("Notification envoyée");
    else toast.error("Erreur");
    setNotifying(null);
  }

  async function cancelOrder(orderId: string) {
    const reason = prompt("Raison de l'annulation :");
    if (!reason?.trim()) return;
    setCancelling(orderId);
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (res.ok) { await loadOrders(); toast.success("Commande annulée"); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Erreur"); }
    setCancelling(null);
  }

  async function confirmPayment(orderId: string) {
    setConfirmingPayment(orderId);
    const res = await fetch(`/api/orders/${orderId}/confirm-payment`, { method: "POST" });
    if (res.ok) { await loadOrders(); toast.success("Paiement confirmé"); }
    else toast.error("Erreur");
    setConfirmingPayment(null);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement de la cuisine...</p>
      </div>
    </div>
  );

  const pending = orders.filter((o) => o.status === "PENDING");
  const preparing = orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const ready = orders.filter((o) => o.status === "READY");
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  const tabs = [
    { key: "pending", label: "Nouvelles", count: pending.length, icon: Bell, color: "amber" },
    { key: "preparing", label: "En cuisine", count: preparing.length, icon: ChefHat, color: "orange" },
    { key: "ready", label: "Prêtes", count: ready.length, icon: CheckCircle, color: "green" },
    { key: "delivered", label: "Livrées", count: delivered.length, icon: Truck, color: "emerald" },
    { key: "cancelled", label: "Annulées", count: cancelled.length, icon: XCircle, color: "red" },
  ];

  const listMap: Record<string, any[]> = { pending, preparing, ready, delivered, cancelled };
  const currentList = listMap[tab] || [];
  const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
  const paginatedList = currentList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Cuisine</h1>
                <p className="text-[11px] text-gray-500">{userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
                  <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-[10px] text-green-400 font-medium">En direct</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/20 rounded-full">
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-red-400 font-medium">Hors ligne</span>
                </div>
              )}
              <button onClick={() => signOut({ callbackUrl: "/kitchen" })}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Stats rapides */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{pending.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Nouvelles</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{preparing.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">En cuisine</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{ready.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Pr&ecirc;tes</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{delivered.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Livr&eacute;es</p>
          </div>
        </div>

        {/* Alerte nouvelle commande */}
        {newAlert && (
          <div className="bg-amber-600/20 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 animate-pulse">
            <BellRing className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-amber-400 font-medium">Nouvelle commande !</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                tab === t.key
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                  : "bg-gray-800/80 text-gray-400 hover:bg-gray-700"
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-gray-700 text-gray-300"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">Aucune commande</p>
            <p className="text-gray-600 text-xs mt-1">Les commandes apparaissent automatiquement</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedList.map((order) => {
                const maxCookTime = Math.max(...(order.items?.map((i: any) => i.product?.cookingTimeMin ?? 15) || [15]));
                return (
                  <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 space-y-2.5 hover:border-amber-500/30 transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{order.client?.name || order.guestName || "Client"}</p>
                          <p className="text-[10px] text-gray-500">{order.orderNumber || "#" + (order.id as string).slice(-6)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-amber-400">{order.totalAmount?.toLocaleString()} F</span>
                    </div>

                    {/* Items */}
                    <div className="bg-gray-800/50 rounded-lg p-2.5 space-y-1">
                      {order.items?.slice(0, 4).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <p className="text-[11px] text-gray-300 truncate flex-1">
                            <span className="text-white font-bold">{item.quantity}x</span> {item.product?.name}
                          </p>
                          {item.product?.cookingTimeMin && (
                            <span className="text-[10px] text-gray-500 ml-2">{item.product.cookingTimeMin}min</span>
                          )}
                        </div>
                      ))}
                      {(order.items?.length || 0) > 4 && (
                        <p className="text-[10px] text-gray-500">+{order.items.length - 4} autre(s)</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-2.5 h-2.5" /> ~{maxCookTime}min
                      </span>
                    </div>

                    {/* Cooking countdown */}
                    {tab === "preparing" && order.cookAcceptedAt && (
                      <CookCountdown cookAcceptedAt={order.cookAcceptedAt} cookingTimeMin={maxCookTime} onReady={() => markReady(order.id)} />
                    )}

                    {/* Note client */}
                    {order.note && (
                      <p className="text-[10px] text-yellow-400/80 bg-yellow-500/10 px-2 py-1 rounded truncate">
                        {order.note}
                      </p>
                    )}

                    {/* Cancel reason */}
                    {order.cancelReason && tab === "cancelled" && (
                      <p className="text-[10px] text-red-400/80 bg-red-500/10 px-2 py-1 rounded truncate">
                        {order.cancelReason}
                      </p>
                    )}

                    {/* Rating */}
                    {order.rating && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-[9px] text-gray-500">Repas</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-2.5 h-2.5 ${i < order.rating.mealRating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"}`} />
                            ))}
                          </div>
                        </div>
                        {order.rating.mealComment && (
                          <p className="text-[9px] text-gray-400 italic truncate flex-1">{order.rating.mealComment}</p>
                        )}
                      </div>
                    )}

                    {/* Payment badge */}
                    {order.paymentMethod === "ONLINE" && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
                        order.paymentConfirmed
                          ? "bg-green-600/10 border border-green-500/20 text-green-400"
                          : "bg-yellow-600/10 border border-yellow-500/20 text-yellow-400"
                      }`}>
                        <CreditCard className="w-2.5 h-2.5" />
                        {order.paymentConfirmed ? "Paiement reçu" : "Paiement en attente"}
                      </div>
                    )}

                    {/* Cook Actions */}
                    {!isAdmin && tab === "pending" && (
                      <div className="space-y-1.5">
                        {order.paymentMethod === "ONLINE" && !order.paymentConfirmed ? (
                          <button onClick={() => confirmPayment(order.id)} disabled={confirmingPayment === order.id}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                            {confirmingPayment === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                            Confirmer paiement
                          </button>
                        ) : (
                          <button onClick={() => acceptOrder(order.id)} disabled={accepting === order.id}
                            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/10">
                            {accepting === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChefHat className="w-3.5 h-3.5" />}
                            Accepter la commande
                          </button>
                        )}
                        <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                          className="w-full py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                          {cancelling === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                          Refuser
                        </button>
                      </div>
                    )}

                    {!isAdmin && tab === "preparing" && (
                      <button onClick={() => markReady(order.id)} disabled={readying === order.id}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                        {readying === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Commande pr&ecirc;te !
                      </button>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && tab === "pending" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => notifyCook(order.id)} disabled={notifying === order.id}
                          className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
                          {notifying === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                          Notifier
                        </button>
                        <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                          className="py-2 px-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs transition-colors">
                          {cancelling === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}

                    {isAdmin && (tab === "preparing" || tab === "ready") && (
                      <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                        className="w-full py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                        {cancelling === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                        Annuler
                      </button>
                    )}

                    {/* Status badges */}
                    {tab === "ready" && !isAdmin && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600/10 border border-green-500/20 rounded-lg text-[10px] text-green-400 font-medium">
                        <CheckCircle className="w-3 h-3" /> En attente du livreur
                      </div>
                    )}
                    {tab === "delivered" && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-400 font-medium">
                        <Truck className="w-3 h-3" /> Livr&eacute;e
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 bg-gray-800 text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-700 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500">Page {page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-2 bg-gray-800 text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-700 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom nav - refresh */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 flex justify-center">
        <button onClick={loadOrders}
          className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-amber-600/20">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <Toaster position="top-center" theme="dark" richColors />
    </div>
  );
}

/* ---------- Main wrapper ---------- */
function KitchenApp() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!session) return <KitchenLogin />;

  return <KitchenDashboard />;
}

export default function KitchenPage() {
  return (
    <SessionProvider>
      <KitchenApp />
    </SessionProvider>
  );
}
