"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Loader2, ArrowLeft, Clock, CheckCircle, Truck, ShoppingBag, MapPin,
  User, Navigation, Ruler, Gauge, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";

const TrackMap = dynamic(() => import("@/components/map/delivery-track-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-900 rounded-xl"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>,
});

const statusSteps = [
  { key: "PENDING", label: "En attente", icon: Clock },
  { key: "ACCEPTED", label: "Acceptee", icon: CheckCircle },
  { key: "PICKED_UP", label: "Recuperee", icon: ShoppingBag },
  { key: "DELIVERING", label: "En livraison", icon: Truck },
  { key: "DELIVERED", label: "Livree", icon: CheckCircle },
];

function getStepIndex(status: string) {
  const i = statusSteps.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

function fmt(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`; }
function fmtTime(s: number) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${m}min` : `${m} min`; }
function fmtHour(d: Date) { return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }

export default function OrderDetailPage() {
  const { id } = useParams();
  const orderId = id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeTime, setRouteTime] = useState<number | null>(null);
  const [driverSpeed, setDriverSpeed] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const routeThrottle = useRef<any>(null);

  // Calcul route OSRM (throttled)
  const calcRoute = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
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
    }, 3000); // Max 1 appel OSRM toutes les 3s
  }, []);

  // Socket.IO temps reel
  useDeliverySocket({
    orderId,
    onPosition: useCallback((data: any) => {
      const newPos = { lat: data.latitude, lng: data.longitude };
      setDriverPos(newPos);
      if (data.speed != null) setDriverSpeed(Math.round(data.speed));
      setLastUpdate(new Date());
      // Ajouter a l'historique
      setPositions((prev) => [...prev, { ...data, id: Date.now() }]);
      // Recalculer route
      if (order?.deliveryLat && order?.deliveryLng) {
        calcRoute(newPos, { lat: order.deliveryLat, lng: order.deliveryLng });
      }
    }, [order?.deliveryLat, order?.deliveryLng, calcRoute]),
    onStatusChange: useCallback((data: any) => {
      // Recharger la commande pour avoir le nouveau statut
      loadOrderFn();
    }, []),
    onAccepted: useCallback((data: any) => {
      loadOrderFn();
    }, []),
  });

  const loadOrderFn = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      setOrder(data);
      if (data.delivery?.currentLat && data.delivery?.currentLng) {
        setDriverPos({ lat: data.delivery.currentLat, lng: data.delivery.currentLng });
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

  // Charger les donnees initiales
  useEffect(() => {
    loadOrderFn();
  }, [loadOrderFn]);

  // Calcul route initial
  useEffect(() => {
    if (driverPos && order?.deliveryLat && order?.deliveryLng) {
      calcRoute(driverPos, { lat: order.deliveryLat, lng: order.deliveryLng });
    }
  }, [driverPos?.lat, order?.deliveryLat]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  if (!order) return <p className="text-gray-400">Commande introuvable</p>;

  const currentStep = getStepIndex(order.status);
  const isActive = ["ACCEPTED", "PICKED_UP", "DELIVERING"].includes(order.status);
  const departTime = order.delivery?.startTime ? new Date(order.delivery.startTime) : null;
  const etaDate = routeTime ? new Date(Date.now() + routeTime * 1000) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/livraison/order" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Commande #{orderId.slice(-6)}</h1>
          <p className="text-gray-400 text-xs">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
            <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-medium">En direct</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {order.status !== "CANCELLED" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            {statusSteps.map((step, i) => {
              const Icon = step.icon;
              const done = i <= currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-1",
                    done ? "bg-green-500" : "bg-gray-800")}>
                    <Icon className={cn("w-4 h-4", done ? "text-white" : "text-gray-600")} />
                  </div>
                  <span className={cn("text-[10px] text-center", done ? "text-green-400" : "text-gray-600")}>{step.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex mt-1 px-4">
            {statusSteps.slice(0, -1).map((_, i) => (
              <div key={i} className={cn("flex-1 h-1 rounded mx-0.5", i < currentStep ? "bg-green-500" : "bg-gray-800")} />
            ))}
          </div>
        </div>
      )}

      {/* Carte suivi en direct + stats */}
      {isActive && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400 animate-pulse" /> Suivi en direct
              </p>
              {routeTime && (
                <span className="text-xs font-semibold text-green-400">
                  Arrivee ~{etaDate ? fmtHour(etaDate) : "--"}
                </span>
              )}
            </div>
          </div>

          {/* Stats temps reel */}
          <div className="grid grid-cols-3 gap-0 border-b border-gray-800">
            <div className="p-3 text-center border-r border-gray-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] text-gray-500 uppercase">Temps restant</span>
              </div>
              <p className="text-lg font-bold text-white">{routeTime ? fmtTime(routeTime) : "--"}</p>
            </div>
            <div className="p-3 text-center border-r border-gray-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Ruler className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-gray-500 uppercase">Distance</span>
              </div>
              <p className="text-lg font-bold text-white">{routeDistance ? fmt(routeDistance) : "--"}</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Gauge className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[10px] text-gray-500 uppercase">Vitesse</span>
              </div>
              <p className="text-lg font-bold text-white">{driverSpeed} <span className="text-xs font-normal text-gray-500">km/h</span></p>
            </div>
          </div>

          {/* Carte */}
          <div className="h-72 sm:h-96">
            <TrackMap
              driverPos={driverPos}
              clientPos={{ lat: order.deliveryLat, lng: order.deliveryLng }}
              positions={positions}
            />
          </div>

          {/* Depart + last update */}
          <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>{departTime ? `Depart a ${fmtHour(departTime)}` : ""}</span>
            <span>{lastUpdate ? `Maj ${fmtHour(lastUpdate)}` : "Temps reel via WebSocket"}</span>
          </div>
        </div>
      )}

      {/* Livree */}
      {order.status === "DELIVERED" && order.delivery && (
        <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-400">Commande livree !</p>
          {order.delivery.startTime && order.delivery.endTime && (
            <p className="text-xs text-gray-400 mt-1">
              Livree en {Math.round((new Date(order.delivery.endTime).getTime() - new Date(order.delivery.startTime).getTime()) / 60000)} min
              (de {fmtHour(new Date(order.delivery.startTime))} a {fmtHour(new Date(order.delivery.endTime))})
            </p>
          )}
        </div>
      )}

      {/* Livreur */}
      {order.delivery && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Votre livreur</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{order.delivery.driver?.name}</p>
              <p className="text-xs text-gray-500">
                {order.delivery.status === "PICKING_UP" ? "Se dirige vers le restaurant" :
                 order.delivery.status === "DELIVERING" ? "En route vers vous" :
                 order.delivery.status === "DELIVERED" ? "Livree avec succes" : ""}
              </p>
            </div>
            {isActive && routeTime && (
              <div className="text-right">
                <p className="text-sm font-bold text-green-400">~{fmtTime(routeTime)}</p>
                <p className="text-[10px] text-gray-500">restant</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historique mouvements */}
      {positions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-white mb-2">Historique mouvements ({positions.length})</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {positions.map((pos: any, i: number) => (
              <div key={pos.id || i} className="flex items-center gap-3 text-xs py-1 border-b border-gray-800/50 last:border-0">
                <span className="text-gray-600 w-5">{i + 1}</span>
                <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="text-gray-400">{pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}</span>
                {pos.speed != null && <span className="text-gray-500">{Math.round(pos.speed)} km/h</span>}
                <span className="text-gray-600 ml-auto">{new Date(pos.timestamp).toLocaleTimeString("fr-FR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-sm font-semibold text-white mb-2">Articles</p>
        <div className="space-y-2">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-300">{item.quantity}x {item.product?.name}</span>
              <span className="text-gray-400">{item.price?.toLocaleString()} FCFA</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-gray-800">
            <span>Total</span><span>{order.totalAmount?.toLocaleString()} FCFA</span>
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Adresse de livraison</p>
        <p className="text-sm text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-red-400" /> {order.deliveryAddress}</p>
      </div>
    </div>
  );
}
