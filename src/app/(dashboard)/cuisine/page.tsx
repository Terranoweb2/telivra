"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, Clock, CheckCircle, ChefHat, Bell, Wifi,
  User, MapPin, Timer,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDeliverySocket } from "@/hooks/use-delivery-socket";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabGroup } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";

type Tab = "pending" | "preparing" | "ready";

function playSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

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
            {isOverdue ? "Temps ecoule !" : `${min}:${sec.toString().padStart(2, "0")}`}
          </span>
        </div>
        <span className="text-xs text-gray-500">{cookingTimeMin} min prevues</span>
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

export default function CuisinePage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [readying, setReadying] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Chargement initial
  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Polling toutes les 8 secondes en fallback
  useEffect(() => {
    pollRef.current = setInterval(loadOrders, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadOrders]);

  // Socket.IO temps reel — on recharge toujours les donnees completes
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const pending = orders.filter((o) => o.status === "PENDING");
  const preparing = orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const ready = orders.filter((o) => o.status === "READY");

  const tabs: { key: Tab; label: string; count: number; icon: any }[] = [
    { key: "pending", label: "Nouvelles", count: pending.length, icon: Bell },
    { key: "preparing", label: "En cuisine", count: preparing.length, icon: ChefHat },
    { key: "ready", label: "Pretes", count: ready.length, icon: CheckCircle },
  ];

  const currentList = tab === "pending" ? pending : tab === "preparing" ? preparing : ready;

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-400" /> Cuisine
          </span>
        }
        subtitle="Gerez les commandes a preparer"
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

      {/* Onglets */}
      <TabGroup tabs={tabs} active={tab} onChange={(key) => setTab(key as Tab)} />

      {/* Liste */}
      {currentList.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          message={
            tab === "pending" ? "Aucune nouvelle commande" : tab === "preparing" ? "Aucune commande en preparation" : "Aucune commande prete"
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentList.map((order) => {
            const maxCookTime = Math.max(...(order.items?.map((i: any) => i.product?.cookingTimeMin ?? 15) || [15]));
            return (
              <Card key={order.id}>
                <CardContent className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Commande #{(order.id as string).slice(-6)}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Timer className="w-3 h-3" /> ~{maxCookTime} min
                      </span>
                      <span className="text-sm font-bold text-orange-400">{order.totalAmount?.toLocaleString()} F</span>
                    </div>
                  </div>

                  {/* Client info */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <User className="w-3 h-3" />
                    <span>{order.client?.name || order.guestName || "Client"}</span>
                    {order.deliveryAddress && (
                      <>
                        <span className="text-gray-700">|</span>
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{order.deliveryAddress}</span>
                      </>
                    )}
                  </div>

                  {/* Articles */}
                  <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">
                          <span className="text-white font-medium">{item.quantity}x</span> {item.product?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.product?.cookingTimeMin ? `${item.product.cookingTimeMin} min` : ""}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {order.note && (
                    <p className="text-xs text-yellow-400/80 bg-yellow-500/10 px-3 py-1.5 rounded-lg">
                      Note : {order.note}
                    </p>
                  )}

                  {/* Countdown */}
                  {tab === "preparing" && order.cookAcceptedAt && (
                    <CookingCountdown cookAcceptedAt={order.cookAcceptedAt} cookingTimeMin={maxCookTime} />
                  )}

                  {/* Actions */}
                  {tab === "pending" && (
                    <button onClick={() => acceptOrder(order.id)} disabled={accepting === order.id}
                      className="w-full sm:w-auto py-2.5 px-6 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                      {accepting === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
                      Accepter et preparer
                    </button>
                  )}

                  {tab === "preparing" && (
                    <button onClick={() => markReady(order.id)} disabled={readying === order.id}
                      className="w-full sm:w-auto py-2.5 px-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                      {readying === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Commande prete !
                    </button>
                  )}

                  {tab === "ready" && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-600/10 border border-green-500/20 rounded-lg"><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-xs text-green-400">En attente du livreur</span></div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
