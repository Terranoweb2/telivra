"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Plus, Trash2, MapPin, Circle, Hexagon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Geofence {
  id: string;
  name: string;
  description: string | null;
  type: "CIRCLE" | "POLYGON";
  centerLat: number | null;
  centerLng: number | null;
  radiusMeters: number | null;
  coordinates: number[][] | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  _count: { alerts: number };
}

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/geofences")
      .then((r) => r.json())
      .then((data) => setGeofences(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function deleteGeofence(id: string) {
    if (!confirm("Supprimer cette geofence ?")) return;
    await fetch(`/api/geofences/${id}`, { method: "DELETE" });
    setGeofences((prev) => prev.filter((g) => g.id !== id));
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/geofences/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setGeofences((prev) => prev.map((g) => (g.id === id ? { ...g, isActive: !isActive } : g)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Geofences</h1>
          <p className="text-gray-400 text-sm mt-1">{geofences.length} zone(s) configurée(s)</p>
        </div>
        <Link
          href="/geofences/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" /> Nouvelle zone
        </Link>
      </div>

      {geofences.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">Aucune geofence configurée</p>
          <Link
            href="/geofences/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" /> Creer une zone
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {geofences.map((g) => (
            <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.type === "CIRCLE" ? (
                    <Circle className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Hexagon className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-white font-medium truncate">{g.name}</span>
                </div>
                <button
                  onClick={() => deleteGeofence(g.id)}
                  className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {g.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{g.description}</p>}

              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {g.type === "CIRCLE" ? (
                    <span>Rayon: {g.radiusMeters}m</span>
                  ) : (
                    <span>{g.coordinates?.length || 0} points</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>{g._count.alerts} alerte(s)</span>
                  <button
                    onClick={() => toggleActive(g.id, g.isActive)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                      g.isActive
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                    )}
                  >
                    {g.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
