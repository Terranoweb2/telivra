"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Truck, CheckCircle, TrendingUp, User, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardCentered } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drivers").then((r) => r.json()).then((data) => {
      setDrivers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  const totalActive = drivers.reduce((s, d) => s + d.stats.active, 0);
  const totalCompleted = drivers.reduce((s, d) => s + d.stats.completed, 0);
  const totalRevenue = drivers.reduce((s, d) => s + d.stats.totalRevenue, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Livreurs"
        subtitle={`${drivers.length} livreur${drivers.length > 1 ? "s" : ""} enregistrés`}
      />

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <StatCardCentered icon={Truck} value={totalActive} label="En cours" color="purple" />
        <StatCardCentered icon={CheckCircle} value={totalCompleted} label="Livrées" color="green" />
        <StatCardCentered icon={TrendingUp} value={totalRevenue.toLocaleString()} label="FCFA total" color="orange" />
      </div>

      {/* Liste livreurs */}
      <div className="space-y-3">
        {drivers.map((driver) => (
          <Link key={driver.id} href={`/drivers/${driver.id}`}>
            <Card hover className="mb-3">
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-orange-600/20 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{driver.name}</p>
                    <p className="text-xs text-gray-500 truncate">{driver.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {driver.stats.avgRating && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-yellow-400">{driver.stats.avgRating}</span>
                      </div>
                    )}
                    <div className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-medium",
                      driver.stats.active > 0 ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"
                    )}>
                      {driver.stats.active > 0 ? `${driver.stats.active} en cours` : "Inactif"}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Card className="bg-gray-800/50 border-0">
                    <CardContent className="p-2 text-center">
                      <p className="text-sm font-bold text-white">{driver.stats.active}</p>
                      <p className="text-[10px] text-gray-500">En cours</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 border-0">
                    <CardContent className="p-2 text-center">
                      <p className="text-sm font-bold text-white">{driver.stats.completed}</p>
                      <p className="text-[10px] text-gray-500">Livrées</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800/50 border-0">
                    <CardContent className="p-2 text-center">
                      <p className="text-sm font-bold text-white">{driver.stats.totalRevenue.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">FCFA</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {drivers.length === 0 && (
          <EmptyState icon={Truck} message="Aucun livreur enregistre" />
        )}
      </div>
    </div>
  );
}
