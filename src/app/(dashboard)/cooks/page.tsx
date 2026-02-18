"use client";

import { useEffect, useState } from "react";
import { Loader2, ChefHat, CheckCircle, TrendingUp, Flame, ShoppingBag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardCentered } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function CooksPage() {
  const [cooks, setCooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cooks").then((r) => r.json()).then((data) => {
      setCooks(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const totalInKitchen = cooks.reduce((s, c) => s + c.stats.inKitchen, 0);
  const totalDelivered = cooks.reduce((s, c) => s + c.stats.delivered, 0);
  const totalRevenue = cooks.reduce((s, c) => s + c.stats.totalRevenue, 0);
  const totalPickup = cooks.reduce((s, c) => s + (c.stats.pickup || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cuisiniers"
        subtitle={`${cooks.length} cuisinier${cooks.length > 1 ? "s" : ""} enregistre${cooks.length > 1 ? "s" : ""}`}
      />

      <div className="flex gap-3">
        <StatCardCentered className="flex-1" icon={Flame} value={totalInKitchen} label="En cuisine" color="orange" />
        <StatCardCentered className="flex-1" icon={CheckCircle} value={totalDelivered} label="Livrees" color="green" />
        <StatCardCentered className="flex-1" icon={TrendingUp} value={totalRevenue.toLocaleString()} label="FCFA total" color="purple" />
        {totalPickup > 0 && (
          <StatCardCentered className="flex-1" icon={ShoppingBag} value={totalPickup} label="A emporter" color="purple" />
        )}
      </div>

      <div className="space-y-2">
        {cooks.map((cook) => (
          <Link key={cook.id} href={`/cooks/${cook.id}`}>
            <Card hover>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600/20 rounded-full flex items-center justify-center shrink-0">
                    <ChefHat className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{cook.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-orange-400 font-medium">{cook.stats.inKitchen} en cuisine</span>
                      <span className="text-[11px] text-cyan-400">{cook.stats.ready} pretes</span>
                      <span className="text-[11px] text-green-400">{cook.stats.delivered} livrees</span>
                      {cook.stats.pickup > 0 && <span className="text-[11px] text-purple-400">{cook.stats.pickup} emporter</span>}
                      <span className="text-[11px] text-gray-400 font-semibold">{cook.stats.totalRevenue.toLocaleString()} F</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium",
                      cook.stats.inKitchen > 0 ? "bg-orange-500/20 text-orange-400" : "bg-gray-700 text-gray-400"
                    )}>
                      {cook.stats.inKitchen > 0 ? "Actif" : "Inactif"}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {cooks.length === 0 && (
          <EmptyState icon={ChefHat} message="Aucun cuisinier enregistre" />
        )}
      </div>
    </div>
  );
}
