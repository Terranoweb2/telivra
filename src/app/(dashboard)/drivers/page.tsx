"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, CheckCircle, MapPin, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Livreurs</h1>
        <p className="text-gray-400 text-sm mt-1">{drivers.length} livreur{drivers.length > 1 ? "s" : ""} enregistres</p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <Truck className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{totalActive}</p>
          <p className="text-xs text-gray-500">En cours</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{totalCompleted}</p>
          <p className="text-xs text-gray-500">Livrees</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">FCFA total</p>
        </div>
      </div>

      {/* Liste livreurs */}
      <div className="space-y-3">
        {drivers.map((driver) => (
          <div key={driver.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-orange-600/20 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{driver.name}</p>
                <p className="text-xs text-gray-500 truncate">{driver.email}</p>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-full text-[10px] font-medium",
                driver.stats.active > 0 ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"
              )}>
                {driver.stats.active > 0 ? `${driver.stats.active} en cours` : "Inactif"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-white">{driver.stats.active}</p>
                <p className="text-[10px] text-gray-500">En cours</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-white">{driver.stats.completed}</p>
                <p className="text-[10px] text-gray-500">Livrees</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                <p className="text-sm font-bold text-white">{driver.stats.totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500">FCFA</p>
              </div>
            </div>
          </div>
        ))}
        {drivers.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Truck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun livreur enregistre</p>
          </div>
        )}
      </div>
    </div>
  );
}
