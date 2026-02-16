"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Route, Play, Square, Loader2, Clock, Gauge, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = { IN_PROGRESS: "En cours", COMPLETED: "Termine", CANCELLED: "Annule" };
const statusColors: Record<string, string> = {
  IN_PROGRESS: "text-green-400 bg-green-500/10",
  COMPLETED: "text-orange-400 bg-orange-500/10",
  CANCELLED: "text-gray-400 bg-gray-500/10",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [tripName, setTripName] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/trips").then((r) => r.json()),
      fetch("/api/devices").then((r) => r.json()),
    ]).then(([t, d]) => {
      setTrips(Array.isArray(t) ? t : []);
      setDevices(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  async function startTrip() {
    if (!selectedDevice) return;
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: selectedDevice, name: tripName || undefined }),
    });
    if (res.ok) {
      const trip = await res.json();
      setTrips((prev) => [trip, ...prev]);
      setShowNew(false);
      setTripName("");
      setSelectedDevice("");
    }
  }

  async function stopTrip(id: string) {
    const res = await fetch(`/api/trips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Trajets</h1>
          <p className="text-gray-400 text-sm mt-1">{trips.length} trajet(s)</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg"
        >
          <Play className="w-4 h-4" /> Démarrer un trajet
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 space-y-4">
          <h3 className="text-white font-semibold">Nouveau trajet</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Appareil</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="">Selectionner...</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.serialNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Nom (optionnel)</label>
              <input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="Ex: Livraison centre-ville"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500"
              />
            </div>
          </div>
          <button onClick={startTrip} disabled={!selectedDevice} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm rounded-lg">
            Démarrer
          </button>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="text-center py-12">
          <Route className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Aucun trajet enregistré</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Route className="w-5 h-5 text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/trips/${trip.id}`} className="text-white font-medium text-sm hover:text-orange-400">
                        {trip.name || "Trajet sans nom"}
                      </Link>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusColors[trip.status])}>
                        {statusLabels[trip.status]}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{trip.device?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{trip.distanceKm} km</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{trip.durationMinutes} min</span>
                  <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" />{trip.avgSpeedKmh} km/h</span>
                  {trip.status === "IN_PROGRESS" && (
                    <button onClick={() => stopTrip(trip.id)} className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">
                      <Square className="w-3 h-3" /> Arrêter
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-xs mt-2">{new Date(trip.startTime).toLocaleString("fr-FR")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
