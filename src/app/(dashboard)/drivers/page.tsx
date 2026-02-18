"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, CheckCircle, TrendingUp, User, Star, ChevronRight, Wifi, WifiOff } from "lucide-react";
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

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000; // 5 min
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drivers").then((r) => r.json()).then((data) => {
      setDrivers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  // Refresh every 30s for online status
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/drivers").then((r) => r.json()).then((data) => {
        if (Array.isArray(data)) setDrivers(data);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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
          const online = isOnline(driver.lastSeenAt);
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
                            <WifiOff className="w-2.5 h-2.5" /> {driver.lastSeenAt ? timeAgo(driver.lastSeenAt) : "Jamais connecté"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 overflow-x-auto scrollbar-hide">
                        <span className="text-[10px] text-purple-400 shrink-0 whitespace-nowrap">{driver.stats.active} en cours</span>
                        <span className="text-[10px] text-green-400 shrink-0 whitespace-nowrap">{driver.stats.completed} livrées</span>
                        <span className="text-[10px] text-gray-400 font-semibold shrink-0 whitespace-nowrap">{driver.stats.totalRevenue.toLocaleString()} F</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
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
