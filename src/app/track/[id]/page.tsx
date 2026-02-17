"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Loader2, ShoppingBag, Clock, CheckCircle, Truck, XCircle,
  MapPin, ArrowLeft, Phone, User, RefreshCw, Wifi,
  ClipboardList, LogIn, X, Ruler, Gauge, ChefHat, CreditCard,
  ChevronUp, ChevronDown, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { StarRating } from "@/components/ui/star-rating";
import { toast } from "sonner";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { getCachedSettings } from "@/lib/settings-cache";
import { playSound } from "@/lib/sounds";
import { ChatButton } from "@/components/chat/chat-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";

const GuestMap = dynamic(() => import("@/components/map/guest-track-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-900"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>,
});

const statusConfig: Record<string, { label: string; color: string; icon: any; step: number }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400", icon: Clock, step: 0 },
  ACCEPTED: { label: "En cuisine", color: "bg-orange-500/20 text-orange-400", icon: ChefHat, step: 2 },
  PREPARING: { label: "En cuisine", color: "bg-orange-500/20 text-orange-400", icon: ChefHat, step: 2 },
  READY: { label: "Prête", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle, step: 3 },
  PICKED_UP: { label: "Récupérée", color: "bg-orange-500/20 text-orange-400", icon: ShoppingBag, step: 4 },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400", icon: Truck, step: 5 },
  DELIVERED: { label: "Livrée", color: "bg-green-500/20 text-green-400", icon: CheckCircle, step: 6 },
  CANCELLED: { label: "Annulée", color: "bg-red-500/20 text-red-400", icon: XCircle, step: -1 },
};

const progressSteps = [
  { label: "Commande plac\u00e9e", key: "PENDING" },
  { label: "Paiement confirm\u00e9", key: "PAYMENT" },
  { label: "En cuisine", key: "PREPARING" },
  { label: "Pr\u00eate", key: "READY" },
  { label: "R\u00e9cup\u00e9r\u00e9e", key: "PICKED_UP" },
  { label: "En livraison", key: "DELIVERING" },
  { label: "Livr\u00e9e", key: "DELIVERED" },
];

const cancelReasons = [
  "Changement d'avis",
  "Délai trop long",
  "Commande en double",
  "Adresse incorrecte",
  "Autre",
];

function fmtDist(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`; }
function fmtTime(s: number) { const min = Math.ceil(s / 60); return min >= 60 ? `${Math.floor(min / 60)}h${min % 60}min` : `${min} min`; }

// Countdown cuisson
function CookingCountdown({ cookAcceptedAt, cookingTimeMin }: { cookAcceptedAt: string; cookingTimeMin: number }) {
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalMs = cookingTimeMin * 60 * 1000;
    const update = () => {
      const elapsed = Date.now() - new Date(cookAcceptedAt).getTime();
      const rem = Math.max(0, totalMs - elapsed);
      setRemaining(Math.ceil(rem / 1000));
      setProgress(Math.min(100, (elapsed / totalMs) * 100));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cookAcceptedAt, cookingTimeMin]);

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const isOverdue = remaining === 0;

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden",
      isOverdue ? "border-red-400/40 bg-red-500/10" : "border-orange-400/40 bg-orange-500/10"
    )}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isOverdue ? "bg-red-500/15" : "bg-orange-500/15"
          )}>
            <ChefHat className={cn("w-5 h-5", isOverdue ? "text-red-400" : "text-orange-400")} />
          </div>
          <div>
            <p className={cn("text-sm font-semibold", isOverdue ? "text-red-300" : "text-orange-300")}>
              {isOverdue ? "Presque prêt !" : "Préparation en cours"}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Durée estimée : ~{cookingTimeMin} min</p>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums",
          isOverdue ? "bg-red-500/15 text-red-400 animate-pulse" : "bg-orange-500/15 text-orange-300"
        )}>
          {isOverdue ? "00:00" : `${min}:${sec.toString().padStart(2, "0")}`}
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className={cn("w-full rounded-full h-1.5", isOverdue ? "bg-red-500/10" : "bg-orange-500/10")}>
          <div
            className={cn("h-1.5 rounded-full transition-all duration-1000",
              isOverdue ? "bg-red-400" : progress > 75 ? "bg-yellow-400" : "bg-orange-400"
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400">
          {isOverdue
            ? "Votre repas devrait être prêt d'un instant à l'autre"
            : `Votre repas est en préparation — ${Math.round(progress)}%`
          }
        </p>
      </div>
    </div>
  );
}

export default function TrackDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeTime, setRouteTime] = useState<number | null>(null);
  const [driverSpeed, setDriverSpeed] = useState<number | null>(null);
  const routeThrottle = useRef(0);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [brandColor, setBrandColor] = useState("#ea580c");
  const [chatOpen, setChatOpen] = useState(false);

  // Notation
  const [driverRating, setDriverRating] = useState(0);
  const [mealRating, setMealRating] = useState(0);
  const [driverComment, setDriverComment] = useState("");
  const [mealComment, setMealComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Chat
  const chatEnabled = !!order?.delivery && !["DELIVERED", "CANCELLED"].includes(order?.status || "");
  const {
    messages: chatMessages, loading: chatLoading, sending: chatSending,
    typingUser, hasMore: chatHasMore, sendMessage: chatSendMessage,
    markAsRead: chatMarkAsRead, loadMore: chatLoadMore,
    emitTyping: chatEmitTyping, stopTyping: chatStopTyping,
    unreadCount: chatUnread, setUnreadCount: setChatUnread,
  } = useChat({ orderId: id as string, enabled: !!order?.delivery });

  const loadOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/track/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
      setLoading(false);
      return data;
    }
    setLoading(false);
    return null;
  }, [id]);

  useEffect(() => {
    loadOrder();
    getCachedSettings().then(s => {
      setDeliveryFee(s?.deliveryFee || 0);
      if (s?.buttonColor) setBrandColor(s.buttonColor);
      if (s?.restaurantName) document.title = s.restaurantName;
    });
    // Polling de secours (moins fréquent car Socket.IO gère le temps réel)
    const interval = setInterval(loadOrder, 15000);
    return () => clearInterval(interval);
  }, [loadOrder]);

  // ─── Socket.IO temps réel ───
  const prevStatusRef = useRef<string | null>(null);

  useDeliverySocket({
    orderId: id as string,
    // Position du livreur en temps réel
    onPosition: useCallback((data: any) => {
      setOrder((prev: any) => {
        if (!prev) return prev;
        // Mettre à jour la position dans l'ordre
        const newPos = { latitude: data.latitude, longitude: data.longitude, speed: data.speed, timestamp: data.timestamp };
        const positions = prev.delivery?.positions ? [newPos, ...prev.delivery.positions.slice(0, 49)] : [newPos];
        return {
          ...prev,
          delivery: { ...prev.delivery, positions, currentLat: data.latitude, currentLng: data.longitude },
        };
      });
      if (data.speed != null) setDriverSpeed(data.speed * 3.6);
    }, []),
    // Cuisinier accepte la commande
    onCookAccepted: useCallback((data: any) => {
      playSound("cook-accepted");
      setOrder((prev: any) => prev ? {
        ...prev,
        status: "PREPARING",
        cookAcceptedAt: data.cookAcceptedAt,
      } : prev);
    }, []),
    // Commande prête (cuisine terminée)
    onOrderReady: useCallback(() => {
      playSound("order-ready");
      setOrder((prev: any) => prev ? { ...prev, status: "READY" } : prev);
    }, []),
    // Statut livraison change (DELIVERING, DELIVERED, etc.)
    onStatusChange: useCallback((data: any) => {
      const newStatus = data.status;
      if (newStatus === "DELIVERING") {
        playSound("picked-up");
      } else if (newStatus === "DELIVERED") {
        playSound("delivered");
      }
      // Rafraîchir les données complètes
      loadOrder();
    }, [loadOrder]),
  });

  const calcRoute = useCallback(async (from: { lat: number; lng: number }, to: { lat: number; lng: number }, force = false) => {
    const now = Date.now();
    if (!force && now - routeThrottle.current < 5000) return;
    routeThrottle.current = now;
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.routes?.length) {
        setRouteDistance(data.routes[0].distance);
        setRouteTime(data.routes[0].duration);
      }
    } catch {}
  }, []);

  const forceRefresh = useCallback(async () => {
    setRefreshing(true);
    const data = await loadOrder();
    if (data) {
      const lp = data.delivery?.positions?.[0];
      if (lp && ["PICKED_UP", "DELIVERING"].includes(data.status)) {
        await calcRoute({ lat: lp.latitude, lng: lp.longitude }, { lat: data.deliveryLat, lng: data.deliveryLng }, true);
      }
    }
    setTimeout(() => setRefreshing(false), 600);
  }, [loadOrder, calcRoute]);

  useEffect(() => {
    if (!order) return;
    const lastPos = order.delivery?.positions?.[0];
    if (!lastPos) return;
    if (lastPos.speed != null) setDriverSpeed(lastPos.speed * 3.6);
    if (["PICKED_UP", "DELIVERING"].includes(order.status)) {
      calcRoute({ lat: lastPos.latitude, lng: lastPos.longitude }, { lat: order.deliveryLat, lng: order.deliveryLng });
    }
  }, [order?.delivery?.positions?.[0]?.latitude, order?.status, calcRoute]);

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
    if (res.ok) { setShowCancel(false); setCancelReason(""); setCustomReason(""); loadOrder(); }
    else { const data = await res.json().catch(() => ({})); setCancelError(data.error || "Erreur"); }
    setCancelling(false);
  }

  function canCancel() {
    if (!order) return false;
    // Client peut annuler uniquement si PENDING et paiement en especes
    return order.status === "PENDING" && order.paymentMethod === "CASH";
  }

  async function submitRating() {
    if (!order || driverRating === 0 || mealRating === 0) {
      toast.error("Veuillez noter le livreur et le repas");
      return;
    }
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverRating,
          mealRating,
          driverComment: driverComment.trim() || undefined,
          mealComment: mealComment.trim() || undefined,
          guestPhone: order.guestPhone || undefined,
        }),
      });
      if (res.ok) {
        setRatingSubmitted(true);
        toast.success("Merci pour votre avis !");
        loadOrder();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de l'envoi");
      }
    } catch {
      toast.error("Erreur réseau");
    }
    setSubmittingRating(false);
  }

  if (loading) return <div className="h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!order) return (
    <div className="h-screen bg-gray-950 flex flex-col items-center justify-center text-white px-4">
      <ShoppingBag className="w-16 h-16 text-gray-700 mb-4" />
      <p className="text-gray-400 text-center">Commande introuvable</p>
      <Link href="/track" className="mt-4 text-orange-400 text-sm hover:underline">Retour</Link>
    </div>
  );

  const st = statusConfig[order.status] || statusConfig.PENDING;
  let currentStep = st.step;
  // For ONLINE orders: payment confirmation is step 1
  if (order.paymentMethod === "ONLINE" && !order.paymentConfirmed && currentStep >= 1) {
    currentStep = 0; // Stay at step 0 until payment confirmed
  } else if (order.paymentMethod === "ONLINE" && order.paymentConfirmed && currentStep === 0) {
    currentStep = 1; // Payment confirmed but not yet in kitchen
  }
  const StIcon = st.icon;
  const driverName = order.delivery?.driver?.name;
  const driverPhone = order.delivery?.driver?.phone;
  const lastPos = order.delivery?.positions?.[0];
  const driverPos = lastPos ? { lat: lastPos.latitude, lng: lastPos.longitude } : null;
  const clientPos = { lat: order.deliveryLat, lng: order.deliveryLng };
  const isActive = ["PICKED_UP", "DELIVERING"].includes(order.status);
  const isCooking = ["ACCEPTED", "PREPARING"].includes(order.status);
  const isReady = order.status === "READY";
  const maxCookTime = Math.max(...(order.items?.map((i: any) => i.product?.cookingTimeMin ?? 15) || [15]));

  // Texte résumé pour le sheet réduit
  function getStatusText() {
    if (isCooking) return "Votre repas est en préparation";
    if (isReady) return "Votre repas est prêt !";
    if (order.status === "DELIVERING" && driverName) return `${driverName} est en route`;
    if (order.status === "PENDING") return "En attente du cuisinier...";
    if (order.status === "DELIVERED") return "Commande livrée !";
    if (order.status === "CANCELLED") return "Commande annulée";
    return st.label;
  }

  return (
    <div className="h-screen w-full relative overflow-hidden brand-theme" style={{ "--brand": brandColor } as React.CSSProperties}>
      {/* ========== CARTE PLEIN ECRAN ========== */}
      <div className="absolute inset-0">
        <GuestMap
          driverPos={driverPos}
          clientPos={clientPos}
          positions={order.delivery?.positions || []}
          driverLabel={driverName || "Le livreur"}
          driverPhone={driverPhone}
          clientLabel="Livraison"
        />
      </div>

      {/* ========== HEADER FLOTTANT ========== */}
      <div className="absolute top-0 left-0 right-0 z-[1000]">
        <div className="flex items-center gap-2 px-3 py-2 pt-3">
          <Link href="/track" className="w-10 h-10 bg-white/70 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:bg-white/90 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 bg-white/70 backdrop-blur-md rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 flex-1">{order.orderNumber || "#" + (order.id as string).slice(-6)}</span>
            {(isActive || isCooking) && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
                <Wifi className="w-3 h-3 text-green-500 animate-pulse" />
                <span className="text-[10px] text-green-600 font-medium">En direct</span>
              </div>
            )}
          </div>
          <button onClick={forceRefresh} disabled={refreshing} className="w-10 h-10 bg-white/70 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:bg-white/90 active:scale-95 transition-all">
            <RefreshCw className={cn("w-4 h-4 transition-transform", refreshing && "animate-spin")} />
          </button>
        </div>

        {/* Stats OSRM flottantes */}
        {isActive && (routeTime != null || routeDistance != null) && (
          <div className="flex gap-2 px-3 mt-2">
            {routeTime != null && (
              <div className="bg-white/70 backdrop-blur-md rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-semibold text-gray-800">{fmtTime(routeTime)}</span>
              </div>
            )}
            {routeDistance != null && (
              <div className="bg-white/70 backdrop-blur-md rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-semibold text-gray-800">{fmtDist(routeDistance)}</span>
              </div>
            )}
            {driverSpeed != null && (
              <div className="bg-white/70 backdrop-blur-md rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs font-semibold text-gray-800">{Math.round(driverSpeed)} km/h</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========== BOTTOM SHEET ========== */}
      <div
        className={cn(
          "absolute left-0 right-0 z-[1000] transition-all duration-300 ease-out",
          sheetExpanded ? "top-14 bottom-0" : "bottom-[3.5rem]"
        )}
      >
        <div className={cn(
          "bg-white/75 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex flex-col",
          sheetExpanded ? "h-full rounded-t-2xl" : "rounded-t-2xl"
        )}>
          {/* Poignée + résumé statut (toujours visible) */}
          <div className="shrink-0">
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Statut compact + toggle */}
            <button
              onClick={() => setSheetExpanded(!sheetExpanded)}
              className="w-full px-4 pb-2.5 flex items-center gap-3"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", st.color.split(" ")[0])}>
                <StIcon className={cn("w-5 h-5", st.color.split(" ")[1])} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-900">{st.label}</p>
                <p className="text-xs text-gray-500 truncate">{getStatusText()}</p>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                {sheetExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-500" />}
              </div>
            </button>

            {/* Livreur info rapide (toujours visible quand livraison active) */}
            {isActive && driverName && (
              <div className="px-4 pb-2.5 border-t border-gray-100 pt-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 font-medium">Le livreur</p>
                    <p className="text-sm font-semibold text-gray-900">{driverName}</p>
                  </div>
                  {driverPhone && (
                    <a href={`tel:${driverPhone}`} className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 active:scale-95 rounded-xl text-white text-xs font-semibold transition-all shadow-sm">
                      <Phone className="w-3.5 h-3.5" />
                      Appeler
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Résumé prix compact (visible quand réduit) */}
            {!sheetExpanded && (
              <div className="px-4 pb-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{order.items?.length || 0} repas</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-600">{((order.totalAmount || 0) + deliveryFee).toLocaleString()} FCFA</p>

                </div>
              </div>
            )}
          </div>

          {/* Contenu détaillé (scroll) — visible quand expanded */}
          {sheetExpanded && (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 border-t border-gray-100">
              <div className="space-y-4 pt-3">
                {/* Paiement badge */}
                {order.paymentMethod === "ONLINE" && (
                  <div className={cn("flex items-center gap-2 p-3 rounded-xl border",
                    order.paymentConfirmed
                      ? "bg-green-50 border-green-200"
                      : "bg-yellow-50 border-yellow-200"
                  )}>
                    <CreditCard className={cn("w-4 h-4", order.paymentConfirmed ? "text-green-500" : "text-yellow-500")} />
                    <span className={cn("text-xs font-medium", order.paymentConfirmed ? "text-green-700" : "text-yellow-700")}>
                      {order.paymentConfirmed ? "Paiement confirmé par le restaurant" : "En attente de confirmation du paiement"}
                    </span>
                  </div>
                )}

                {/* Countdown cuisson */}
                {isCooking && order.cookAcceptedAt && (
                  <CookingCountdown cookAcceptedAt={order.cookAcceptedAt} cookingTimeMin={maxCookTime} />
                )}

                {/* Commande prête */}
                {isReady && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Votre repas est prêt !</p>
                      <p className="text-xs text-emerald-600/70">En attente d&apos;un livreur</p>
                    </div>
                  </div>
                )}

                {/* Progression */}
                {currentStep >= 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Progression</h3>
                    <div className="space-y-0">
                      {progressSteps.filter((step) => step.key !== "PAYMENT" || order.paymentMethod === "ONLINE").map((step, i) => {
                        const done = currentStep >= i;
                        const isCurrent = currentStep === i;
                        return (
                          <div key={step.key} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={cn("w-3 h-3 rounded-full border-2 shrink-0",
                                done ? "bg-orange-500 border-orange-500" : "bg-transparent border-gray-300",
                                isCurrent && "ring-4 ring-orange-500/20")} />
                              {i < progressSteps.length - 1 && <div className={cn("w-0.5 h-7", done ? "bg-orange-500/40" : "bg-gray-200")} />}
                            </div>
                            <p className={cn("text-sm -mt-0.5", done ? "text-gray-900 font-medium" : "text-gray-400")}>{step.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Détails commande */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Détails</h3>
                  <div className="space-y-1.5">
                    {order.items?.map((item: any) => {
                      const originalTotal = (item.product?.price || 0) * item.quantity;
                      const hasItemDiscount = originalTotal > item.price && item.price > 0;
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.quantity}x {item.product?.name}</span>
                          <span className="text-gray-800 font-medium">
                            {hasItemDiscount && (
                              <span className="text-gray-400 line-through text-xs mr-1.5">{originalTotal.toLocaleString()}</span>
                            )}
                            {item.price?.toLocaleString()} FCFA
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-gray-200 mt-2 pt-2 space-y-1.5">
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Frais de livraison</span>
                        <span>{deliveryFee.toLocaleString()} FCFA</span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-orange-600">{((order.totalAmount || 0) + deliveryFee).toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Adresse de livraison</p>
                    <p className="text-xs text-gray-500 mt-0.5">{order.deliveryAddress}</p>
                  </div>
                </div>

                {/* === NOTATION === */}
                {order.status === "DELIVERED" && !order.rating && !ratingSubmitted && (
                  <div className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-200">
                    <h3 className="text-sm font-bold text-gray-900 text-center">Donnez votre avis</h3>

                    {/* Note livreur */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Le livreur</span>
                      </div>
                      <div className="flex justify-center">
                        <StarRating value={driverRating} onChange={setDriverRating} size="lg" />
                      </div>
                      <textarea
                        value={driverComment}
                        onChange={(e) => setDriverComment(e.target.value)}
                        placeholder="Un commentaire sur la livraison ? (optionnel)"
                        rows={2}
                        maxLength={500}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-orange-400"
                      />
                    </div>

                    {/* Note repas */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ChefHat className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">Le repas</span>
                      </div>
                      <div className="flex justify-center">
                        <StarRating value={mealRating} onChange={setMealRating} size="lg" />
                      </div>
                      <textarea
                        value={mealComment}
                        onChange={(e) => setMealComment(e.target.value)}
                        placeholder="Un commentaire sur le repas ? (optionnel)"
                        rows={2}
                        maxLength={500}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:border-orange-400"
                      />
                    </div>

                    <button
                      onClick={submitRating}
                      disabled={submittingRating || driverRating === 0 || mealRating === 0}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {submittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                      Envoyer ma note
                    </button>
                  </div>
                )}

                {/* Note deja soumise */}
                {order.status === "DELIVERED" && (order.rating || ratingSubmitted) && (
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-200 text-center space-y-3">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                    <p className="text-sm font-semibold text-green-700">Merci pour votre avis !</p>
                    {order.rating && (
                      <div className="flex justify-center gap-6">
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500 mb-1">Livreur</p>
                          <StarRating value={order.rating.driverRating} size="sm" />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500 mb-1">Repas</p>
                          <StarRating value={order.rating.mealRating} size="sm" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Annuler */}
                {canCancel() && (
                  <div>
                    {!showCancel ? (
                      <button onClick={() => setShowCancel(true)}
                        className="w-full py-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                        <X className="w-4 h-4" /> Annuler la commande
                      </button>
                    ) : (
                      <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
                        <p className="text-sm text-gray-900 font-medium">Pourquoi annuler ?</p>
                        <select value={cancelReason} onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800">
                          <option value="">Choisir une raison...</option>
                          {cancelReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {cancelReason === "Autre" && (
                          <textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Décrivez la raison..." rows={2}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 resize-none" />
                        )}
                        {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => { setShowCancel(false); setCancelReason(""); setCustomReason(""); }}
                            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium">Non, garder</button>
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

                <p className="text-xs text-gray-400 text-center pb-2">{order.orderNumber && <span className="font-medium text-gray-300">{order.orderNumber} - </span>}Commande du {new Date(order.createdAt).toLocaleString("fr-FR")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== CHAT ========== */}
      {order?.delivery && (
        <>
          {!chatOpen && (
            <ChatButton
              onClick={() => setChatOpen(true)}
              unreadCount={chatUnread}
              disabled={["DELIVERED", "CANCELLED"].includes(order.status)}
            />
          )}
          <ChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            messages={chatMessages}
            loading={chatLoading}
            sending={chatSending}
            typingUser={typingUser}
            hasMore={chatHasMore}
            currentSender="CLIENT"
            onSend={chatSendMessage}
            onMarkRead={chatMarkAsRead}
            onLoadMore={chatLoadMore}
            onTyping={() => chatEmitTyping(order.guestName || order.client?.name || "Client", "CLIENT")}
            onStopTyping={chatStopTyping}
            disabled={!chatEnabled}
            otherPartyName={order.delivery?.driver?.name}
            otherPartyPhone={order.delivery?.driver?.phone}
            orderNumber={order.orderNumber}
          />
        </>
      )}

      {/* ========== NAV MOBILE ========== */}
      <nav className="fixed bottom-0 left-0 right-0 z-[999] lg:hidden">
        <div className="bg-white/70 backdrop-blur-xl border-t border-gray-200/50">
          <div className="flex items-center justify-around h-14 px-2">
            <Link href="/track" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              <span className="text-[10px] mt-0.5 font-medium text-orange-500">Commandes</span>
            </Link>
            <Link href="/" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <ShoppingBag className="w-5 h-5 text-gray-400 group-active:text-gray-600" />
              <span className="text-[10px] mt-0.5 font-medium text-gray-400">Commander</span>
            </Link>
            <Link href="/login" className="flex flex-col items-center justify-center flex-1 py-1 group">
              <LogIn className="w-5 h-5 text-gray-400 group-active:text-gray-600" />
              <span className="text-[10px] mt-0.5 font-medium text-gray-400">Connexion</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
