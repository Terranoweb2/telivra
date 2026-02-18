"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn, signOut, SessionProvider } from "next-auth/react";
import {
  Bike, Loader2, Eye, EyeOff, MapPin, Navigation, Bell, Wifi,
  CheckCircle, Truck, Clock, User, Package, ChevronRight, LogOut,
  WifiOff, RefreshCw, BarChart3, XCircle, Calendar, Wallet,
  Phone, MessageCircle,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { playSound } from "@/lib/sounds";

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  PICKING_UP: { text: "R\u00e9cup\u00e9ration", color: "text-yellow-400", bg: "bg-yellow-600/20 border-yellow-500/20" },
  DELIVERING: { text: "En livraison", color: "text-orange-400", bg: "bg-orange-600/20 border-orange-500/20" },
};

/* ---------- Login Screen ---------- */
function DriverLogin() {
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.08),transparent_60%)]" />
      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/20 mb-4">
            <Bike className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Telivra <span className="text-green-400">Livreur</span></h1>
          <p className="text-gray-500 text-sm mt-1">Espace livreur</p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-gray-500">
            <MapPin className="w-4 h-4 text-green-500" />
            <span className="text-xs">Suivi GPS</span>
          </div>
          <div className="w-px h-3 bg-gray-800" />
          <div className="flex items-center gap-2 text-gray-500">
            <Navigation className="w-4 h-4 text-green-500" />
            <span className="text-xs">Navigation</span>
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
              placeholder="livreur@telivra.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Mot de passe</label>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-green-500 transition-colors" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4" />}
            Commencer les livraisons
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Pas livreur ? <a href="/" className="text-green-500 hover:underline">Retour &agrave; l&apos;accueil</a>
        </p>
      </div>
    </div>
  );
}

/* ---------- Driver Dashboard ---------- */
function DriverDashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Livreur";

  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [view, setView] = useState<"deliveries" | "stats">("deliveries");
  const [accepting, setAccepting] = useState<string | null>(null);

  const myPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchRef = useRef<number | null>(null);
  const sendRef = useRef<any>(null);
  const activeIdsRef = useRef<string[]>([]);

  useDeliverySocket({
    asDriver: true,
    onNewOrder: useCallback((data: any) => {
      setPendingOrders((prev) => {
        if (prev.find((o) => o.id === data.id)) return prev;
        return [{ ...data, client: { name: data.clientName } }, ...prev];
      });
      setNewOrderAlert(true);
      playSound("new-order");
      setTimeout(() => setNewOrderAlert(false), 5000);
    }, []),
    onOrderUpdate: useCallback(() => { loadData(); }, []),
  });

  useEffect(() => {
    loadData();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { myPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function loadData() {
    try {
      const [pending, orders] = await Promise.all([
        fetch("/api/orders/pending").then((r) => r.json()),
        fetch("/api/orders?as=driver").then((r) => r.json()),
      ]);
      setPendingOrders(Array.isArray(pending) ? pending : []);
      const allWithDelivery = Array.isArray(orders) ? orders.filter((o: any) => o.delivery) : [];
      setMyDeliveries(allWithDelivery);
      setIsOnline(true);

      const activeIds = allWithDelivery
        .filter((o: any) => ["PICKING_UP", "DELIVERING"].includes(o.delivery?.status))
        .map((o: any) => o.delivery.id);
      activeIdsRef.current = activeIds;

      if (activeIds.length > 0) startTracking();
      else stopTracking();
    } catch {
      setIsOnline(false);
    }
    setLoading(false);
  }

  function startTracking() {
    if (watchRef.current !== null || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => { myPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {}, { enableHighAccuracy: true, maximumAge: 3000 }
    );
    sendRef.current = setInterval(async () => {
      const pos = myPosRef.current;
      const ids = activeIdsRef.current;
      if (!pos || ids.length === 0) return;
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/deliveries/${id}/position`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, speed: 0 }),
          }).catch(() => {})
        )
      );
    }, 8000);
  }

  function stopTracking() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (sendRef.current) { clearInterval(sendRef.current); sendRef.current = null; }
  }

  useEffect(() => { return () => stopTracking(); }, []);

  // Polling
  useEffect(() => {
    const iv = setInterval(loadData, 10000);
    return () => clearInterval(iv);
  }, []);

  async function acceptOrder(orderId: string) {
    setAccepting(orderId);
    const res = await fetch("/api/deliveries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        latitude: myPosRef.current?.lat,
        longitude: myPosRef.current?.lng,
      }),
    });
    if (res.ok) {
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      await loadData();
      toast.success("Livraison accept\u00e9e !");
      playSound("accepted");
    } else {
      toast.error("Erreur lors de l'acceptation");
    }
    setAccepting(null);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  );

  const activeDeliveries = myDeliveries.filter((o) => o.delivery && ["PICKING_UP", "DELIVERING"].includes(o.delivery.status));
  const deliveredOrders = myDeliveries.filter((o) => o.delivery?.status === "DELIVERED");
  const cancelledOrders = myDeliveries.filter((o) => o.delivery?.status === "CANCELLED");

  // Stats
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDelivered = deliveredOrders.filter((o) => o.createdAt?.slice(0, 10) === todayKey);
  const todayRevenue = todayDelivered.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
  const totalRevenue = deliveredOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Livreur</h1>
                <p className="text-[11px] text-gray-500">{userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
                  <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-[10px] text-green-400 font-medium">Connect\u00e9</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/20 rounded-full">
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-red-400 font-medium">Hors ligne</span>
                </div>
              )}
              <button onClick={() => signOut({ callbackUrl: "/driver" })}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Gains du jour */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-[radial-gradient(circle,#22c55e,transparent)]" style={{ transform: "translate(30%, -30%)" }} />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Gains du jour</p>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400">Actif</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{todayRevenue.toLocaleString()} <span className="text-base font-normal text-gray-400">FCFA</span></p>
          <p className="text-xs text-gray-500 mt-1">{todayDelivered.length} livraison{todayDelivered.length !== 1 ? "s" : ""} aujourd&apos;hui</p>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
            <Truck className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{activeDeliveries.length}</p>
            <p className="text-[9px] text-gray-400">En cours</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-center">
            <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{deliveredOrders.length}</p>
            <p className="text-[9px] text-gray-400">Livr\u00e9es</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center">
            <Package className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{pendingOrders.length}</p>
            <p className="text-[9px] text-gray-400">Dispo.</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2.5 text-center">
            <Wallet className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{totalRevenue >= 1000 ? `${(totalRevenue / 1000).toFixed(0)}k` : totalRevenue}</p>
            <p className="text-[9px] text-gray-400">Total F</p>
          </div>
        </div>

        {/* Alerte nouvelle commande */}
        {newOrderAlert && (
          <div className="bg-green-600/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-3 animate-pulse">
            <Bell className="w-5 h-5 text-green-400" />
            <p className="text-sm text-green-400 font-medium">Nouvelle commande disponible !</p>
          </div>
        )}

        {/* Livraisons actives */}
        {activeDeliveries.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-400" />
              Mes livraisons en cours
              <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] rounded-full font-bold">{activeDeliveries.length}</span>
            </h2>
            <div className="space-y-2">
              {activeDeliveries.map((order) => {
                const status = statusLabels[order.delivery?.status] || statusLabels.PICKING_UP;
                return (
                  <div key={order.id}
                    className={`bg-gray-900 border rounded-xl p-4 space-y-3 ${status.bg}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{order.client?.name || "Client"}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress || "Non renseign\u00e9"}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-400">{order.totalAmount?.toLocaleString()} F</span>
                    </div>

                    {/* Items */}
                    <div className="bg-gray-800/50 rounded-lg p-2 space-y-0.5">
                      {order.items?.slice(0, 3).map((i: any) => (
                        <p key={i.id} className="text-[10px] text-gray-300 truncate">
                          <span className="text-white font-medium">{i.quantity}x</span> {i.product?.name}
                        </p>
                      ))}
                      {(order.items?.length || 0) > 3 && (
                        <p className="text-[10px] text-gray-500">+{order.items.length - 3} autre(s)</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
                        {status.text}
                      </span>
                      <div className="flex items-center gap-2">
                        {order.client?.phone && (
                          <a href={`tel:${order.client.phone}`}
                            className="p-2 bg-green-600/20 rounded-lg text-green-400 hover:bg-green-600/30 transition-colors">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Commandes disponibles */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            Commandes disponibles
            {pendingOrders.length > 0 && (
              <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] rounded-full font-bold">{pendingOrders.length}</span>
            )}
          </h2>
          {pendingOrders.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">Aucune commande en attente</p>
              <p className="text-gray-600 text-xs mt-1">Les nouvelles commandes apparaissent automatiquement</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingOrders.map((order) => (
                <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-green-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{order.client?.name || "Client"}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {order.deliveryAddress || "Adresse non renseign\u00e9e"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-400">{order.totalAmount?.toLocaleString()} F</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {order.items?.map((i: any) => (
                      <span key={i.id || i.productId} className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                        {i.quantity}x {i.product?.name || i.name}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => acceptOrder(order.id)} disabled={accepting === order.id}
                    className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/10">
                    {accepting === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Accepter la livraison
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique */}
        {deliveredOrders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Historique
              <span className="text-xs text-gray-500 font-normal ml-auto">{deliveredOrders.length} livraisons</span>
            </h2>
            <div className="space-y-1.5">
              {deliveredOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white">{order.client?.name || "Client"}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(order.delivery?.endTime || order.updatedAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-400">{order.totalAmount?.toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom refresh */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/50 p-3 flex justify-center">
        <button onClick={loadData}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-600/20">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <Toaster position="top-center" theme="dark" richColors />
    </div>
  );
}

/* ---------- Main wrapper ---------- */
function DriverApp() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) return <DriverLogin />;

  return <DriverDashboard />;
}

export default function DriverPage() {
  return (
    <SessionProvider>
      <DriverApp />
    </SessionProvider>
  );
}
