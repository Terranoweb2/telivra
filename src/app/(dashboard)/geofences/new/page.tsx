"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Save, Circle, Hexagon, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const GeofenceDrawMap = dynamic(() => import("@/components/map/geofence-draw"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-900 rounded-xl">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  ),
});

export default function NewGeofencePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"CIRCLE" | "POLYGON">("CIRCLE");
  const [color, setColor] = useState("#3B82F6");
  const [centerLat, setCenterLat] = useState<number | null>(null);
  const [centerLng, setCenterLng] = useState<number | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(500);
  const [polygonCoords, setPolygonCoords] = useState<number[][]>([]);

  const handleCircleChange = useCallback((lat: number, lng: number, radius: number) => {
    setCenterLat(lat);
    setCenterLng(lng);
    setRadiusMeters(radius);
  }, []);

  const handlePolygonChange = useCallback((coords: number[][]) => {
    setPolygonCoords(coords);
  }, []);

  async function handleSave() {
    if (!name.trim()) return alert("Le nom est requis");
    if (type === "CIRCLE" && (!centerLat || !centerLng)) return alert("Cliquez sur la carte pour placer le centre");
    if (type === "POLYGON" && polygonCoords.length < 3) return alert("Placez au moins 3 points sur la carte");

    setSaving(true);
    try {
      const body: any = { name, description, type, color };
      if (type === "CIRCLE") {
        body.centerLat = centerLat;
        body.centerLng = centerLng;
        body.radiusMeters = radiusMeters;
      } else {
        body.coordinates = polygonCoords;
      }

      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/geofences");
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la creation");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/geofences" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Nouvelle Geofence</h1>
      </div>

      <div className="grid lg:grid-cols-[350px_1fr] gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4 h-fit">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              placeholder="Ex: Zone Bureau"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
              placeholder="Description optionnelle..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Type de zone</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType("CIRCLE")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                  type === "CIRCLE"
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                )}
              >
                <Circle className="w-4 h-4" /> Cercle
              </button>
              <button
                onClick={() => setType("POLYGON")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                  type === "POLYGON"
                    ? "border-orange-500 bg-orange-500/10 text-orange-400"
                    : "border-gray-700 text-gray-400 hover:border-gray-600"
                )}
              >
                <Hexagon className="w-4 h-4" /> Polygone
              </button>
            </div>
          </div>

          {type === "CIRCLE" && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Rayon (metres)</label>
              <input
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                min={50}
                max={50000}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Couleur</label>
            <div className="flex gap-2">
              {["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform",
                    color === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-3">
              {type === "CIRCLE"
                ? "Cliquez sur la carte pour placer le centre du cercle"
                : "Cliquez sur la carte pour ajouter des points au polygone"}
            </p>
            {type === "CIRCLE" && centerLat && centerLng && (
              <p className="text-xs text-gray-400 mb-2">
                Centre: {centerLat.toFixed(5)}, {centerLng.toFixed(5)}
              </p>
            )}
            {type === "POLYGON" && polygonCoords.length > 0 && (
              <p className="text-xs text-gray-400 mb-2">{polygonCoords.length} point(s) place(s)</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </div>

        <div className="h-[500px] lg:h-[calc(100vh-12rem)] rounded-xl overflow-hidden border border-gray-800">
          <GeofenceDrawMap
            type={type}
            color={color}
            radiusMeters={radiusMeters}
            onCircleChange={handleCircleChange}
            onPolygonChange={handlePolygonChange}
          />
        </div>
      </div>
    </div>
  );
}
