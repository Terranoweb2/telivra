"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Car, Users, Package, MapPin, Battery, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = { ACTIVE: "Actif", INACTIVE: "Inactif", MAINTENANCE: "Maintenance", LOST: "Perdu" };
const statusColors: Record<string, string> = { ACTIVE: "text-green-400 bg-green-500/10", INACTIVE: "text-gray-400 bg-gray-500/10", MAINTENANCE: "text-yellow-400 bg-yellow-500/10", LOST: "text-red-400 bg-red-500/10" };

export default function DeviceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/devices/${id}`)
      .then((r) => r.json())
      .then(setDevice)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm("Supprimer cet appareil et toutes ses donnees ?")) return;
    await fetch(`/api/devices/${id}`, { method: "DELETE" });
    router.push("/devices");
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!device) return <div className="text-center py-12 text-gray-400">Appareil non trouve</div>;

  const entityInfo =
    device.type === "VEHICLE" && device.vehicle
      ? { icon: Car, lines: [`${device.vehicle.brand} ${device.vehicle.model}`, device.vehicle.licensePlate, device.vehicle.color] }
      : device.type === "PERSON" && device.person
      ? { icon: Users, lines: [`${device.person.firstName} ${device.person.lastName}`, device.person.phone, device.person.role] }
      : device.type === "ASSET" && device.asset
      ? { icon: Package, lines: [device.asset.name, device.asset.category, device.asset.value ? `${device.asset.value} EUR` : null] }
      : { icon: MapPin, lines: [] };

  const lastPos = device.positions?.[0];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/devices" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{device.name}</h1>
            <p className="text-gray-400 text-sm">SN: {device.serialNumber}</p>
          </div>
        </div>
        <button onClick={handleDelete} className="inline-flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm">
          <Trash2 className="w-4 h-4" /> Supprimer
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Statut</p>
          <span className={cn("inline-block px-2.5 py-1 rounded-full text-xs font-medium", statusColors[device.status])}>
            {statusLabels[device.status]}
          </span>
        </div>
        {device.batteryLevel != null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Batterie</p>
            <div className="flex items-center gap-2">
              <Battery className={cn("w-5 h-5", device.batteryLevel > 20 ? "text-green-400" : "text-red-400")} />
              <span className="text-white font-bold">{device.batteryLevel}%</span>
            </div>
          </div>
        )}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Derniere activite</p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-white text-sm">{device.lastSeen ? new Date(device.lastSeen).toLocaleString("fr-FR") : "Jamais"}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <entityInfo.icon className="w-5 h-5 text-orange-400" />
          <h2 className="text-white font-semibold">Details</h2>
        </div>
        <div className="space-y-2">
          {entityInfo.lines.filter(Boolean).map((line: string, i: number) => (
            <p key={i} className="text-gray-300 text-sm">{line}</p>
          ))}
        </div>
      </div>

      {lastPos && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-white font-semibold mb-3">Derniere position</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-gray-500 text-xs">Latitude</p><p className="text-white">{lastPos.latitude.toFixed(6)}</p></div>
            <div><p className="text-gray-500 text-xs">Longitude</p><p className="text-white">{lastPos.longitude.toFixed(6)}</p></div>
            <div><p className="text-gray-500 text-xs">Vitesse</p><p className="text-white">{lastPos.speed ?? "--"} km/h</p></div>
            <div><p className="text-gray-500 text-xs">Heure</p><p className="text-white">{new Date(lastPos.timestamp).toLocaleTimeString("fr-FR")}</p></div>
          </div>
        </div>
      )}

      {device.positions?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
          <h2 className="text-white font-semibold mb-3">Historique des positions ({device.positions.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-gray-500 text-xs"><th className="text-left py-2">Heure</th><th className="text-left py-2">Lat</th><th className="text-left py-2">Lng</th><th className="text-left py-2">Vitesse</th></tr></thead>
              <tbody>
                {device.positions.slice(0, 20).map((p: any) => (
                  <tr key={p.id} className="border-t border-gray-800">
                    <td className="py-2 text-gray-300">{new Date(p.timestamp).toLocaleString("fr-FR")}</td>
                    <td className="py-2 text-gray-300">{p.latitude.toFixed(4)}</td>
                    <td className="py-2 text-gray-300">{p.longitude.toFixed(4)}</td>
                    <td className="py-2 text-gray-300">{p.speed ?? "--"} km/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
