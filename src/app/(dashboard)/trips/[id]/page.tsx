"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Loader2, Clock, Gauge, MapPin, Route as RouteIcon } from "lucide-react";

const TripMap = dynamic(() => import("@/components/map/trip-map"), { ssr: false, loading: () => <div className="h-96 bg-gray-900 rounded-xl flex items-center justify-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> });

const statusLabels: Record<string, string> = { IN_PROGRESS: "En cours", COMPLETED: "Termine", CANCELLED: "Annule" };

export default function TripDetailPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then((r) => r.json())
      .then(setTrip)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!trip) return <div className="text-center py-12 text-gray-400">Trajet non trouvé</div>;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/trips" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{trip.name || "Trajet sans nom"}</h1>
          <p className="text-gray-400 text-sm">{trip.device?.name} - {statusLabels[trip.status]}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><MapPin className="w-3.5 h-3.5" />Distance</div>
          <p className="text-white font-bold text-lg">{trip.distanceKm} km</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Clock className="w-3.5 h-3.5" />Durée</div>
          <p className="text-white font-bold text-lg">{trip.durationMinutes} min</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Gauge className="w-3.5 h-3.5" />Vitesse moy.</div>
          <p className="text-white font-bold text-lg">{trip.avgSpeedKmh} km/h</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><RouteIcon className="w-3.5 h-3.5" />Vit. max</div>
          <p className="text-white font-bold text-lg">{trip.maxSpeedKmh} km/h</p>
        </div>
      </div>

      {trip.positions?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden" style={{ height: "450px" }}>
          <TripMap positions={trip.positions} />
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-white font-semibold mb-3">{trip.positions?.length || 0} point(s) GPS</h2>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Debut: {new Date(trip.startTime).toLocaleString("fr-FR")}</p>
          {trip.endTime && <p>Fin: {new Date(trip.endTime).toLocaleString("fr-FR")}</p>}
        </div>
      </div>
    </div>
  );
}
