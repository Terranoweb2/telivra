"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { CookingCountdown } from "@/components/ui/cooking-countdown";
import { playSound } from "@/lib/sounds";
import {
  Loader2, Clock, CheckCircle, ChefHat, Bell, Wifi,
  User, Timer, XCircle, Truck, BellRing,
  ChevronLeft, ChevronRight, Ban, Star, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TabGroup } from "@/components/ui/tabs";
import { StarRating } from "@/components/ui/star-rating";
import { PageHeader } from "@/components/ui/page-header";

const ITEMS_PER_PAGE = 12;

export default function CuisinePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";

  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [readying, setReadying] = useState<string | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setPage(1); }, [tab]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/cook");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    pollRef.current = setInterval(loadOrders, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadOrders]);

  useDeliverySocket({
    asCook: true,
    onNewOrder: useCallback(() => {
      loadOrders();
      setNewAlert(true);
      playSound();
      setTimeout(() => setNewAlert(false), 5000);
    }, [loadOrders]),
    onStatusChange: useCallback(() => { loadOrders(); }, [loadOrders]),
    onCookAccepted: useCallback(() => { loadOrders(); }, [loadOrders]),
    onOrderReady: useCallback(() => { loadOrders(); }, [loadOrders]),
  });

  async function acceptOrder(orderId: string) {
    setAccepting(orderId);
    const res = await fetch(`/api/orders/${orderId}/cook-accept`, { method: "POST" });
    if (res.ok) {
      await loadOrders();
      setTab("preparing");
      toast.success("Commande acceptée");
    } else {
      toast.error("Erreur lors de l'acceptation");
    }
    setAccepting(null);
  }

  async function markReady(orderId: string) {
    setReadying(orderId);
    const res = await fetch(`/api/orders/${orderId}/cook-ready`, { method: "POST" });
    if (res.ok) {
      await loadOrders();
      toast.success("Commande prête !");
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
    setReadying(null);
  }

  async function notifyCook(orderId: string) {
    setNotifying(orderId);
    const res = await fetch(`/api/orders/${orderId}/notify-cook`, { method: "POST" });
    if (res.ok) {
      toast.success("Notification envoyée aux cuisiniers");
    } else {
      toast.error("Erreur lors de la notification");
    }
    setNotifying(null);
  }

  async function cancelOrder(orderId: string) {
    const reason = prompt("Raison de l'annulation :");
    if (!reason?.trim()) return;
    setCancelling(orderId);
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (res.ok) {
      await loadOrders();
      toast.success("Commande annulée");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur lors de l'annulation");
    }
    setCancelling(null);
  }

  async function confirmPayment(orderId: string) {
    setConfirmingPayment(orderId);
    const res = await fetch("/api/orders/" + orderId + "/confirm-payment", { method: "POST" });
    if (res.ok) {
      await loadOrders();
      toast.success("Paiement confirmé");
    } else {
      toast.error("Erreur lors de la confirmation");
    }
    setConfirmingPayment(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const pending = orders.filter((o) => o.status === "PENDING");
  const preparing = orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const ready = orders.filter((o) => o.status === "READY");
  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  const cookTabs: { key: string; label: string; count: number; icon: any }[] = [
    { key: "pending", label: "Nouvelles", count: pending.length, icon: Bell },
    { key: "preparing", label: "En cuisine", count: preparing.length, icon: ChefHat },
    { key: "ready", label: "Prêtes", count: ready.length, icon: CheckCircle },
    { key: "delivered", label: "Livrées", count: delivered.length, icon: Truck },
    { key: "cancelled", label: "Annulées", count: cancelled.length, icon: XCircle },
  ];

  const adminTabs: { key: string; label: string; count: number; icon: any }[] = [
    { key: "pending", label: "Nouvelles", count: pending.length, icon: Bell },
    { key: "preparing", label: "En cuisine", count: preparing.length, icon: ChefHat },
    { key: "ready", label: "Prêtes", count: ready.length, icon: CheckCircle },
    { key: "delivered", label: "Livrées", count: delivered.length, icon: Truck },
    { key: "cancelled", label: "Annulées", count: cancelled.length, icon: XCircle },
  ];

  const tabs = isAdmin ? adminTabs : cookTabs;

  const listMap: Record<string, any[]> = { pending, preparing, ready, delivered, cancelled };
  const currentList = listMap[tab] || [];
  const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
  const paginatedList = currentList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const emptyMessages: Record<string, string> = {
    pending: "Aucune nouvelle commande",
    preparing: "Aucune commande en préparation",
    ready: "Aucune commande prête",
    delivered: "Aucune commande livrée",
    cancelled: "Aucune commande annulée",
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-400" /> Cuisine
          </span>
        }
        subtitle={isAdmin ? "Supervision des commandes" : "Gérez les commandes à préparer"}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 rounded-full">
          <Wifi className="w-3 h-3 text-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium">En direct</span>
        </div>
      </PageHeader>

      {newAlert && (
        <div className="bg-orange-600/20 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3 animate-pulse">
          <Bell className="w-5 h-5 text-orange-400" />
          <p className="text-sm text-orange-400 font-medium">Nouvelle commande !</p>
        </div>
      )}

      <TabGroup tabs={tabs} active={tab} onChange={(key) => setTab(key)} />

      {currentList.length === 0 ? (
        <EmptyState icon={ChefHat} message={emptyMessages[tab] || "Aucune commande"} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {paginatedList.map((order) => {
              const maxCookTime = Math.max(...(order.items?.map((i: any) => i.product?.cookingTimeMin ?? 15) || [15]));
              return (
                <Card key={order.id}>
                  <CardContent className="p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white">{order.orderNumber || "#" + (order.id as string).slice(-6)}</p>
                      <span className="text-[10px] text-orange-400 font-bold">{order.totalAmount?.toLocaleString()} F</span>
                    </div>

                    <p className="text-[11px] text-gray-400 truncate flex items-center gap-1">
                      <User className="w-2.5 h-2.5 shrink-0" />
                      {order.client?.name || order.guestName || "Client"}
                    </p>

                    <div className="bg-gray-800/50 rounded-lg p-2 space-y-0.5">
                      {order.items?.slice(0, 3).map((item: any) => (
                        <p key={item.id} className="text-[10px] text-gray-300 truncate">
                          <span className="text-white font-medium">{item.quantity}x</span> {item.product?.name}
                        </p>
                      ))}
                      {(order.items?.length || 0) > 3 && (
                        <p className="text-[10px] text-gray-500">+{order.items.length - 3} autre(s)</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Timer className="w-2.5 h-2.5" /> ~{maxCookTime}min
                      </span>
                    </div>

                    {isAdmin && order.cook && (
                      <p className="text-[10px] text-orange-400/80 flex items-center gap-1 truncate">
                        <ChefHat className="w-2.5 h-2.5 shrink-0" /> {order.cook.name}
                      </p>
                    )}

                    {tab === "preparing" && order.cookAcceptedAt && (
                      <CookingCountdown cookAcceptedAt={order.cookAcceptedAt} cookingTimeMin={maxCookTime} onConfirmReady={() => markReady(order.id)} />
                    )}

                    {order.note && (
                      <p className="text-[10px] text-yellow-400/80 bg-yellow-500/10 px-2 py-1 rounded truncate">
                        {order.note}
                      </p>
                    )}

                    {order.cancelReason && tab === "cancelled" && (
                      <p className="text-[10px] text-red-400/80 bg-red-500/10 px-2 py-1 rounded truncate">
                        {order.cancelReason}
                      </p>
                    )}

                    {/* Note client (commandes livrees) */}
                    {order.rating && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500">Repas</p>
                            <StarRating value={order.rating.mealRating} size="sm" />
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500">Livreur</p>
                            <StarRating value={order.rating.driverRating} size="sm" />
                          </div>
                        </div>
                        {order.rating.mealComment && (
                          <p className="text-[9px] text-gray-400 italic truncate">{order.rating.mealComment}</p>
                        )}
                      </div>
                    )}

                    {/* Paiement en ligne - badge */}
                    {order.paymentMethod === "ONLINE" && (
                      <div className={cn("flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium",
                        order.paymentConfirmed
                          ? "bg-green-600/10 border border-green-500/20 text-green-400"
                          : "bg-yellow-600/10 border border-yellow-500/20 text-yellow-400"
                      )}>
                        <CreditCard className="w-2.5 h-2.5" />
                        {order.paymentConfirmed ? "Paiement reçu" : "Paiement en attente"}
                      </div>
                    )}

                    {/* Actions CUISINIER */}
                    {!isAdmin && tab === "pending" && (
                      <>
                        {order.paymentMethod === "ONLINE" && !order.paymentConfirmed ? (
                          <button onClick={() => confirmPayment(order.id)} disabled={confirmingPayment === order.id}
                            className="w-full py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                            {confirmingPayment === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                            Confirmer paiement
                          </button>
                        ) : (
                          <button onClick={() => acceptOrder(order.id)} disabled={accepting === order.id}
                            className="w-full py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                            {accepting === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChefHat className="w-3 h-3" />}
                            Accepter
                          </button>
                        )}
                        <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                          className="w-full py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                          {cancelling === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                          Annuler
                        </button>
                      </>
                    )}
                    {!isAdmin && tab === "preparing" && (
                      <button onClick={() => markReady(order.id)} disabled={readying === order.id}
                        className="w-full py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                        {readying === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Prête !
                      </button>
                    )}

                    {/* Actions ADMIN */}
                    {isAdmin && tab === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => notifyCook(order.id)} disabled={notifying === order.id}
                          className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                          {notifying === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
                          Notifier
                        </button>
                        <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                          className="py-1.5 px-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-[11px] font-semibold flex items-center justify-center transition-colors"
                          title="Annuler">
                          {cancelling === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                    {isAdmin && (tab === "preparing" || tab === "ready") && (
                      <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                        className="w-full py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
                        {cancelling === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                        Annuler
                      </button>
                    )}

                    {/* Badges statut passif */}
                    {tab === "ready" && !isAdmin && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-600/10 border border-green-500/20 rounded text-[10px] text-green-400">
                        <CheckCircle className="w-2.5 h-2.5" /> Attente livreur
                      </div>
                    )}
                    {tab === "delivered" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-600/10 border border-green-500/20 rounded text-[10px] text-green-400">
                        <Truck className="w-2.5 h-2.5" /> Livrée
                      </div>
                    )}
                    {tab === "cancelled" && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-600/10 border border-red-500/20 rounded text-[10px] text-red-400">
                        <XCircle className="w-2.5 h-2.5" /> Annulée
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-800 text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">
                Page {page} / {totalPages} ({currentList.length} commandes)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-800 text-gray-400 rounded-lg disabled:opacity-30 hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
