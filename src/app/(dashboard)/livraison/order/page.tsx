"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ShoppingBag, Clock, CheckCircle, Truck, XCircle, Eye, Wifi,
  MapPin, User, Bell, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  ACCEPTED: { label: "Acceptee", color: "bg-blue-500/20 text-blue-400", icon: CheckCircle },
  PICKING_UP: { label: "Recuperation", color: "bg-orange-500/20 text-orange-400", icon: ShoppingBag },
  DELIVERING: { label: "En livraison", color: "bg-purple-500/20 text-purple-400", icon: Truck },
  DELIVERED: { label: "Livree", color: "bg-green-500/20 text-green-400", icon: CheckCircle },
  CANCELLED: { label: "Annulee", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

function playSound(type: "new-order" | "accepted") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "new-order") {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    }

    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

type Tab = "pending" | "active" | "delivered";

export default function CommandesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "CLIENT";
  const clientId = (session?.user as any)?.id;
  const isDriver = role === "DRIVER" || role === "ADMIN";

  const [tab, setTab] = useState<Tab>("active");
  const [orders, setOrders] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);

  // Obtenir position GPS pour l'acceptation
  useEffect(() => {
    if (isDriver && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [isDriver]);

  const loadData = useCallback(async () => {
    if (isDriver) {
      const [pending, driverOrders] = await Promise.all([
        fetch("/api/orders/pending").then((r) => r.json()),
        fetch("/api/orders?as=driver").then((r) => r.json()),
      ]);
      setPendingOrders(Array.isArray(pending) ? pending : []);
      setOrders(Array.isArray(driverOrders) ? driverOrders : []);
    } else {
      const data = await fetch("/api/orders").then((r) => r.json());
      setOrders(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [isDriver]);

  useEffect(() => { loadData(); }, [loadData]);

  // Socket.IO
  useDeliverySocket({
    asDriver: isDriver,
    clientId: !isDriver ? clientId : undefined,
    onNewOrder: useCallback((data: any) => {
      if (!isDriver) return;
      setPendingOrders((prev) => {
        if (prev.find((o: any) => o.id === data.id)) return prev;
        return [{ ...data, client: { name: data.clientName } }, ...prev];
      });
      setNewAlert(true);
      playSound("new-order");
      setTimeout(() => setNewAlert(false), 5000);
    }, [isDriver]),
    onAccepted: useCallback(() => {
      playSound("accepted");
      loadData();
    }, [loadData]),
    onStatusChange: useCallback(() => {
      loadData();
    }, [loadData]),
  });

  async function acceptOrder(orderId: string) {
    const res = await fetch("/api/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        latitude: posRef.current?.lat,
        longitude: posRef.current?.lng,
      }),
    });
    if (res.ok) {
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      await loadData();
      setTab("active");
    }
  }

  async function cancelOrder(orderId: string) {
    setCancellingId(orderId);
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      await loadData();
      // Retirer aussi des pending si present
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
    setCancellingId(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

  // Filtrage par onglet
  const pendingList = isDriver
    ? pendingOrders
    : orders.filter((o) => o.status === "PENDING");

  const activeList = isDriver
    ? orders.filter((o) => o.delivery && ["PICKING_UP", "DELIVERING"].includes(o.delivery.status))
    : orders.filter((o) => ["ACCEPTED", "PICKING_UP", "DELIVERING"].includes(o.status));

  const deliveredList = isDriver
    ? orders.filter((o) => o.delivery?.status === "DELIVERED")
    : orders.filter((o) => o.status === "DELIVERED");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "En attente", count: pendingList.length },
    { key: "active", label: "En cours", count: activeList.length },
    { key: "delivered", label: "Livrees", count: deliveredList.length },
  ];

  const currentList = tab === "pending" ? pendingList : tab === "active" ? activeList : deliveredList;

  // Peut annuler? (client: PENDING ou 5min apres acceptation; livreur: tout sauf DELIVERED)
  function canCancelOrder(order: any) {
    if (order.status === "DELIVERED" || order.status === "CANCELLED") return false;
    if (isDriver) return true; // livreur peut annuler a tout moment
    if (order.status === "PENDING") return true;
    const acceptedAt = order.delivery?.startTime || order.updatedAt;
    const minutes = (Date.now() - new Date(acceptedAt).getTime()) / 60000;
    return minutes <= 5;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Commandes</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isDriver ? "Gerez vos livraisons" : "Suivez vos commandes"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
          <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium">En direct</span>
        </div>
      </div>

      {/* Alerte nouvelle commande */}
      {newAlert && (
        <div className="bg-green-600/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-3 animate-pulse">
          <Bell className="w-5 h-5 text-green-400" />
          <p className="text-sm text-green-400 font-medium">Nouvelle commande disponible !</p>
        </div>
      )}

      {/* Onglets */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
              tab === t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                tab === t.key ? "bg-white/20 text-white" : "bg-gray-800 text-gray-500"
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {currentList.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {tab === "pending" ? "Aucune commande en attente" :
             tab === "active" ? "Aucune commande en cours" : "Aucune commande livree"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((order) => {
            const orderStatus = isDriver ? (order.delivery?.status || order.status) : order.status;
            const st = statusConfig[orderStatus] || statusConfig.PENDING;
            const Icon = st.icon;

            const href = isDriver && order.delivery
              ? `/livraison/driver/${order.delivery.id}`
              : `/livraison/order/${order.id}`;

            // Onglet "En attente" pour livreur = bouton accepter
            if (tab === "pending" && isDriver) {
              return (
                <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-600/20 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{order.client?.name || order.guestName || "Client"}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-blue-400 shrink-0">{order.totalAmount?.toLocaleString()} FCFA</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">
                    {order.items?.map((i: any) => (
                      <span key={i.id || i.productId} className="mr-2">{i.quantity}x {i.product?.name || i.name}</span>
                    ))}
                  </div>
                  <button onClick={() => acceptOrder(order.id)}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Accepter la livraison
                  </button>
                </div>
              );
            }

            return (
              <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <Link href={href} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {isDriver ? (order.client?.name || order.guestName || `Commande #${order.id.slice(-6)}`) : `Commande #${order.id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", st.color)}>
                      <Icon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>
                  {isDriver && order.deliveryAddress && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 truncate">
                      <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress}
                    </p>
                  )}
                  <div className="text-xs text-gray-400 space-y-0.5">
                    {order.items?.map((item: any) => (
                      <p key={item.id}>{item.quantity}x {item.product?.name}</p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
                    <p className="text-sm font-bold text-blue-400">{order.totalAmount?.toLocaleString()} FCFA</p>
                    {tab === "active" && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Eye className="w-3 h-3" /> {isDriver ? "Voir la carte" : "Suivre en direct"}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Bouton annuler inline */}
                {canCancelOrder(order) && tab !== "delivered" && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    disabled={cancellingId === order.id}
                    className="w-full mt-2 py-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {cancellingId === order.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    Annuler
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
