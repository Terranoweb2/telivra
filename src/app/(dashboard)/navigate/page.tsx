"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Navigation, MapPin, Clock, Ruler, RotateCcw, Loader2, Search,
  Locate, X, ChevronUp, ChevronDown, Gauge, ArrowRight,
  CornerUpRight, CornerUpLeft, ArrowUp, CircleDot, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NavMap = dynamic(() => import("@/components/map/nav-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-950">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  ),
});

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

type NavState = "idle" | "planning" | "navigating";

export default function NavigatePage() {
  const [navState, setNavState] = useState<NavState>("idle");
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destName, setDestName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number } | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [showSteps, setShowSteps] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState<number | null>(null);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState("");
  const watchRef = useRef<number | null>(null);
  const searchTimeout = useRef<any>(null);

  // Geolocalisation automatique
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalisation non supportee");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setGeoError("Impossible d'obtenir votre position");
        setLocating(false);
        // Position par defaut Lagos
        setMyPos([6.5244, 3.3792]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Suivi continu de la position pendant la navigation
  useEffect(() => {
    if (navState !== "navigating" || !navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyPos([pos.coords.latitude, pos.coords.longitude]);
        setSpeed(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0);
        if (pos.coords.heading !== null) setHeading(pos.coords.heading);
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
  }, [navState]);

  // Recherche d'adresse (Nominatim)
  function handleSearchInput(query: string) {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "fr" } }
        );
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 400);
  }

  function selectDestination(result: SearchResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setDestination([lat, lng]);
    setDestName(result.display_name.split(",").slice(0, 2).join(","));
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
    setNavState("planning");
  }

  function handleMapClick(lat: number, lng: number) {
    if (navState === "navigating") return;
    setDestination([lat, lng]);
    setDestName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setNavState("planning");
  }

  const handleRouteFound = useCallback((info: { distance: number; time: number; steps: RouteStep[] }) => {
    setRouteInfo({ distance: info.distance, time: info.time });
    setRouteSteps(info.steps || []);
  }, []);

  function startNavigation() {
    setNavState("navigating");
    setShowSteps(false);
  }

  function stopNavigation() {
    setNavState("idle");
    setDestination(null);
    setDestName("");
    setRouteInfo(null);
    setRouteSteps([]);
    setSpeed(0);
    setHeading(null);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }

  function recenter() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setMyPos([pos.coords.latitude, pos.coords.longitude]);
    }, () => {}, { enableHighAccuracy: true });
  }

  function formatDistance(m: number) {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
  }

  function getETA(s: number) {
    const now = new Date();
    now.setSeconds(now.getSeconds() + s);
    return now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  if (locating) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-950 z-50">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-white text-lg">Localisation en cours...</p>
        <p className="text-gray-500 text-sm mt-1">Autorisez l acces a votre position</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] -m-4 sm:-m-6 overflow-hidden">
      {/* Carte plein ecran */}
      <div className="absolute inset-0">
        <NavMap
          myPos={myPos}
          destination={destination}
          isNavigating={navState === "navigating"}
          heading={heading}
          onMapClick={handleMapClick}
          onRouteFound={handleRouteFound}
        />
      </div>

      {/* Barre de recherche */}
      <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-[1000]">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            {navState === "navigating" ? (
              <>
                <Navigation className="w-5 h-5 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{destName}</p>
                  {routeInfo && (
                    <p className="text-xs text-gray-500">
                      {formatDistance(routeInfo.distance)} · {formatTime(routeInfo.time)} · Arrivee {getETA(routeInfo.time)}
                    </p>
                  )}
                </div>
                <button onClick={stopNavigation} className="p-1.5 hover:bg-gray-100 rounded-full">
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
                  onFocus={() => setShowSearch(true)}
                  placeholder="Rechercher un lieu..."
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

          {/* Resultats de recherche */}
          {showSearch && searchResults.length > 0 && (
            <div className="border-t border-gray-100 max-h-60 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => selectDestination(r)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                >
                  <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 line-clamp-2">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
          {showSearch && searching && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-sm text-gray-500">Recherche...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bouton recentrer */}
      <button
        onClick={recenter}
        className="absolute right-3 z-[1000] bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
        style={{ bottom: navState === "idle" ? "1.5rem" : navState === "planning" ? "10rem" : "11rem" }}
      >
        <Locate className="w-5 h-5 text-orange-600" />
      </button>

      {/* Panneau planification (quand destination selectionnee) */}
      {navState === "planning" && routeInfo && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl shadow-2xl">
          <div className="px-4 pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center gap-3 mb-3">
              <Flag className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{destName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-gray-900">{formatDistance(routeInfo.distance)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-900">{formatTime(routeInfo.time)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600">Arrivee {getETA(routeInfo.time)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={startNavigation}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Navigation className="w-5 h-5" /> Demarrer
            </button>
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors"
            >
              Etapes
            </button>
            <button
              onClick={stopNavigation}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {showSteps && routeSteps.length > 0 && (
            <div className="border-t border-gray-100 max-h-48 overflow-y-auto px-4 py-2">
              {routeSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-orange-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{step.instruction}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDistance(step.distance)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panneau navigation active */}
      {navState === "navigating" && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl shadow-2xl">
          <div className="px-4 pt-3 pb-4">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />

            {/* Prochaine instruction */}
            {routeSteps.length > 0 && (
              <div className="flex items-center gap-3 mb-4 p-3 bg-orange-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                  <ArrowUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{routeSteps[0]?.instruction}</p>
                  <p className="text-xs text-orange-600">{formatDistance(routeSteps[0]?.distance || 0)}</p>
                </div>
              </div>
            )}

            {/* Stats de navigation */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Gauge className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">{speed}</p>
                <p className="text-xs text-gray-500">km/h</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Ruler className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">{routeInfo ? formatDistance(routeInfo.distance) : "--"}</p>
                <p className="text-xs text-gray-500">restant</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">{routeInfo ? getETA(routeInfo.time) : "--"}</p>
                <p className="text-xs text-gray-500">arrivee</p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={stopNavigation}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Arreter la navigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
