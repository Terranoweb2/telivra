"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter} from "next/navigation";
import {
  Loader2, ShoppingBag, Clock, CheckCircle, Truck, XCircle, Eye, Wifi,
  MapPin, User, Bell, X, ChevronDown, ChefHat, Timer, Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { playSound } from "@/lib/sounds";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabGroup } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";

const cancelReasons = [
  "Changement d'avis",
  "Délai trop long",
  "Commande en double",
  "Adresse incorrecte",
  "Autre",
];

const driverCancelReasons = [
  "Client injoignable",
  "Adresse introuvable",
  "Produit indisponible",
  "Problème de véhicule",
  "Autre",
];

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className={cn("w-4 h-4", isOverdue ? "text-red-400" : "text-orange-400")} />
          <span className={cn("text-sm font-semibold", isOverdue ? "text-red-400" : "text-white")}>
            {isOverdue ? "Temps écoulé !" : `${min}:${sec.toString().padStart(2, "0")}`}
          </span>
        </div>
        <span className="text-xs text-gray-500">{cookingTimeMin} min prévues</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-1000",
            isOverdue ? "bg-red-500" : progress > 75 ? "bg-yellow-500" : "bg-orange-500"
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

type Tab = "pending" | "active" | "delivered";

export default function CommandesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const role = (session?.user as any)?.role || "CLIENT";
  const clientId = (session?.user as any)?.id;
  const isAdmin = role === "ADMIN";
  const isCook = role === "COOK";
  const isDriver = role === "DRIVER" || isAdmin;
  const [tab, setTabState] = useState<Tab>(() => { if (typeof window !== "undefined") { const p = new URLSearchParams(window.location.search); return (p.get("tab") as Tab) || "pending"; } return "pending"; });
  const setTab = (t: Tab) => {
    setTabState(t);
    setPageSize(20);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState({}, "", url.toString());
  };

  // Sync tab with role once session loads (only if no URL param)
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (!urlTab) {
        setTabState("pending");
      }
    }
  }, [sessionStatus, session]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState(20);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelFormId, setCancelFormId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [accepting, setAccepting] = useState<string | null>(null);
  const [readying, setReadying] = useState<string | null>(null);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);

  // Obtenir position GPS pour l'acceptation livreur
  useEffect(() => {
    if (isDriver && !isAdmin && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [isDriver]);

  const loadData = useCallback(async () => {
    if (isCook) {
      // Cuisinier: charger depuis l'API cook
      const data = await fetch("/api/orders/cook").then((r) => r.json());
      setOrders(Array.isArray(data) ? data : []);
    } else if (isAdmin) {
      // Admin: load ALL orders + pending (ready without driver)
      const [pending, allOrders] = await Promise.all([
        fetch("/api/orders/pending").then((r) => r.json()),
        fetch("/api/orders").then((r) => r.json()),
      ]);
      setPendingOrders(Array.isArray(pending) ? pending : []);
      setOrders(Array.isArray(allOrders) ? allOrders : []);
    } else if (isDriver) {
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
  }, [isCook, isDriver]);

  useEffect(() => { loadData(); }, [loadData]);

  // Polling pour cuisinier et admin (fallback)
  useEffect(() => {
    if (!isCook && !isAdmin) return;
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [isCook, loadData]);

  // Socket.IO
  useDeliverySocket({
    asDriver: isDriver,
    asCook: isCook,
    clientId: !isDriver && !isCook ? clientId : undefined,
    onNewOrder: useCallback((data: any) => {
      if (isCook) {
        loadData();
        setNewAlert(true);
        playSound("new-order");
        setTimeout(() => setNewAlert(false), 5000);
        return;
      }
      if (!isDriver) return;
      setPendingOrders((prev) => {
        if (prev.find((o: any) => o.id === data.id)) return prev;
        return [{ ...data, client: { name: data.clientName } }, ...prev];
      });
      setNewAlert(true);
      playSound("new-order");
      setTimeout(() => setNewAlert(false), 5000);
    }, [isCook, isDriver, loadData]),
    onOrderReady: useCallback(() => {
      loadData();
      setNewAlert(true);
      playSound("order-ready");
      setTimeout(() => setNewAlert(false), 5000);
    }, [loadData]),
    onAccepted: useCallback(() => {
      playSound("accepted");
      loadData();
    }, [loadData]),
    onStatusChange: useCallback(() => {
      loadData();
    }, [loadData]),
    onCookAccepted: useCallback(() => {
      loadData();
    }, [loadData]),
  });

  // === Actions livreur ===
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
      const delivery = await res.json();
      // Trouver la commande pour construire l'URL de navigation
      const order = orders.find((o: any) => o.id === orderId) || pendingOrders.find((o: any) => o.id === orderId);
      if (order && delivery?.id) {
        const navUrl = "/navigate?lat=" + order.deliveryLat + "&lng=" + order.deliveryLng + "&address=" + encodeURIComponent(order.deliveryAddress || "") + "&client=" + encodeURIComponent(order.client?.name || order.guestName || "Client") + "&phone=" + encodeURIComponent(order.guestPhone || "") + "&amount=" + (order.totalAmount || 0) + "&orderId=" + order.id + "&deliveryId=" + delivery.id + "&status=DELIVERING";
        toast.success("Livraison acceptée");
        router.push(navUrl);
        return;
      }
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      await loadData();
      setTab("active");
      toast.success("Livraison acceptée");
    } else {
      toast.error("Erreur lors de l'acceptation");
    }
  }

  // === Actions cuisinier ===
  async function cookAccept(orderId: string) {
    setAccepting(orderId);
    const res = await fetch(`/api/orders/${orderId}/cook-accept`, { method: "POST" });
    if (res.ok) {
      await loadData();
      setTab("active");
      toast.success("Commande acceptée");
    } else {
      toast.error("Erreur lors de l'acceptation");
    }
    setAccepting(null);
  }

  async function cookReady(orderId: string) {
    setReadying(orderId);
    const res = await fetch(`/api/orders/${orderId}/cook-ready`, { method: "POST" });
    if (res.ok) {
      await loadData();
      toast.success("Commande marquée prête !");
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
    setReadying(null);
  }

  // === Annulation ===
  async function cancelOrder(orderId: string) {
    const reason = cancelReason === "Autre" ? (customReason.trim() || "Autre") : cancelReason;
    if (!reason) return;

    setCancellingId(orderId);
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      await loadData();
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      toast.success("Commande annulée");
    } else {
      toast.error("Erreur lors de l'annulation");
    }
    setCancellingId(null);
    setCancelFormId(null);
    setCancelReason("");
    setCustomReason("");
  }

  function openCancelForm(orderId: string) {
    if (cancelFormId === orderId) {
      setCancelFormId(null);
      setCancelReason("");
      setCustomReason("");
    } else {
      setCancelFormId(orderId);
      setCancelReason("");
      setCustomReason("");
    }
  }

  function closeCancelForm() {
    setCancelFormId(null);
    setCancelReason("");
    setCustomReason("");
  }

  if (!mounted || loading || sessionStatus === "loading") return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  // === Filtrage par onglet selon le role ===
  const pendingList = isCook
    ? orders.filter((o) => o.status === "PENDING")
    : isAdmin
      ? orders.filter((o) => ["PENDING", "PREPARING", "READY"].includes(o.status))
      : isDriver
        ? pendingOrders
        : orders.filter((o) => ["PENDING", "PREPARING", "READY"].includes(o.status));

  const activeList = isCook
    ? orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status))
    : isAdmin
      ? orders.filter((o) => o.delivery && ["PICKING_UP", "DELIVERING"].includes(o.delivery.status))
      : isDriver
        ? orders.filter((o) => o.delivery && ["PICKING_UP", "DELIVERING"].includes(o.delivery.status))
        : orders.filter((o) => ["PICKED_UP", "DELIVERING"].includes(o.status));

  const deliveredList = isCook
    ? orders.filter((o) => o.status === "READY")
    : isAdmin
      ? orders.filter((o) => ["DELIVERED", "CANCELLED"].includes(o.status))
      : isDriver
        ? orders.filter((o) => o.delivery?.status === "DELIVERED")
        : orders.filter((o) => o.status === "DELIVERED");

  // Labels dynamiques selon role
  const tabItems: { key: Tab; label: string; count: number; icon?: any }[] = isCook
    ? [
        { key: "pending", label: "Nouvelles", count: pendingList.length, icon: Bell },
        { key: "active", label: "En cuisine", count: activeList.length, icon: ChefHat },
        { key: "delivered", label: "Prêtes", count: deliveredList.length, icon: CheckCircle },
      ]
    : isAdmin
      ? [
          { key: "pending", label: "En attente", count: pendingList.length, icon: Clock },
          { key: "active", label: "En livraison", count: activeList.length, icon: Truck },
          { key: "delivered", label: "Terminées", count: deliveredList.length, icon: CheckCircle },
        ]
      : [
          { key: "pending", label: isDriver ? "Prêtes" : "En attente", count: pendingList.length },
          { key: "active", label: "En cours", count: activeList.length },
          { key: "delivered", label: "Livrées", count: deliveredList.length },
        ];

  const fullList = tab === "pending" ? pendingList : tab === "active" ? activeList : deliveredList;
  const currentList = fullList.slice(0, pageSize);
  const hasMore = fullList.length > pageSize;

  // Peut annuler?
  function canCancelOrder(order: any) {
    if (order.status === "DELIVERED" || order.status === "CANCELLED") return false;
    if (isAdmin) return false;
    if (isDriver || isCook) {
      return order.status === "PENDING";
    }
    return order.status === "PENDING" && order.paymentMethod === "CASH";
  }

  const reasonsList = isDriver ? driverCancelReasons : cancelReasons;

  const emptyMessage = isCook
    ? (tab === "pending" ? "Aucune nouvelle commande" : tab === "active" ? "Aucune commande en préparation" : "Aucune commande prête")
    : isAdmin
      ? (tab === "pending" ? "Aucune commande en attente" : tab === "active" ? "Aucune livraison en cours" : "Aucune commande terminée")
      : tab === "pending"
        ? (isDriver ? "Aucune commande prête" : "Aucune commande en attente")
        : tab === "active"
          ? "Aucune commande en cours"
          : "Aucune commande livrée";

  const subtitle = isCook ? "Gérez les commandes à préparer" : isAdmin ? "Vue globale de toutes les commandes" : isDriver ? "Gérez vos livraisons" : "Suivez vos commandes";

  return (
    <div className="space-y-4">
      {/* Header */}
      <PageHeader title="Commandes" subtitle={subtitle}>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
          <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium">En direct</span>
        </div>
      </PageHeader>

      {/* Alerte nouvelle commande */}
      {newAlert && (
        <div className={cn(
          "border rounded-xl p-3 flex items-center gap-3 animate-pulse",
          isCook ? "bg-orange-600/20 border-orange-500/30" : "bg-green-600/20 border-green-500/30"
        )}>
          <Bell className={cn("w-5 h-5", isCook ? "text-orange-400" : "text-green-400")} />
          <p className={cn("text-sm font-medium", isCook ? "text-orange-400" : "text-green-400")}>
            {isCook ? "Nouvelle commande !" : isDriver ? "Commande prête à livrer !" : "Nouvelle commande disponible !"}
          </p>
        </div>
      )}

      {/* Onglets */}
      <div className="sticky top-14 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2 bg-gray-900/95 backdrop-blur-sm">
      <TabGroup tabs={tabItems} active={tab} onChange={(key) => setTab(key as Tab)} />
      </div>

      {/* Liste */}
      {currentList.length === 0 ? (
        <EmptyState icon={isCook ? ChefHat : ShoppingBag} message={emptyMessage} />
      ) : (
        <div className={cn(
          isCook ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-3"
        )}>
          {currentList.map((order) => {
            const orderStatus = isDriver ? (order.delivery?.status || order.status) : order.status;
            const href = isDriver && order.delivery
              ? `/navigate?lat=${order.deliveryLat}&lng=${order.deliveryLng}&address=${encodeURIComponent(order.deliveryAddress || "")}&client=${encodeURIComponent(order.client?.name || order.guestName || "Client")}&phone=${encodeURIComponent(order.guestPhone || "")}&amount=${order.totalAmount || 0}&orderId=${order.id}&deliveryId=${order.delivery.id}&status=${order.delivery.status}`
              : `/track/${order.id}`;

            // === COOK: onglet Nouvelles — bouton Accepter ===
            if (tab === "pending" && isCook) {
              const maxCookTime = Math.max(...(order.items?.map((i: any) => i.product?.cookingTimeMin ?? 15) || [15]));
              return (
                <Card key={order.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Commande #{(order.id as string).slice(-6)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.client?.name || order.guestName || "Client"} - {new Date(order.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <StatusBadge status="PENDING" type="order" />
                    </div>

                    <div className="space-y-1.5">
                      {order.items?.map((item: any) => (
                        <div key={item.id || item.productId} className="flex items-center gap-2">
                          {item.product?.image ? (
                            <img loading="lazy" decoding="async" src={item.product.image} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gray-800 shrink-0" />
                          )}
                          <span className="text-xs text-gray-400">
                            {item.quantity}x {item.product?.name || item.name}
                            {item.product?.cookingTimeMin && (
                              <span className="text-gray-600 ml-1">({item.product.cookingTimeMin} min)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <p className="text-xs text-yellow-400/80 italic">Note: {order.notes}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> ~{maxCookTime} min</span>
                      <span className="font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</span>
                    </div>

                    <button
                      onClick={() => cookAccept(order.id)}
                      disabled={accepting === order.id}
                      className="w-full sm:w-auto py-2.5 px-6 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-600/50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {accepting === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
                      Accepter et préparer
                    </button>
                  </CardContent>
                </Card>
              );
            }

            // === COOK: onglet En cuisine — countdown + bouton Pret ===
            if (tab === "active" && isCook) {
              const maxCookTime = Math.max(...(order.items?.map((i: any) => i.product?.cookingTimeMin ?? 15) || [15]));
              return (
                <Card key={order.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Commande #{(order.id as string).slice(-6)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.client?.name || order.guestName || "Client"}
                        </p>
                      </div>
                      <StatusBadge status="PREPARING" type="order" />
                    </div>

                    <div className="space-y-1.5">
                      {order.items?.map((item: any) => (
                        <div key={item.id || item.productId} className="flex items-center gap-2">
                          {item.product?.image ? (
                            <img loading="lazy" decoding="async" src={item.product.image} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gray-800 shrink-0" />
                          )}
                          <span className="text-xs text-gray-400">{item.quantity}x {item.product?.name || item.name}</span>
                        </div>
                      ))}
                    </div>

                    {order.cookAcceptedAt && (
                      <CookingCountdown cookAcceptedAt={order.cookAcceptedAt} cookingTimeMin={maxCookTime} />
                    )}

                    <button
                      onClick={() => cookReady(order.id)}
                      disabled={readying === order.id}
                      className="w-full sm:w-auto py-2.5 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {readying === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Pret !
                    </button>
                  </CardContent>
                </Card>
              );
            }

            // === COOK: onglet Prêtes ===
            if (tab === "delivered" && isCook) {
              return (
                <Card key={order.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Commande #{(order.id as string).slice(-6)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.client?.name || order.guestName || "Client"} - Prête à {order.cookReadyAt ? new Date(order.cookReadyAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                        En attente livreur
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {order.items?.map((item: any) => (
                        <div key={item.id || item.productId} className="flex items-center gap-2">
                          {item.product?.image ? (
                            <img loading="lazy" decoding="async" src={item.product.image} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gray-800 shrink-0" />
                          )}
                          <span className="text-xs text-gray-400">{item.quantity}x {item.product?.name || item.name}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</p>

                  </CardContent>
                </Card>
              );
            }

            // === ADMIN: vue lecture seule ===
            if (isAdmin) {
              return (
                <Card key={order.id}>
                  <CardContent>
                    <Link href={`/track/${order.id}`} className="block">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                            order.status === "PENDING" ? "bg-yellow-600/20" :
                            order.status === "PREPARING" ? "bg-orange-600/20" :
                            order.status === "READY" ? "bg-cyan-600/20" :
                            order.status === "DELIVERING" || order.delivery?.status === "DELIVERING" ? "bg-purple-600/20" :
                            order.status === "DELIVERED" || order.delivery?.status === "DELIVERED" ? "bg-green-600/20" :
                            order.status === "CANCELLED" ? "bg-red-600/20" : "bg-gray-600/20"
                          )}>
                            {order.status === "PENDING" ? <Clock className="w-4 h-4 text-yellow-400" /> :
                             order.status === "PREPARING" ? <ChefHat className="w-4 h-4 text-orange-400" /> :
                             order.status === "READY" ? <CheckCircle className="w-4 h-4 text-cyan-400" /> :
                             order.status === "DELIVERING" || order.delivery?.status === "DELIVERING" ? <Truck className="w-4 h-4 text-purple-400" /> :
                             order.status === "DELIVERED" || order.delivery?.status === "DELIVERED" ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                             order.status === "CANCELLED" ? <XCircle className="w-4 h-4 text-red-400" /> :
                             <ShoppingBag className="w-4 h-4 text-gray-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">
                              {order.client?.name || order.guestName || `#${(order.id as string).slice(-6)}`}
                            </p>
                            {order.guestPhone && <p className="text-xs text-gray-400">{order.guestPhone}</p>}
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                            {order.deliveryAddress && (
                              <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <StatusBadge status={order.delivery?.status || order.status} type="order" />
                          <p className="text-sm font-bold text-orange-400 mt-1">{order.totalAmount?.toLocaleString()} FCFA</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {order.items?.map((i: any) => (
                          <div key={i.id || i.productId} className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1">
                            {i.product?.image ? (
                              <img loading="lazy" decoding="async" src={i.product.image} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                            ) : null}
                            <span className="text-xs text-gray-400">{i.quantity}x {i.product?.name || i.name}</span>
                          </div>
                        ))}
                      </div>
                      {order.cancelReason && (
                        <p className="text-xs text-red-400 mb-1">Raison: {order.cancelReason}</p>
                      )}
                      {order.delivery?.driver && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Livreur: {order.delivery.driver.name || "Assigné"}
                        </p>
                      )}
                      <div className="flex items-center justify-end mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Eye className="w-3 h-3" /> Voir le detail
                        </span>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              );
            }

            // === DRIVER: onglet Prêtes — bouton accepter livraison ===
            if (tab === "pending" && isDriver) {
              return (
                <Card key={order.id}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-600/20 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {order.client?.name || order.guestName || "Client"}
                          </p>
                          {order.guestPhone && !order.client?.name && (
                            <p className="text-xs text-gray-400">{order.guestPhone}</p>
                          )}
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</span>

                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {order.items?.map((i: any) => (
                        <div key={i.id || i.productId} className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg px-2 py-1">
                          {i.product?.image ? (
                            <img loading="lazy" decoding="async" src={i.product.image} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                          ) : null}
                          <span className="text-xs text-gray-400">{i.quantity}x {i.product?.name || i.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptOrder(order.id)}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Accepter
                      </button>
                      {order.deliveryLat && order.deliveryLng && (
                        <Link
                          href={`/navigate?lat=${order.deliveryLat}&lng=${order.deliveryLng}&address=${encodeURIComponent(order.deliveryAddress || "")}&client=${encodeURIComponent(order.client?.name || order.guestName || "Client")}&phone=${encodeURIComponent(order.guestPhone || "")}&amount=${order.totalAmount || 0}&orderId=${order.id}${order.delivery ? `&deliveryId=${order.delivery.id}&status=${order.delivery.status}` : ""}`}
                          className="py-2.5 px-3 bg-orange-600/10 border border-orange-500/20 hover:bg-orange-600/20 text-orange-400 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // === Default: CLIENT / DRIVER active+delivered ===
            return (
              <Card key={order.id} hover>
                <CardContent>
                  <Link href={href} className="block">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {isDriver ? (order.client?.name || order.guestName || `Commande #${order.id.slice(-6)}`) : `Commande #${order.id.slice(-6)}`}
                        </p>
                        {isDriver && order.guestPhone && !order.client?.name && (
                          <p className="text-xs text-gray-400">{order.guestPhone}</p>
                        )}
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
                      </div>
                      <StatusBadge status={orderStatus} type="order" />
                    </div>
                    {isDriver && order.deliveryAddress && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryAddress}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2">
                          {item.product?.image ? (
                            <img loading="lazy" decoding="async" src={item.product.image} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-gray-800 shrink-0" />
                          )}
                          <span className="text-xs text-gray-400">{item.quantity}x {item.product?.name}</span>
                        </div>
                      ))}
                    </div>
                    {order.cancelReason && (
                      <p className="text-xs text-red-400 mt-1">Raison: {order.cancelReason}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
                      <div>
                        <p className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} FCFA</p>

                      </div>
                      {tab === "active" && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <Eye className="w-3 h-3" /> {isDriver ? "Voir la carte" : "Suivre en direct"}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Bouton itinéraire pour livreur/admin */}
                  {isDriver && order.deliveryLat && order.deliveryLng && (
                    <Link
                      href={`/navigate?lat=${order.deliveryLat}&lng=${order.deliveryLng}&address=${encodeURIComponent(order.deliveryAddress || "")}&client=${encodeURIComponent(order.client?.name || order.guestName || "Client")}&phone=${encodeURIComponent(order.guestPhone || "")}&amount=${order.totalAmount || 0}&orderId=${order.id}${order.delivery ? `&deliveryId=${order.delivery.id}&status=${order.delivery.status}` : ""}`}
                      className="mt-2 w-full py-2 bg-orange-600/10 border border-orange-500/20 hover:bg-orange-600/20 text-orange-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Voir l&apos;itinéraire
                    </Link>
                  )}

                  {/* Bouton annuler avec formulaire expandable */}
                  {canCancelOrder(order) && tab !== "delivered" && (
                    <div className="mt-2">
                      <button
                        onClick={() => openCancelForm(order.id)}
                        className="w-full py-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3 h-3" />
                        Annuler
                        <ChevronDown className={cn(
                          "w-3 h-3 transition-transform",
                          cancelFormId === order.id && "rotate-180"
                        )} />
                      </button>

                      {cancelFormId === order.id && (
                        <div className="mt-2 p-3 bg-red-950/30 border border-red-500/20 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
                          <p className="text-xs font-medium text-red-300">Raison de l&apos;annulation</p>

                          <select
                            value={cancelReason}
                            onChange={(e) => {
                              setCancelReason(e.target.value);
                              if (e.target.value !== "Autre") setCustomReason("");
                            }}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-500 appearance-none"
                          >
                            <option value="" disabled>Sélectionnez une raison...</option>
                            {reasonsList.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>

                          {cancelReason === "Autre" && (
                            <textarea
                              value={customReason}
                              onChange={(e) => setCustomReason(e.target.value)}
                              placeholder="Precisez la raison..."
                              rows={2}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
                            />
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => cancelOrder(order.id)}
                              disabled={!cancelReason || cancellingId === order.id}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {cancellingId === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              Confirmer l&apos;annulation
                            </button>
                            <button
                              onClick={closeCancelForm}
                              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors"
                            >
                              Retour
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Voir plus */}
      {hasMore && (
        <button
          onClick={() => setPageSize((s) => s + 20)}
          className="w-full py-3 text-sm font-medium text-orange-400 hover:text-orange-300 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
        >
          Voir plus ({fullList.length - pageSize} restantes)
        </button>
      )}
    </div>
  );
}
