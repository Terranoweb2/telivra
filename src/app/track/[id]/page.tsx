"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Loader2, ShoppingBag, Clock, CheckCircle, Truck, XCircle,
  MapPin, ArrowLeft, Phone, User, RefreshCw, Navigation, Wifi,
  ClipboardList, LogIn, X, Ruler, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GuestMap = dynamic(() => import("@/components/map/guest-track-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-900 rounded-xl"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>,
});

const statusConfig: Record<string, { label: string; color: string; icon: any; step: number }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400", icon: Clock, step: 0 },
  ACCEPTED: { label: "Acceptee", color: "bg-blue-500/20 text-blue-400", icon: CheckCircle, step: 1 },
  PICKING_UP: { label: "Recuperation", color: "bg-orange-500/20 text-orange-400", icon: ShoppingBag, step: 2 },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400", icon: Truck, step: 3 },
  DELIVERED: { label: "Livree", color: "bg-green-500/20 text-green-400", icon: CheckCircle, step: 4 },
  CANCELLED: { label: "Annulee", color: "bg-red-500/20 text-red-400", icon: XCircle, step: -1 },
};

const steps = [
  { label: "Commande placee", key: "PENDING" },
  { label: "Acceptee", key: "ACCEPTED" },
  { label: "En recuperation", key: "PICKING_UP" },
  { label: "En livraison", key: "DELIVERING" },
  { label: "Livree", key: "DELIVERED" },
];

const cancelReasons = [
  "Changement d'avis",
  "Delai trop long",
  "Commande en double",
  "Adresse incorrecte",
  "Autre",
];

function fmtDist(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`; }
function fmtTime(s: number) { const min = Math.ceil(s / 60); return min >= 60 ? `${Math.floor(min / 60)}h${min % 60}min` : `${min} min`; }

export default function TrackDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cancel state
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // OSRM state
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeTime, setRouteTime] = useState<number | null>(null);
  const [driverSpeed, setDriverSpeed] = useState<number | null>(null);
  const routeThrottle = useRef(0);

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/track/${id}`);
    if (res.ok) setOrder(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 5000);
    return () => clearInterval(interval);
  }, [loadOrder]);

  // OSRM route calculation
  const calcRoute = useCallback(async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    const now = Date.now();
    if (now - routeThrottle.current < 10000) return;
    routeThrottle.current = now;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.routes?.[0]) {
        setRouteDistance(data.routes[0].distance);
        setRouteTime(data.routes[0].duration);
      }
    } catch {}
  }, []);

  // Recalculate route when driver moves
  useEffect(() => {
    if (!order) return;
    const lastPos = order.delivery?.positions?.[0];
    if (!lastPos) return;
    const driverPos = { lat: lastPos.latitude, lng: lastPos.longitude };
    const clientPos = { lat: order.deliveryLat, lng: order.deliveryLng };
    if (lastPos.speed != null) setDriverSpeed(lastPos.speed * 3.6);
    if (["ACCEPTED", "PICKING_UP", "DELIVERING"].includes(order.status)) {
      calcRoute(driverPos, clientPos);
    }
  }, [order?.delivery?.positions?.[0]?.latitude, order?.delivery?.positions?.[0]?.longitude, order?.status, calcRoute]);

  // Cancel
  async function handleCancel() {
    if (!order) return;
    const finalReason = cancelReason === "Autre" ? customReason.trim() : cancelReason;
    if (!finalReason) { setCancelError("Veuillez choisir une raison"); return; }
    setCancelling(true);
    setCancelError("");
    const res = await fetch(`/api/orders/${order.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: finalReason, guestPhone: order.guestPhone }),
    });
    if (res.ok) {
      setShowCancel(false);
      setCancelReason("");
      setCustomReason("");
      loadOrder();
    } else {
      const data = await res.json().catch(() => ({}));
      setCancelError(data.error || "Erreur lors de l'annulation");
    }
    setCancelling(false);
  }

  function canCancel() {
    if (!order) return false;
    if (order.status === "DELIVERED" || order.status === "CANCELLED") return false;
    if (order.status === "PENDING") return true;
    const acceptedAt = order.delivery?.startTime || order.updatedAt;
    const minutes = (Date.now() - new Date(acceptedAt).getTime()) / 60000;
    return minutes <= 5;
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

  if (!order) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
      <ShoppingBag className="w-16 h-16 text-gray-700 mb-4" />
      <p className="text-gray-400 text-center">Commande introuvable</p>
      <Link href="/track" className="mt-4 text-blue-400 text-sm hover:underline">Retour</Link>
    </div>
  );

  const st = statusConfig[order.status] || statusConfig.PENDING;
  const currentStep = st.step;
  const driverName = order.delivery?.driver?.name;
  const driverPhone = order.delivery?.driver?.phone;
  const lastPos = order.delivery?.positions?.[0];
  const driverPos = lastPos ? { lat: lastPos.latitude, lng: lastPos.longitude } : null;
  const clientPos = { lat: order.deliveryLat, lng: order.deliveryLng };
  const isActive = ["ACCEPTED", "PICKING_UP", "DELIVERING"].includes(order.status);
  const cancelMinutes = order.delivery?.startTime
    ? Math.max(0, Math.ceil(5 - (Date.now() - new Date(order.delivery.startTime).getTime()) / 60000))
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Link href="/track" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-semibold text-white flex-1">Commande #{(order.id as string).slice(-6)}</span>
          {isActive && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-600/20 rounded-full">
              <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-medium">En direct</span>
            </div>
          )}
          <button onClick={loadOrder} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        {/* Statut */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
          <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-2", st.color)}>
            <st.icon className="w-4 h-4" /> {st.label}
          </div>
          {order.status === "DELIVERING" && driverName && (
            <p className="text-sm text-gray-400"><Truck className="w-4 h-4 inline mr-1" /> {driverName} est en route</p>
          )}
          {order.status === "PENDING" && <p className="text-sm text-gray-400">Recherche d&apos;un livreur...</p>}
          {order.status === "DELIVERED" && <p className="text-sm text-green-400">Votre commande a ete livree !</p>}
          {order.status === "CANCELLED" && (
            <div>
              <p className="text-sm text-red-400">Cette commande a ete annulee</p>
              {order.cancelReason && <p className="text-xs text-gray-500 mt-1">Raison : {order.cancelReason}</p>}
            </div>
          )}
        </div>

        {/* Carte temps reel */}
        {isActive && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">Suivi en direct</span>
            </div>
            <div className="h-52 sm:h-72">
              <GuestMap
                driverPos={driverPos}
                clientPos={clientPos}
                positions={order.delivery?.positions || []}
                driverLabel="Le livreur"
                clientLabel="Ma position"
              />
            </div>
            {driverName && (
              <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-2 text-xs text-gray-500">
                <User className="w-3 h-3" /> {driverName}
                {driverPhone && (
                  <a href={`tel:${driverPhone}`} className="ml-2 text-green-400 hover:text-green-300"><Phone className="w-3 h-3 inline" /></a>
                )}
                {lastPos && <span className="ml-auto">Maj {new Date(lastPos.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
              </div>
            )}
          </div>
        )}

        {/* Stats OSRM */}
        {isActive && (routeTime != null || routeDistance != null || driverSpeed != null) && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Temps restant</p>
              <p className="text-sm font-semibold text-white">{routeTime != null ? fmtTime(routeTime) : "--"}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <Ruler className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Distance</p>
              <p className="text-sm font-semibold text-white">{routeDistance != null ? fmtDist(routeDistance) : "--"}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <Gauge className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Vitesse</p>
              <p className="text-sm font-semibold text-white">{driverSpeed != null ? `${Math.round(driverSpeed)} km/h` : "--"}</p>
            </div>
          </div>
        )}

        {/* Progression */}
        {currentStep >= 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Progression</h3>
            <div className="space-y-0">
              {steps.map((step, i) => {
                const done = currentStep >= i;
                const isCurrent = currentStep === i;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-3 h-3 rounded-full border-2 shrink-0",
                        done ? "bg-blue-500 border-blue-500" : "bg-transparent border-gray-700",
                        isCurrent && "ring-4 ring-blue-500/20")} />
                      {i < steps.length - 1 && <div className={cn("w-0.5 h-8", done ? "bg-blue-500/40" : "bg-gray-800")} />}
                    </div>
                    <p className={cn("text-sm -mt-0.5", done ? "text-white font-medium" : "text-gray-600")}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">Details</h3>
          <div className="space-y-1">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-400">{item.quantity}x {item.product?.name}</span>
                <span className="text-gray-300 font-medium">{item.price?.toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-bold text-white border-t border-gray-800 pt-2">
            <span>Total</span>
            <span className="text-blue-400">{order.totalAmount?.toLocaleString()} FCFA</span>
          </div>
        </div>

        {/* Adresse */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">Livraison</p>
            <p className="text-xs text-gray-500 mt-0.5">{order.deliveryAddress}</p>
          </div>
        </div>

        {/* Bouton annuler */}
        {canCancel() && (
          <div>
            {!showCancel ? (
              <button onClick={() => setShowCancel(true)}
                className="w-full py-3 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Annuler la commande
                {cancelMinutes !== null && cancelMinutes > 0 && (
                  <span className="text-xs text-red-400/60">({cancelMinutes} min restantes)</span>
                )}
              </button>
            ) : (
              <div className="bg-gray-900 border border-red-500/30 rounded-xl p-4 space-y-3">
                <p className="text-sm text-white font-medium">Pourquoi annuler ?</p>
                <select value={cancelReason} onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white">
                  <option value="">Choisir une raison...</option>
                  {cancelReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {cancelReason === "Autre" && (
                  <textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Decrivez la raison..." rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none" />
                )}
                {cancelError && <p className="text-xs text-red-400">{cancelError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setShowCancel(false); setCancelReason(""); setCustomReason(""); }}
                    className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium">
                    Non, garder
                  </button>
                  <button onClick={handleCancel} disabled={cancelling || !cancelReason}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-600 text-center">
          Commande du {new Date(order.createdAt).toLocaleString("fr-FR")}
        </p>
      </div>

      {/* Nav mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <div className="bg-gray-900/80 backdrop-blur-lg border-t border-gray-800/50">
          <div className="flex items-center justify-around h-16 px-2">
            <Link href="/track" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl bg-blue-600/15"><ClipboardList className="w-5 h-5 text-blue-400" /></div>
              <span className="text-[10px] mt-0.5 font-medium text-blue-400">Commandes</span>
            </Link>
            <Link href="/" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl"><ShoppingBag className="w-5 h-5 text-gray-500 group-active:text-gray-300" /></div>
              <span className="text-[10px] mt-0.5 font-medium text-gray-500">Commander</span>
            </Link>
            <Link href="/login" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <div className="p-2 rounded-2xl"><LogIn className="w-5 h-5 text-gray-500 group-active:text-gray-300" /></div>
              <span className="text-[10px] mt-0.5 font-medium text-gray-500">Connexion</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
