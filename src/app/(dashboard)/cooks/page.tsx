"use client";

import { useEffect, useState } from "react";
import { Loader2, ChefHat, CheckCircle, TrendingUp, User, Flame, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
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
        subtitle={`${cooks.length} cuisinier${cooks.length > 1 ? "s" : ""} enregistré${cooks.length > 1 ? "s" : ""}`}
      />

      <div className="flex gap-3">
        <StatCardCentered className="flex-1" icon={Flame} value={totalInKitchen} label="En cuisine" color="orange" />
        <StatCardCentered className="flex-1" icon={CheckCircle} value={totalDelivered} label="Livrées" color="green" />
        <StatCardCentered className="flex-1" icon={TrendingUp} value={totalRevenue.toLocaleString()} label="FCFA total" color="purple" />
        {totalPickup > 0 && (
          <StatCardCentered className="flex-1" icon={ShoppingBag} value={totalPickup} label="À emporter" color="purple" />
        )}
      </div>

      <div className="space-y-3">
        {cooks.map((cook) => (
          <Card key={cook.id}>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-orange-600/20 rounded-full flex items-center justify-center shrink-0">
                  <ChefHat className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{cook.name}</p>
                  <p className="text-xs text-gray-500 truncate">{cook.email}</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-medium",
                  cook.stats.inKitchen > 0 ? "bg-orange-500/20 text-orange-400" : "bg-gray-700 text-gray-400"
                )}>
                  {cook.stats.inKitchen > 0 ? `${cook.stats.inKitchen} en cuisine` : "Inactif"}
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                <Card className="bg-gray-800/50 border-0">
                  <CardContent className="p-2 text-center">
                    <p className="text-sm font-bold text-orange-400">{cook.stats.inKitchen}</p>
                    <p className="text-[10px] text-gray-500">En cuisine</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/50 border-0">
                  <CardContent className="p-2 text-center">
                    <p className="text-sm font-bold text-cyan-400">{cook.stats.ready}</p>
                    <p className="text-[10px] text-gray-500">Prêtes</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/50 border-0">
                  <CardContent className="p-2 text-center">
                    <p className="text-sm font-bold text-green-400">{cook.stats.delivered}</p>
                    <p className="text-[10px] text-gray-500">Livrées</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/50 border-0">
                  <CardContent className="p-2 text-center">
                    <p className="text-sm font-bold text-purple-400">{cook.stats.pickup || 0}</p>
                    <p className="text-[10px] text-gray-500">Emporter</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800/50 border-0">
                  <CardContent className="p-2 text-center">
                    <p className="text-sm font-bold text-white">{cook.stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">FCFA</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        ))}
        {cooks.length === 0 && (
          <EmptyState icon={ChefHat} message="Aucun cuisinier enregistré" />
        )}
      </div>
    </div>
  );
}
