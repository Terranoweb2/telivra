"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePositions } from "@/hooks/use-positions";
import {
  Loader2, Car, Users, Package, MapPin, RefreshCw, Send, Crosshair,
  Eye, Search, X, Locate, Layers, Navigation, ChevronRight,
  Clock, Ruler, Gauge, Flag, ArrowUp, Minus, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MainMap = dynamic(() => import("@/components/map/main-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-950">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  ),
});

const typeIcons: Record<string, any> = { VEHICLE: Car, PERSON: Users, ASSET: Package };
const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500",
  INACTIVE: "bg-gray-500",
  MAINTENANCE: "bg-yellow-500",
  LOST: "bg-red-500",
};

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface RouteStep {
  instruction: string;
  distance: number;
  time: number;
}

export default function MapPage() {
  const [initialDevices, setInitialDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [geofences, setGeofences] = useState<any[]>([]);

  // Position utilisateur
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(true);
  const watchRef = useRef<number | null>(null);

  // Recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  // Navigation
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destName, setDestName] = useState("");
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number } | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [showSteps, setShowSteps] = useState(false);

  // Panneaux
  const [showDevices, setShowDevices] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackLat, setTrackLat] = useState("");
  const [trackLng, setTrackLng] = useState("");
  const [trackSerial, setTrackSerial] = useState("");
  const [trackDevices, setTrackDevices] = useState<any[]>([]);
  const [manualMarker, setManualMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [trackMsg, setTrackMsg] = useState("");

  // Map layer
  const [tileLayer, setTileLayer] = useState<"street" | "satellite">("street");

  const devices = usePositions(initialDevices);

  // Geolocalisation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setMyPos([6.5244, 3.3792]);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setMyPos([6.5244, 3.3792]);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Charger devices + geofences
  useEffect(() => {
    Promise.all([
      fetch("/api/positions/latest").then((r) => r.json()),
      fetch("/api/devices").then((r) => r.json()),
      fetch("/api/geofences").then((r) => r.json()),
    ]).then(([posData, devData, geoData]) => {
      setInitialDevices(Array.isArray(posData) ? posData : []);
      setTrackDevices(Array.isArray(devData) ? devData : []);
      setGeofences(Array.isArray(geoData) ? geoData.filter((g: any) => g.isActive) : []);
      setLoading(false);
    });
  }, []);

  // Suivi position en mode navigation
  useEffect(() => {
    if (!isNavigating || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyPos([pos.coords.latitude, pos.coords.longitude]);
        setSpeed(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [isNavigating]);

  // Recherche Nominatim
  function handleSearchInput(query: string) {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "fr" } }
        );
        setSearchResults(await res.json());
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
  }

  function selectPlace(r: SearchResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setDestination([lat, lng]);
    setDestName(r.display_name.split(",").slice(0, 2).join(","));
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleMapClick(lat: number, lng: number) {
    if (isNavigating) return;
    setDestination([lat, lng]);
    setDestName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }

  const handleRouteFound = useCallback((info: { distance: number; time: number; steps: RouteStep[] }) => {
    setRouteInfo({ distance: info.distance, time: info.time });
    setRouteSteps(info.steps || []);
  }, []);

  function startNav() { setIsNavigating(true); setShowSteps(false); }

  function stopNav() {
    setIsNavigating(false);
    setDestination(null);
    setDestName("");
    setRouteInfo(null);
    setRouteSteps([]);
    setSpeed(0);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }

  function recenter() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
  }

  function refresh() {
    fetch("/api/positions/latest")
      .then((r) => r.json())
      .then((data) => setInitialDevices(Array.isArray(data) ? data : []));
  }

  // Tracking manuel
  function viewPosition() {
    const lat = parseFloat(trackLat);
    const lng = parseFloat(trackLng);
    if (isNaN(lat) || isNaN(lng)) return setTrackMsg("Coordonnees invalides");
    setManualMarker({ lat, lng });
    setTrackMsg(`Position affichee: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }

  async function sendPosition() {
    const lat = parseFloat(trackLat);
    const lng = parseFloat(trackLng);
    if (isNaN(lat) || isNaN(lng)) return setTrackMsg("Coordonnees invalides");
    if (!trackSerial) return setTrackMsg("Selectionnez un appareil");
    setSending(true); setTrackMsg("");
    try {
      const res = await fetch("/api/tracking/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNumber: trackSerial, latitude: lat, longitude: lng, speed: 0 }),
      });
      if (res.ok) { setTrackMsg("Position envoyee !"); setManualMarker({ lat, lng }); refresh(); }
      else { const err = await res.json(); setTrackMsg(err.error || "Erreur"); }
    } catch { setTrackMsg("Erreur reseau"); }
    setSending(false);
  }

  function fmt(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`; }
  function fmtTime(s: number) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}min` : `${m} min`; }
  function eta(s: number) { const d = new Date(); d.setSeconds(d.getSeconds() + s); return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }

  if (locating || loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-950 z-50">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-white text-lg">{locating ? "Localisation en cours..." : "Chargement..."}</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] -m-4 sm:-m-6 overflow-hidden">
      {/* Carte plein ecran */}
      <div className="absolute inset-0">
        <MainMap
          myPos={myPos}
          devices={devices}
          destination={destination}
          manualMarker={manualMarker}
          geofences={geofences}
          isNavigating={isNavigating}
          tileLayer={tileLayer}
          onMapClick={handleMapClick}
          onRouteFound={handleRouteFound}
        />
      </div>

      {/* Barre de recherche */}
      <div className="absolute top-3 left-3 right-14 sm:left-4 sm:right-auto sm:w-96 z-[1000]">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            {isNavigating ? (
              <>
                <Navigation className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{destName}</p>
                  {routeInfo && (
                    <p className="text-xs text-gray-500">{fmt(routeInfo.distance)} · {fmtTime(routeInfo.time)} · Arrivee {eta(routeInfo.time)}</p>
                  )}
                </div>
                <button onClick={stopNav} className="p-1.5 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </>
            ) : (
              <>
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Rechercher un lieu ou une adresse..."
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="p-1">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </>
            )}
          </div>
          {/* Resultats */}
          {searchResults.length > 0 && (
            <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => selectPlace(r)} className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-500">Recherche...</span>
            </div>
          )}
        </div>
      </div>

      {/* Boutons lateraux droite */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
        {/* Liste appareils */}
        <button
          onClick={() => { setShowDevices(!showDevices); setShowTracking(false); }}
          className={cn("p-2.5 rounded-full shadow-lg transition-colors", showDevices ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50")}
          title="Appareils"
        >
          <MapPin className="w-5 h-5" />
        </button>
        {/* Tracking manuel */}
        <button
          onClick={() => { setShowTracking(!showTracking); setShowDevices(false); }}
          className={cn("p-2.5 rounded-full shadow-lg transition-colors", showTracking ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50")}
          title="Tracking manuel"
        >
          <Crosshair className="w-5 h-5" />
        </button>
        {/* Couche satellite */}
        <button
          onClick={() => setTileLayer(tileLayer === "street" ? "satellite" : "street")}
          className="bg-white text-gray-700 hover:bg-gray-50 p-2.5 rounded-full shadow-lg transition-colors"
          title="Changer de vue"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* Bouton recentrer */}
      <button
        onClick={recenter}
        className="absolute right-3 z-[1000] bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
        style={{ bottom: destination && routeInfo ? (isNavigating ? "14rem" : "12rem") : "1.5rem" }}
      >
        <Locate className="w-5 h-5 text-blue-600" />
      </button>

      {/* Panneau appareils */}
      {showDevices && (
        <div className="absolute top-16 right-3 z-[1000] w-72 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[60vh]">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
            <p className="text-sm font-semibold text-gray-900">{devices.length} appareil(s)</p>
            <div className="flex items-center gap-2">
              <button onClick={refresh} className="p-1 hover:bg-gray-100 rounded">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[50vh]">
            {devices.length === 0 ? (
              <div className="p-6 text-center">
                <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Aucun appareil</p>
              </div>
            ) : (
              devices.map((d) => {
                const Icon = typeIcons[d.type] || MapPin;
                return (
                  <div key={d.id} className="px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">{d.name}</span>
                      <span className={cn("w-2 h-2 rounded-full shrink-0 ml-auto", statusColors[d.status])} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 pl-6">
                      {d.position?.speed != null && <span>{d.position.speed} km/h</span>}
                      {d.batteryLevel != null && <span>{d.batteryLevel}%</span>}
                      {d.position?.timestamp && <span>{new Date(d.position.timestamp).toLocaleTimeString("fr-FR")}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Panneau tracking manuel */}
      {showTracking && (
        <div className="absolute top-16 right-3 z-[1000] w-80 bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-blue-500" /> Tracking manuel
            </p>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="any" value={trackLat} onChange={(e) => setTrackLat(e.target.value)}
                placeholder="Latitude" className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500" />
              <input type="number" step="any" value={trackLng} onChange={(e) => setTrackLng(e.target.value)}
                placeholder="Longitude" className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500" />
            </div>
            <select value={trackSerial} onChange={(e) => setTrackSerial(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500">
              <option value="">-- Voir seulement --</option>
              {trackDevices.map((d: any) => <option key={d.id} value={d.serialNumber}>{d.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={viewPosition} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">
                <Eye className="w-4 h-4" /> Voir
              </button>
              <button onClick={sendPosition} disabled={sending || !trackSerial}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer
              </button>
            </div>
            {trackMsg && <p className={cn("text-xs", trackMsg.includes("!") ? "text-green-600" : "text-red-500")}>{trackMsg}</p>}
          </div>
        </div>
      )}

      {/* Panneau planification route */}
      {destination && routeInfo && !isNavigating && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl shadow-2xl">
          <div className="px-4 pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center gap-3 mb-3">
              <Flag className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-gray-900 truncate flex-1">{destName}</p>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-900">{fmt(routeInfo.distance)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-900">{fmtTime(routeInfo.time)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-500">Arrivee {eta(routeInfo.time)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <button onClick={startNav} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Navigation className="w-5 h-5" /> Demarrer
            </button>
            <button onClick={() => setShowSteps(!showSteps)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">
              Etapes
            </button>
            <button onClick={stopNav} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {showSteps && routeSteps.length > 0 && (
            <div className="border-t border-gray-100 max-h-48 overflow-y-auto px-4 py-2">
              {routeSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{step.instruction}</p>
                    <p className="text-xs text-gray-400">{fmt(step.distance)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panneau navigation active */}
      {isNavigating && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl shadow-2xl">
          <div className="px-4 pt-3 pb-4">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            {routeSteps.length > 0 && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <ArrowUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{routeSteps[0]?.instruction}</p>
                  <p className="text-xs text-blue-600">{fmt(routeSteps[0]?.distance || 0)}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <Gauge className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
                <p className="text-xl font-bold text-gray-900">{speed}</p>
                <p className="text-xs text-gray-500">km/h</p>
              </div>
              <div className="text-center">
                <Ruler className="w-4 h-4 text-green-500 mx-auto mb-0.5" />
                <p className="text-xl font-bold text-gray-900">{routeInfo ? fmt(routeInfo.distance) : "--"}</p>
                <p className="text-xs text-gray-500">restant</p>
              </div>
              <div className="text-center">
                <Clock className="w-4 h-4 text-purple-500 mx-auto mb-0.5" />
                <p className="text-xl font-bold text-gray-900">{routeInfo ? eta(routeInfo.time) : "--"}</p>
                <p className="text-xs text-gray-500">arrivee</p>
              </div>
            </div>
            <button onClick={stopNav} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
              Arreter la navigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
