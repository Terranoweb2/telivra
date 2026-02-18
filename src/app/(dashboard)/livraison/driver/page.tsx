"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle, Truck, MapPin, Clock, User, Package, Wifi, Bell, ChevronRight,
} from "lucide-react";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";

const statusLabels: Record<string, { text: string; color: string }> = {
  PICKING_UP: { text: "Récupération", color: "text-yellow-400 bg-yellow-600/20" },
  DELIVERING: { text: "En livraison", color: "text-orange-400 bg-orange-600/20" },
};

export default function DriverPage() {
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);

  // Position GPS du livreur (tracking en arriere-plan)
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
      setTimeout(() => setNewOrderAlert(false), 5000);
    }, []),
    onOrderUpdate: useCallback(() => {
      loadDataStatic();
    }, []),
  });

  useEffect(() => {
    loadDataStatic();

    // Obtenir la position GPS initiale
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          myPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function loadDataStatic() {
    const [pending, orders] = await Promise.all([
      fetch("/api/orders/pending").then((r) => r.json()),
      fetch("/api/orders?as=driver").then((r) => r.json()),
    ]);
    setPendingOrders(Array.isArray(pending) ? pending : []);
    const allWithDelivery = Array.isArray(orders) ? orders.filter((o: any) => o.delivery) : [];
    setMyDeliveries(allWithDelivery);

    // Mettre a jour la liste des livraisons actives pour le tracking
    const activeIds = allWithDelivery
      .filter((o: any) => ["PICKING_UP", "DELIVERING"].includes(o.delivery?.status))
      .map((o: any) => o.delivery.id);
    activeIdsRef.current = activeIds;

    // Demarrer/arreter le tracking selon les livraisons actives
    if (activeIds.length > 0) {
      startBackgroundTracking();
    } else {
      stopBackgroundTracking();
    }

    setLoading(false);
  }

  function startBackgroundTracking() {
    if (watchRef.current !== null) return; // Deja en cours

    if (!navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        myPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );

    sendRef.current = setInterval(async () => {
      const pos = myPosRef.current;
      const ids = activeIdsRef.current;
      if (!pos || ids.length === 0) return;

      // Envoyer la position pour chaque livraison active
      await Promise.all(
        ids.map((deliveryId) =>
          fetch(`/api/deliveries/${deliveryId}/position`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, speed: 0 }),
          }).catch(() => {})
        )
      );
    }, 8000);
  }

  function stopBackgroundTracking() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (sendRef.current) {
      clearInterval(sendRef.current);
      sendRef.current = null;
    }
  }

  // Cleanup au demontage
  useEffect(() => {
    return () => stopBackgroundTracking();
  }, []);

  async function acceptOrder(orderId: string) {
    const res = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        latitude: myPosRef.current?.lat,
        longitude: myPosRef.current?.lng,
      }),
    });
    if (res.ok) {
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      await loadDataStatic();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const activeDeliveries = myDeliveries.filter(
    (o) => o.delivery && ["PICKING_UP", "DELIVERING"].includes(o.delivery.status)
  );
  const deliveredOrders = myDeliveries.filter((o) => o.delivery?.status === "DELIVERED");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Espace Livreur</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez vos livraisons</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
          <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium">Connecté</span>
        </div>
      </div>

      {/* Alerte nouvelle commande */}
      {newOrderAlert && (
        <div className="bg-green-600/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-3 animate-pulse">
          <Bell className="w-5 h-5 text-green-400" />
          <p className="text-sm text-green-400 font-medium">Nouvelle commande disponible !</p>
        </div>
      )}

      {/* Mes livraisons en cours */}
      {activeDeliveries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-400" />
            Mes livraisons en cours
            <span className="px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full">{activeDeliveries.length}</span>
          </h2>
          <div className="space-y-2">
            {activeDeliveries.map((order) => {
              const status = statusLabels[order.delivery?.status] || statusLabels.PICKING_UP;
              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/livraison/driver/${order.delivery.id}`)}
                  className="w-full bg-gray-900 border border-gray-800 hover:border-orange-500/50 rounded-xl p-4 text-left transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-600/20 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{order.client?.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.text}
                    </span>
                    <span className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Commandes disponibles */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Commandes disponibles
          {pendingOrders.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">{pendingOrders.length}</span>
          )}
        </h2>
        {pendingOrders.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <Package className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Aucune commande en attente</p>
            <p className="text-gray-600 text-xs mt-1">Les nouvelles commandes apparaitront automatiquement</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((order) => (
              <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{order.client?.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {order.deliveryAddress}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</span>
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  {order.items?.map((i: any) => (
                    <span key={i.id || i.productId} className="mr-2">
                      {i.quantity}x {i.product?.name || i.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => acceptOrder(order.id)}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Accepter la livraison
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique */}
      {deliveredOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Historique</h2>
          <div className="space-y-2">
            {deliveredOrders.map((order) => (
              <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{order.client?.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.delivery?.endTime || order.updatedAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-green-400">{order.totalAmount?.toLocaleString()} FCFA</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
