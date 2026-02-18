"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Cpu, Car, Users, Package, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = { VEHICLE: Car, PERSON: Users, ASSET: Package };
const typeLabels: Record<string, string> = { VEHICLE: "Véhicule", PERSON: "Personne", ASSET: "Asset" };
const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500",
  INACTIVE: "bg-gray-500",
  MAINTENANCE: "bg-yellow-500",
  LOST: "bg-red-500",
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then(setDevices)
      .finally(() => setLoading(false));
  }, []);

  const filtered = devices.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || d.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Appareils</h1>
          <p className="text-gray-400 text-sm mt-1">{devices.length} appareil(s) enregistré(s)</p>
        </div>
        <Link
          href="/devices/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Tous les types</option>
          <option value="VEHICLE">Véhicules</option>
          <option value="PERSON">Personnes</option>
          <option value="ASSET">Assets</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Cpu className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Aucun appareil trouvé</p>
          <Link href="/devices/new" className="text-orange-400 hover:text-orange-300 text-sm mt-2 inline-block">
            Ajouter un appareil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((device) => {
            const Icon = typeIcons[device.type] || Cpu;
            const entityName =
              device.type === "VEHICLE" ? `${device.vehicle?.brand} ${device.vehicle?.model}` :
              device.type === "PERSON" ? `${device.person?.firstName} ${device.person?.lastName}` :
              device.asset?.name || "";
            return (
              <Link
                key={device.id}
                href={`/devices/${device.id}`}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-gray-800 p-2.5 rounded-lg shrink-0">
                      <Icon className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">{device.name}</p>
                      <p className="text-gray-500 text-xs truncate">{entityName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("w-2.5 h-2.5 rounded-full", statusColors[device.status])} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{typeLabels[device.type]}</span>
                  <span>SN: {device.serialNumber}</span>
                </div>
                {device.batteryLevel != null && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", device.batteryLevel > 20 ? "bg-green-500" : "bg-red-500")}
                        style={{ width: `${device.batteryLevel}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
