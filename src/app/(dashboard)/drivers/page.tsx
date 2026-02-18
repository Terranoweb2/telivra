"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Loader2, Truck, CheckCircle, TrendingUp, User, Star, ChevronRight, Wifi, WifiOff, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);

  const fetchDrivers = useCallback(() => {
    fetch("/api/drivers").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setDrivers(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  // WebSocket: real-time presence + stats refresh
  useEffect(() => {
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("subscribe:admin");
      socket.emit("presence:list");
    });

    socket.on("presence:list", (list: { userId: string; role: string; online: boolean }[]) => {
      const driverIds = new Set(list.filter((u) => u.role === "DRIVER" && u.online).map((u) => u.userId));
      setOnlineUsers(driverIds);
    });

    socket.on("presence:update", ({ userId, role, online }: { userId: string; role: string; name: string; online: boolean }) => {
      if (role === "DRIVER") {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (online) next.add(userId);
          else next.delete(userId);
          return next;
        });
        if (!online) {
          setLastSeenMap((prev) => ({ ...prev, [userId]: new Date().toISOString() }));
        }
      }
    });

    socket.on("staff:refresh", () => { fetchDrivers(); });

    return () => { socket.disconnect(); };
  }, [fetchDrivers]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const totalActive = drivers.reduce((s, d) => s + d.stats.active, 0);
  const totalCompleted = drivers.reduce((s, d) => s + d.stats.completed, 0);
  const totalRevenue = drivers.reduce((s, d) => s + d.stats.totalRevenue, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Livreurs"
        subtitle={`${drivers.length} livreur${drivers.length > 1 ? "s" : ""} enregistré${drivers.length > 1 ? "s" : ""}`}
      />

      {/* Résumé global */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          { icon: Truck, value: totalActive, label: "En cours", color: "text-purple-400" },
          { icon: CheckCircle, value: totalCompleted, label: "Livrées", color: "text-green-400" },
          { icon: TrendingUp, value: totalRevenue.toLocaleString() + " F", label: "Recette", color: "text-orange-400" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-xl shrink-0">
            <s.icon className={cn("w-4 h-4", s.color)} />
            <span className="text-sm font-bold text-white">{s.value}</span>
            <span className="text-[10px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Liste livreurs */}
      <div className="space-y-2">
        {drivers.map((driver) => {
          const online = onlineUsers.has(driver.id);
          const lastSeen = lastSeenMap[driver.id] || driver.lastSeenAt;
          return (
            <Link key={driver.id} href={`/drivers/${driver.id}`}>
              <Card hover>
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 bg-purple-600/20 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900",
                        online ? "bg-green-500" : "bg-gray-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{driver.name}</p>
                        {driver.stats.avgRating && (
                          <span className="text-[9px] text-yellow-400 font-medium shrink-0 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-yellow-400" /> {driver.stats.avgRating}
                          </span>
                        )}
                        {online ? (
                          <span className="text-[9px] text-green-400 font-medium shrink-0 flex items-center gap-0.5">
                            <Wifi className="w-2.5 h-2.5" /> En ligne
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-500 shrink-0 flex items-center gap-0.5">
                            <WifiOff className="w-2.5 h-2.5" /> {lastSeen ? timeAgo(lastSeen) : "Jamais connecté"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 overflow-x-auto scrollbar-hide">
                        {driver.activeDelivery ? (
                          <>
                            <span className="text-[10px] text-orange-400 font-semibold shrink-0 whitespace-nowrap animate-pulse">En livraison</span>
                            <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap truncate max-w-[120px]">{driver.activeDelivery.clientName}</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-purple-400 shrink-0 whitespace-nowrap">{driver.stats.active} en cours</span>
                        )}
                        <span className="text-[10px] text-green-400 shrink-0 whitespace-nowrap">{driver.stats.completed} livrées</span>
                        <span className="text-[10px] text-gray-400 font-semibold shrink-0 whitespace-nowrap">{driver.stats.totalRevenue.toLocaleString()} F</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {driver.activeDelivery && (
                        <Link
                          href={`/track/${driver.activeDelivery.orderId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-orange-500/20 rounded-lg hover:bg-orange-500/30 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5 text-orange-400" />
                        </Link>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {drivers.length === 0 && (
          <EmptyState icon={Truck} message="Aucun livreur enregistré" />
        )}
      </div>
    </div>
  );
}
