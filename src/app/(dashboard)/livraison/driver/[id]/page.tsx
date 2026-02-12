"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2, CheckCircle, Truck, MapPin, Clock, User, Navigation, Ruler, Gauge, ArrowLeft, X, XCircle, Phone,
} from "lucide-react";

const DriverMap = dynamic(() => import("@/components/map/delivery-track-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900 rounded-xl">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  ),
});

const cancelReasons = [
  "Client injoignable",
  "Adresse introuvable",
  "Produit indisponible",
  "Probleme de vehicule",
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
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const watchRef = useRef<number | null>(null);
  const sendRef = useRef<any>(null);
  const myPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const speedRef = useRef(0);
  const routeThrottle = useRef<any>(null);

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
            `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
          );
          const data = await res.json();
          if (data.routes?.[0]) {
            setRouteDistance(data.routes[0].distance);
            setRouteTime(data.routes[0].duration);
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
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyPos(p);
        myPosRef.current = p;
        const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        setSpeed(spd);
        speedRef.current = spd;
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
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

  // Annulation livreur - peut annuler a tout moment sauf DELIVERED
  function canCancel() {
    if (!delivery) return false;
    if (delivery.status === "DELIVERED" || delivery.status === "CANCELLED") return false;
    return true;
  }

  async function cancelOrder() {
    if (!delivery?.order?.id) return;
    if (!cancelReason) {
      setCancelError("Veuillez selectionner une raison");
      return;
    }
    if (cancelReason === "Autre" && !customReason.trim()) {
      setCancelError("Veuillez preciser la raison");
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
      <div className="flex items-center justify-center h-64">
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
    <div className="space-y-3">
      {/* Header avec retour */}
      <button
        onClick={() => router.push("/livraison/order")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux commandes
      </button>

      {/* Info livraison */}
      <div className="bg-orange-600/10 border border-orange-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-orange-400 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            {delivery.status === "PICKING_UP" ? "Recuperation en cours" : "En route vers le client"}
          </p>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Depart il y a {elapsed} min
          </span>
        </div>

        {/* Client info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">{order?.client?.name || order?.guestName || "Client"}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" /> {order?.deliveryAddress}
            </p>
            {order?.guestPhone && !order?.client && (
              <a href={`tel:${order.guestPhone}`} className="text-xs text-orange-400 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {order.guestPhone}
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <Gauge className="w-4 h-4 text-orange-400 mx-auto mb-0.5" />
            <p className="text-lg font-bold text-white">{speed}</p>
            <p className="text-[10px] text-gray-500">km/h</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <Ruler className="w-4 h-4 text-green-400 mx-auto mb-0.5" />
            <p className="text-lg font-bold text-white">{routeDistance ? fmt(routeDistance) : "--"}</p>
            <p className="text-[10px] text-gray-500">distance</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-2 text-center">
            <Clock className="w-4 h-4 text-purple-400 mx-auto mb-0.5" />
            <p className="text-lg font-bold text-white">{routeTime ? fmtTime(routeTime) : "--"}</p>
            <p className="text-[10px] text-gray-500">restant</p>
          </div>
        </div>

        {/* Articles */}
        <div className="text-xs text-gray-400">
          {order?.items?.map((i: any) => (
            <span key={i.id} className="mr-2">
              {i.quantity}x {i.product?.name}
            </span>
          ))}
        </div>
      </div>

      {/* Carte */}
      {clientPos && (
        <div className="rounded-xl overflow-hidden border border-gray-800 h-[40vh] sm:h-[55vh]">
          <DriverMap
            driverPos={myPos}
            clientPos={clientPos}
            positions={delivery.positions || []}
            driverLabel="Ma position"
            clientLabel="Le client"
          />
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex gap-2">
        {delivery.status === "PICKING_UP" && (
          <button
            onClick={() => updateStatus("DELIVERING")}
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" /> Commande recuperee - En route
          </button>
        )}
        {delivery.status === "DELIVERING" && (
          <button
            onClick={() => updateStatus("DELIVERED")}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Marquer comme livree
          </button>
        )}
      </div>

      {/* Bouton annuler livreur */}
      {canCancel() && (
        <div>
          {!showCancel ? (
            <button onClick={() => { setShowCancel(true); setCancelReason(""); setCustomReason(""); setCancelError(""); }}
              className="w-full py-3 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 text-red-400 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Annuler la livraison
            </button>
          ) : (
            <div className="bg-gray-900 border border-red-500/30 rounded-xl p-4 space-y-3">
              <p className="text-sm text-white font-medium">Confirmer l&apos;annulation ?</p>
              <p className="text-xs text-gray-400">La commande sera annulee et le client sera notifie.</p>

              <select
                value={cancelReason}
                onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500"
              >
                <option value="">Selectionnez une raison</option>
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
  );
}
