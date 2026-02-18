"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2, CheckCircle, Truck, MapPin, Clock, User, Navigation, Ruler, Gauge, ArrowLeft, X, XCircle, Phone, Star,
  ChevronUp, ChevronDown, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/ui/star-rating";
import { ChatButton } from "@/components/chat/chat-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useCall } from "@/hooks/use-call";
import { CallOverlay } from "@/components/call/call-overlay";
import { useChat } from "@/hooks/use-chat";

const DriverMap = dynamic(() => import("@/components/map/delivery-track-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  ),
});

const cancelReasons = [
  "Client injoignable",
  "Adresse introuvable",
  "Produit indisponible",
  "Problème de véhicule",
  "Autre",
];

function fmt(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${m}min` : `${m} min`;
}

export default function DriverDeliveryDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState(0);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeTime, setRouteTime] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [altRoutes, setAltRoutes] = useState<[number, number][][]>([]);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const watchRef = useRef<number | null>(null);
  const sendRef = useRef<any>(null);
  const myPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const speedRef = useRef(0);
  const routeThrottle = useRef<any>(null);

  // Chat
  const chatEnabled = !!delivery && !["DELIVERED", "CANCELLED"].includes(delivery?.status || "");
  const chatOrderId = delivery?.orderId || "";
  const {
    messages: chatMessages, loading: chatLoading, sending: chatSending,
    typingUser, hasMore: chatHasMore, sendMessage: chatSendMessage,
    markAsRead: chatMarkAsRead, loadMore: chatLoadMore,
    emitTyping: chatEmitTyping, stopTyping: chatStopTyping,
    unreadCount: chatUnread, editMessage: chatEditMessage, deleteMessage: chatDeleteMessage, socket, isOtherOnline, chatEnabled: hookChatEnabled,
  } = useChat({ orderId: chatOrderId, enabled: !!delivery?.orderId });

  // Appel VoIP WebRTC
  const {
    callState, remoteName: callRemoteName, callerLabel: callCallerLabel, callDuration,
    isMuted, isSpeaker, initiateCall, acceptCall, endCall,
    toggleMute, toggleSpeaker,
  } = useCall({
    orderId: chatOrderId,
    socket,
    myName: delivery?.driver?.name || "Livreur",
    myRole: "DRIVER",
    enabled: !!delivery?.orderId,
  });

  useEffect(() => {
    fetchDelivery();
  }, [id]);

  async function fetchDelivery() {
    try {
      const res = await fetch(`/api/deliveries/${id}`);
      if (!res.ok) {
        router.push("/livraison/order");
        return;
      }
      const data = await res.json();
      setDelivery(data);
    } catch {
      router.push("/livraison/order");
    } finally {
      setLoading(false);
    }
  }

  const calcRoute = useCallback(
    (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      if (routeThrottle.current) clearTimeout(routeThrottle.current);
      routeThrottle.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&alternatives=3`
          );
          const data = await res.json();
          if (data.routes?.length) {
            const sorted = [...data.routes].sort((a: any, b: any) => a.distance - b.distance);
            const shortest = sorted[0];
            setRouteDistance(shortest.distance);
            setRouteTime(shortest.duration);
            const coords: [number, number][] = shortest.geometry?.coordinates?.map((c: number[]) => [c[1], c[0]]) || [];
            setRouteCoords(coords);
            const alts = sorted.slice(1).map((r: any) =>
              (r.geometry?.coordinates?.map((c: number[]) => [c[1], c[0]]) || []) as [number, number][]
            );
            setAltRoutes(alts);
          }
        } catch {}
      }, 5000);
    },
    []
  );

  // GPS tracking
  useEffect(() => {
    if (!delivery || delivery.status === "DELIVERED" || delivery.status === "CANCELLED") return;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPos(p);
        myPosRef.current = p;
      },
      () => {},
      { enableHighAccuracy: true }
    );

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords.accuracy > 2) return;
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPos(p);
        myPosRef.current = p;
        const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        setSpeed(spd);
        speedRef.current = spd;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    sendRef.current = setInterval(async () => {
      const pos = myPosRef.current;
      if (!pos) return;
      await fetch(`/api/deliveries/${id}/position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, speed: speedRef.current }),
      });
    }, 5000);

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      if (sendRef.current) {
        clearInterval(sendRef.current);
        sendRef.current = null;
      }
    };
  }, [delivery?.id, delivery?.status]);

  useEffect(() => {
    if (!myPos || !delivery?.order) return;
    calcRoute(myPos, { lat: delivery.order.deliveryLat, lng: delivery.order.deliveryLng });
  }, [myPos?.lat, myPos?.lng, delivery?.order?.id]);

  async function updateStatus(status: string) {
    const estMin = routeTime ? Math.round(routeTime / 60) : undefined;
    await fetch(`/api/deliveries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        currentLat: myPos?.lat,
        currentLng: myPos?.lng,
        estimatedMinutes: status === "DELIVERING" ? estMin : undefined,
      }),
    });

    if (status === "DELIVERED") {
      router.push("/livraison/order");
    } else {
      await fetchDelivery();
    }
  }

  function canCancel() {
    if (!delivery) return false;
    if (delivery.status === "DELIVERED" || delivery.status === "CANCELLED") return false;
    return true;
  }

  async function cancelOrder() {
    if (!delivery?.order?.id) return;
    if (!cancelReason) {
      setCancelError("Veuillez sélectionner une raison");
      return;
    }
    if (cancelReason === "Autre" && !customReason.trim()) {
      setCancelError("Veuillez préciser la raison");
      return;
    }
    setCancelling(true);
    setCancelError("");
    const reason = cancelReason === "Autre" ? customReason : cancelReason;
    const res = await fetch(`/api/orders/${delivery.order.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setShowCancel(false);
      router.push("/livraison/order");
    } else {
      const data = await res.json();
      setCancelError(data.error || "Erreur lors de l'annulation");
    }
    setCancelling(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!delivery) return null;

  const order = delivery.order;
  const clientPos = order ? { lat: order.deliveryLat, lng: order.deliveryLng } : null;
  const elapsed = delivery.startTime
    ? Math.round((Date.now() - new Date(delivery.startTime).getTime()) / 60000)
    : 0;

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* ========== CARTE PLEIN ECRAN ========== */}
      {clientPos && (
        <div className="absolute inset-0">
          <DriverMap
            driverPos={myPos}
            clientPos={clientPos}
            positions={delivery.positions || []}
            routeCoords={routeCoords}
            altRoutes={altRoutes}
            speed={speed}
            driverLabel="Ma position"
            clientLabel="Le client"
          />
        </div>
      )}

      {/* ========== HEADER FLOTTANT ========== */}
      <div className="absolute top-0 left-0 right-0 z-[1000]">
        <div className="flex items-center gap-2 px-3 py-2 pt-3">
          <button
            onClick={() => router.push("/livraison/order")}
            className="w-10 h-10 bg-gray-900/70 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center text-white hover:bg-gray-900/90 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 bg-gray-900/70 backdrop-blur-md rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-white flex-1">
              En route
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {elapsed} min
            </span>
          </div>
        </div>

        {/* Stats flottantes */}
        <div className="flex gap-2 px-3 mt-2">
          <div className="bg-gray-900/70 backdrop-blur-md rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-semibold text-white">{speed} km/h</span>
          </div>
          {routeDistance != null && (
            <div className="bg-gray-900/70 backdrop-blur-md rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-semibold text-white">{fmt(routeDistance)}</span>
            </div>
          )}
          {routeTime != null && (
            <div className="bg-gray-900/70 backdrop-blur-md rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-white">{fmtTime(routeTime)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ========== APPEL VoIP ========== */}
      <CallOverlay
        callState={callState}
        remoteName={callRemoteName}
        callerLabel={callCallerLabel}
        duration={callDuration}
        isMuted={isMuted}
        isSpeaker={isSpeaker}
        onAccept={acceptCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
      />

      {/* ========== CHAT ========== */}
      {delivery && (
        <>
          {!chatOpen && hookChatEnabled !== false && (
            <ChatButton
              onClick={() => setChatOpen(true)}
              unreadCount={chatUnread}
              disabled={!chatEnabled}
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
            currentSender="DRIVER"
            onSend={chatSendMessage}
              onEdit={chatEditMessage}
              onDelete={chatDeleteMessage}
              chatEnabled={hookChatEnabled}
            onMarkRead={chatMarkAsRead}
            onLoadMore={chatLoadMore}
            onTyping={() => chatEmitTyping(delivery?.driver?.name || "Livreur", "DRIVER")}
            onStopTyping={chatStopTyping}
            disabled={!chatEnabled}
            otherPartyName={order?.client?.name ? `${order.client.name} (${order.client.phone || ""})` : order?.guestName ? `${order.guestName} (${order.guestPhone || ""})` : order?.guestPhone || "Client"}
            orderNumber={order?.orderNumber}
            onCall={initiateCall}
            callDisabled={callState !== "idle" || !chatEnabled}
            isOtherOnline={isOtherOnline}
          />
        </>
      )}

      {/* ========== BOTTOM SHEET ========== */}
      <div
        className={cn(
          "absolute left-0 right-0 z-[1000] transition-all duration-300 ease-out",
          sheetExpanded ? "top-28 bottom-0" : "bottom-0"
        )}
      >
        <div className={cn(
          "bg-gray-900/95 backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.4)] flex flex-col rounded-t-3xl border-t border-gray-700/30",
          sheetExpanded && "h-full"
        )}>
          {/* Client info + toggle */}
          <button
            onClick={() => setSheetExpanded(!sheetExpanded)}
            className="w-full px-4 pt-3 pb-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm text-white font-medium truncate">{order?.client?.name || order?.guestName || "Client"}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" /> {order?.deliveryAddress}
              </p>
            </div>
            <div className="shrink-0 w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center">
              {sheetExpanded ? <ChevronDown className="w-4 h-4 text-orange-400" /> : <ChevronUp className="w-4 h-4 text-orange-400" />}
            </div>
          </button>

          {/* Boutons d'action (toujours visibles) */}
          <div className="px-4 pb-3 flex gap-2">
            {delivery.status === "DELIVERING" && (
              <button
                onClick={() => updateStatus("DELIVERED")}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <CheckCircle className="w-4 h-4" /> Marquer comme livrée
              </button>
            )}
            {(order?.client?.phone || order?.guestPhone) && (
              <a
                href={`tel:${order?.client?.phone || order?.guestPhone}`}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl flex items-center justify-center transition-all shadow-lg shrink-0"
              >
                <Phone className="w-5 h-5 text-white" />
              </a>
            )}
          </div>

          {/* Contenu détaillé (expanded) */}
          {sheetExpanded && (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 border-t border-gray-700/50">
              <div className="space-y-3 pt-3">
                {/* Articles */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" /> Articles
                  </h3>
                  <div className="space-y-1.5">
                    {order?.items?.map((i: any) => (
                      <div key={i.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{i.quantity}x {i.product?.name}</span>
                        <span className="text-gray-400">{i.price?.toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note du client */}
                {order?.rating && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-2">
                    <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> Note du client
                    </h3>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Livraison</p>
                        <StarRating value={order.rating.driverRating} size="sm" showValue />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Repas</p>
                        <StarRating value={order.rating.mealRating} size="sm" showValue />
                      </div>
                    </div>
                    {order.rating.driverComment && (
                      <p className="text-xs text-gray-300 italic">&quot;{order.rating.driverComment}&quot;</p>
                    )}
                  </div>
                )}

                {/* Contact client */}
                {order?.guestPhone && !order?.client && (
                  <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                    <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">Téléphone client</p>
                      <p className="text-sm text-white font-medium">{order.guestPhone}</p>
                    </div>
                    <a href={`tel:${order.guestPhone}`} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg">
                      Appeler
                    </a>
                  </div>
                )}

                {/* Annuler */}
                {canCancel() && (
                  <div>
                    {!showCancel ? (
                      <button onClick={() => { setShowCancel(true); setCancelReason(""); setCustomReason(""); setCancelError(""); }}
                        className="w-full py-3 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                        <X className="w-4 h-4" /> Annuler la livraison
                      </button>
                    ) : (
                      <div className="bg-gray-800/50 border border-red-500/30 rounded-xl p-4 space-y-3">
                        <p className="text-sm text-white font-medium">Confirmer l&apos;annulation ?</p>
                        <select
                          value={cancelReason}
                          onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
                          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500"
                        >
                          <option value="">Sélectionnez une raison</option>
                          {cancelReasons.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {cancelReason === "Autre" && (
                          <textarea
                            value={customReason}
                            onChange={(e) => { setCustomReason(e.target.value); setCancelError(""); }}
                            placeholder="Preciser la raison..."
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500 resize-none"
                          />
                        )}
                        {cancelError && <p className="text-xs text-red-400">{cancelError}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => setShowCancel(false)}
                            className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium">
                            Non, continuer
                          </button>
                          <button onClick={cancelOrder} disabled={cancelling}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                            {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Oui, annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
