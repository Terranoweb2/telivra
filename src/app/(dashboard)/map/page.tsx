"use client";

import { useEffect, useState } from "react";
import GPSMap from "@/components/map/map-loader";
import { Loader2, Car, Users, Package, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, any> = { VEHICLE: Car, PERSON: Users, ASSET: Package };
const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500",
  INACTIVE: "bg-gray-500",
  MAINTENANCE: "bg-yellow-500",
  LOST: "bg-red-500",
};

export default function MapPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    fetch("/api/positions/latest")
      .then((r) => r.json())
      .then((data) => {
        setDevices(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Carte</h1>
          <p className="text-gray-400 text-sm mt-1">{devices.length} appareil(s) localise(s)</p>
        </div>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="sm:hidden px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm"
        >
          {showPanel ? "Masquer la liste" : "Voir la liste"}
        </button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        <div className={cn(
          "w-72 shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-y-auto",
          "hidden sm:block",
          showPanel && "!block fixed inset-x-4 bottom-4 top-40 z-20 w-auto sm:relative sm:inset-auto sm:w-72"
        )}>
          <div className="p-3 border-b border-gray-800 sticky top-0 bg-gray-900">
            <p className="text-sm font-medium text-gray-300">{devices.length} appareil(s)</p>
          </div>
          {devices.length === 0 ? (
            <div className="p-4 text-center">
              <MapPin className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucun appareil localise</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {devices.map((d) => {
                const Icon = typeIcons[d.type] || MapPin;
                return (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedId(d.id); setShowPanel(false); }}
                    className={cn(
                      "w-full p-3 text-left hover:bg-gray-800/50 transition-colors",
                      selectedId === d.id && "bg-blue-600/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-white text-sm font-medium truncate">{d.name}</span>
                      <span className={cn("w-2 h-2 rounded-full shrink-0 ml-auto", statusColors[d.status])} />
                    </div>
                    <p className="text-gray-500 text-xs mt-1 truncate">
                      {d.position.speed != null ? `${d.position.speed} km/h` : ""}{" "}
                      {d.batteryLevel != null ? `| ${d.batteryLevel}%` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 rounded-xl overflow-hidden border border-gray-800">
          <GPSMap devices={devices} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
