"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Loader2, ArrowLeft, Clock, CheckCircle, Truck, ShoppingBag, MapPin,
  User, Navigation, Ruler, Gauge, Wifi, ChefHat, Timer, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { ChatButton } from "@/components/chat/chat-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useCall } from "@/hooks/use-call";
import { CallOverlay } from "@/components/call/call-overlay";
import { useChat } from "@/hooks/use-chat";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";

const TrackMap = dynamic(() => import("@/components/map/delivery-track-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900 rounded-xl">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  ),
});

const statusSteps = [
  { key: "PENDING", label: "En attente", icon: Clock },
  { key: "PREPARING", label: "En cuisine", icon: ChefHat },
  { key: "READY", label: "Prête", icon: CheckCircle },
  { key: "PICKED_UP", label: "Récupérée", icon: ShoppingBag },
  { key: "DELIVERING", label: "En livraison", icon: Truck },
  { key: "DELIVERED", label: "Livrée", icon: CheckCircle },
];

function getStepIndex(status: string) {
  if (status === "ACCEPTED") return 1;
  const i = statusSteps.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

function fmt(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h${m}min` : `${m} min`;
}
function fmtHour(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Countdown cuisson
function CookingCountdown({
  cookAcceptedAt,
  cookingTimeMin,
}: {
  cookAcceptedAt: string;
  cookingTimeMin: number;
}) {
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
    <div className="bg-orange-600/10 border border-orange-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ChefHat className="w-5 h-5 text-orange-400" />
        <span className="text-sm font-semibold text-white">
          Preparation en cours
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer
            className={cn(
              "w-5 h-5",
              isOverdue ? "text-red-400" : "text-orange-400"
            )}
          />
          <span
            className={cn(
              "text-2xl font-bold",
              isOverdue ? "text-red-400" : "text-white"
            )}
          >
            {isOverdue
              ? "Bientôt prêt !"
              : `${min}:${sec.toString().padStart(2, "0")}`}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          ~{cookingTimeMin} min prevues
        </span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5">
        <div
          className={cn(
            "h-2.5 rounded-full transition-all duration-1000",
            isOverdue
              ? "bg-red-500"
              : progress > 75
                ? "bg-yellow-500"
                : "bg-orange-500"
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {isOverdue
          ? "Votre repas devrait être prêt d'un instant a l'autre"
          : "Votre repas est en préparation par notre cuisinier"}
      </p>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const orderId = id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [driverPos, setDriverPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeTime, setRouteTime] = useState<number | null>(null);
  const [driverSpeed, setDriverSpeed] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const routeThrottle = useRef<any>(null);

  const calcRoute = useCallback(
    (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      if (routeThrottle.current) clearTimeout(routeThrottle.current);
      routeThrottle.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
          );
          const data = await res.json();
          if (data.routes?.[0]) {
            setRouteDistance(data.routes[0].distance);
            setRouteTime(data.routes[0].duration);
          }
        } catch {}
      }, 3000);
    },
    []
  );

  // Chat admin
  const chatOrderId = orderId || "";
  const {
    messages: chatMessages, loading: chatLoading, sending: chatSending,
    typingUser, hasMore: chatHasMore, sendMessage: chatSendMessage,
    markAsRead: chatMarkAsRead, loadMore: chatLoadMore,
    emitTyping: chatEmitTyping, stopTyping: chatStopTyping,
    unreadCount: chatUnread, socket,
  } = useChat({ orderId: chatOrderId, enabled: !!order?.delivery });

  // Appel VoIP WebRTC
  const {
    callState, remoteName: callRemoteName, callDuration,
    isMuted, isSpeaker, initiateCall, acceptCall, endCall,
    toggleMute, toggleSpeaker,
  } = useCall({
    orderId: chatOrderId,
    socket,
    myName: "Admin",
    myRole: "ADMIN",
    enabled: true,
  });

  const loadOrderFn = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      setOrder(data);
      if (data.delivery?.currentLat && data.delivery?.currentLng) {
        setDriverPos({
          lat: data.delivery.currentLat,
          lng: data.delivery.currentLng,
        });
      }
      if (data.delivery?.positions) {
        setPositions(data.delivery.positions);
        const lastPos = data.delivery.positions[0];
        if (lastPos?.speed != null) setDriverSpeed(Math.round(lastPos.speed));
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [orderId]);

  useDeliverySocket({
    orderId,
    onPosition: useCallback(
      (data: any) => {
        const newPos = { lat: data.latitude, lng: data.longitude };
        setDriverPos(newPos);
        if (data.speed != null) setDriverSpeed(Math.round(data.speed));
        setLastUpdate(new Date());
        setPositions((prev) => [...prev, { ...data, id: Date.now() }]);
        if (order?.deliveryLat && order?.deliveryLng) {
          calcRoute(newPos, {
            lat: order.deliveryLat,
            lng: order.deliveryLng,
          });
        }
      },
      [order?.deliveryLat, order?.deliveryLng, calcRoute]
    ),
    onStatusChange: useCallback(() => {
      loadOrderFn();
    }, [loadOrderFn]),
    onAccepted: useCallback(() => {
      loadOrderFn();
    }, [loadOrderFn]),
    onCookAccepted: useCallback(() => {
      loadOrderFn();
    }, [loadOrderFn]),
    onOrderReady: useCallback(() => {
      loadOrderFn();
    }, [loadOrderFn]),
  });

  useEffect(() => {
    loadOrderFn();
  }, [loadOrderFn]);

  useEffect(() => {
    if (driverPos && order?.deliveryLat && order?.deliveryLng) {
      calcRoute(driverPos, {
        lat: order.deliveryLat,
        lng: order.deliveryLng,
      });
    }
  }, [driverPos?.lat, order?.deliveryLat]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  if (!order) return <p className="text-gray-400">Commande introuvable</p>;

  const currentStep = getStepIndex(order.status);
  const isActive = ["PICKED_UP", "DELIVERING"].includes(order.status);
  const isCooking = ["ACCEPTED", "PREPARING"].includes(order.status);
  const isReady = order.status === "READY";
  const departTime = order.delivery?.startTime
    ? new Date(order.delivery.startTime)
    : null;
  const etaDate = routeTime ? new Date(Date.now() + routeTime * 1000) : null;

  const maxCookTime = Math.max(
    ...(order.items?.map((i: any) => i.product?.cookingTimeMin ?? 15) || [15])
  );

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title={`Commande #${orderId.slice(-6)}`}
        subtitle={new Date(order.createdAt).toLocaleString("fr-FR")}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/livraison/order"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1" />
          {(isActive || isCooking) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
              <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-medium">
                En direct
              </span>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Progress bar */}
      {order.status !== "CANCELLED" && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              {statusSteps.map((step, i) => {
                const Icon = step.icon;
                const done = i <= currentStep;
                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                        done ? "bg-green-500" : "bg-gray-800"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          done ? "text-white" : "text-gray-600"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[9px] text-center",
                        done ? "text-green-400" : "text-gray-600"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex mt-1 px-4">
              {statusSteps.slice(0, -1).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-1 rounded mx-0.5",
                    i < currentStep ? "bg-green-500" : "bg-gray-800"
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment badge */}
      {order.paymentMethod === "ONLINE" && (
        <Card>
          <CardContent className="flex items-center gap-2 !py-2">
            <CreditCard className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">Paiement en ligne</span>
            <span className="ml-auto">
              <StatusBadge status={order.paymentStatus} type="payment" />
            </span>
          </CardContent>
        </Card>
      )}

      {/* Countdown cuisson */}
      {isCooking && order.cookAcceptedAt && (
        <CookingCountdown
          cookAcceptedAt={order.cookAcceptedAt}
          cookingTimeMin={maxCookTime}
        />
      )}

      {/* Commande prête */}
      {isReady && (
        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              Votre repas est pret !
            </p>
            <p className="text-xs text-gray-400">
              En attente d&apos;un livreur pour la livraison
            </p>
          </div>
        </div>
      )}

      {/* Carte suivi en direct + stats */}
      {isActive && (
        <Card>
          <CardHeader border>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-orange-400 animate-pulse" />{" "}
                Suivi en direct
              </p>
              {routeTime && (
                <span className="text-xs font-semibold text-green-400">
                  Arrivee ~{etaDate ? fmtHour(etaDate) : "--"}
                </span>
              )}
            </div>
          </CardHeader>
          <div className="grid grid-cols-3 gap-0 border-b border-gray-800">
            <div className="p-3 text-center border-r border-gray-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] text-gray-500 uppercase">
                  Temps
                </span>
              </div>
              <p className="text-lg font-bold text-white">
                {routeTime ? fmtTime(routeTime) : "--"}
              </p>
            </div>
            <div className="p-3 text-center border-r border-gray-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Ruler className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] text-gray-500 uppercase">
                  Distance
                </span>
              </div>
              <p className="text-lg font-bold text-white">
                {routeDistance ? fmt(routeDistance) : "--"}
              </p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Gauge className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] text-gray-500 uppercase">
                  Vitesse
                </span>
              </div>
              <p className="text-lg font-bold text-white">
                {driverSpeed}{" "}
                <span className="text-xs font-normal text-gray-500">km/h</span>
              </p>
            </div>
          </div>
          <div className="h-72 sm:h-96">
            <TrackMap
              driverPos={driverPos}
              clientPos={{ lat: order.deliveryLat, lng: order.deliveryLng }}
              positions={positions}
            />
          </div>
          <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>{departTime ? `Départ à ${fmtHour(departTime)}` : ""}</span>
            <span>
              {lastUpdate
                ? `Maj ${fmtHour(lastUpdate)}`
                : "Temps réel via WebSocket"}
            </span>
          </div>
        </Card>
      )}

      {/* Livree */}
      {order.status === "DELIVERED" && order.delivery && (
        <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-400">
            Commande livree !
          </p>
          {order.delivery.startTime && order.delivery.endTime && (
            <p className="text-xs text-gray-400 mt-1">
              Livrée en{" "}
              {Math.round(
                (new Date(order.delivery.endTime).getTime() -
                  new Date(order.delivery.startTime).getTime()) /
                  60000
              )}{" "}
              min
            </p>
          )}
        </div>
      )}

      {/* Livreur */}
      {order.delivery && (
        <Card>
          <CardContent>
            <p className="text-xs text-gray-500 mb-2">Votre livreur</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {order.delivery.driver?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {order.delivery.status === "PICKING_UP"
                    ? "Se dirige vers le restaurant"
                    : order.delivery.status === "DELIVERING"
                      ? "En route vers vous"
                      : order.delivery.status === "DELIVERED"
                        ? "Livrée avec succès"
                        : ""}
                </p>
              </div>
              {isActive && routeTime && (
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">
                    ~{fmtTime(routeTime)}
                  </p>
                  <p className="text-[10px] text-gray-500">restant</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Articles */}
      <Card>
        <CardContent>
          <p className="text-sm font-semibold text-white mb-2">Articles</p>
          <div className="space-y-2">
            {order.items?.map((item: any) => {
              const originalTotal = (item.product?.price || 0) * item.quantity;
              const hasItemDiscount = originalTotal > item.price && item.price > 0;
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    {item.quantity}x {item.product?.name}
                  </span>
                  <span className="text-gray-400">
                    {hasItemDiscount && (
                      <span className="text-gray-600 line-through text-xs mr-1.5">{originalTotal.toLocaleString()}</span>
                    )}
                    <span className={hasItemDiscount ? "text-green-400 font-medium" : ""}>{item.price?.toLocaleString()} FCFA</span>
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-gray-800">
              <span>Total</span>
              <span>{order.totalAmount?.toLocaleString()} FCFA</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat admin */}
      {order?.delivery && (
        <>
          {!chatOpen && (
            <ChatButton
              onClick={() => setChatOpen(true)}
              unreadCount={chatUnread}
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
            currentSender="ADMIN"
            onSend={chatSendMessage}
            onMarkRead={chatMarkAsRead}
            onLoadMore={chatLoadMore}
            onTyping={() => chatEmitTyping("Support", "ADMIN")}
            onStopTyping={chatStopTyping}
            otherPartyName={order.client?.name ? `${order.client.name} (${order.client.phone || ""})` : order.guestName ? `${order.guestName} (${order.guestPhone || ""})` : order.guestPhone || "Client"}
            orderNumber={order.orderNumber}
          />
        </>
      )}

      {/* Adresse */}
      <Card>
        <CardContent>
          <p className="text-xs text-gray-500 mb-1">Adresse de livraison</p>
          <p className="text-sm text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400" /> {order.deliveryAddress}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
