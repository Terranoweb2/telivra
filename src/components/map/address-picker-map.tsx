"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin, Crosshair, Search, Loader2, X, Globe, Map, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

interface AddressPickerMapProps {
  onSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  className?: string;
  fullHeight?: boolean;
}

// Tuiles Google Maps (identiques à maps.google.com)
const TILES = {
  streets: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",       // Plan (routes, POI, labels)
  satellite: "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",     // Satellite seul
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",        // Satellite + labels
  terrain: "https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",       // Relief
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", // Dark (mode embarqué)
};
const GOOGLE_SUBDOMAINS = ["mt0", "mt1", "mt2", "mt3"];

export default function AddressPickerMap({
  onSelect,
  initialLat,
  initialLng,
  className,
  fullHeight,
}: AddressPickerMapProps) {
  const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = require("react-leaflet");
  const L = require("leaflet");

  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [locating, setLocating] = useState(false);
  const [layer, setLayer] = useState<"streets" | "satellite">("streets");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<any>(null);

  // Pin Google Maps style (teardrop orange avec centre blanc)
  const icon = L.divIcon({
    className: "",
    html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35));animation:markerDrop 0.3s ease-out">
      <svg width="34" height="46" viewBox="0 0 34 46">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 11.9 17 29 17 29s17-17.1 17-29C34 7.6 26.4 0 17 0z" fill="#ea580c"/>
        <circle cx="17" cy="17" r="6.5" fill="white"/>
        <circle cx="17" cy="17" r="3" fill="#ea580c"/>
      </svg>
    </div>`,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
  });

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `/api/geocode/reverse?lat=${lat}&lon=${lng}`,
      );
      const data = await res.json();
      const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onSelect(lat, lng, addr);
    } catch {
      const addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onSelect(lat, lng, addr);
    }
  }, [onSelect]);

  const searchPlace = useCallback(async (query: string) => {
    if (!query.trim()) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/geocode/search?q=${encodeURIComponent(query)}`,
      );
      setSuggestions(await res.json());
    } catch {
      setSuggestions([]);
    }
    setSearching(false);
  }, []);

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlace(value), 300);
  }, [searchPlace]);

  function MapClickHandler() {
    useMapEvents({
      click(e: any) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
      },
    });
    return null;
  }

  function MapController() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
      // Forcer Leaflet à recalculer la taille du conteneur (fix tiles dans modals/dialogs)
      const timers = [100, 300, 600, 1000].map(ms =>
        setTimeout(() => map.invalidateSize(), ms)
      );
      return () => timers.forEach(clearTimeout);
    }, [map]);
    useEffect(() => {
      if (position) {
        setTimeout(() => map.invalidateSize(), 50);
        map.flyTo(position, 17, { duration: 0.5 });
      }
    }, [map, position]);
    // Recalculer quand on change de couche
    useEffect(() => {
      setTimeout(() => map.invalidateSize(), 100);
    }, [map, layer]);
    return null;
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Géolocalisation automatique au chargement (si pas de position initiale)
  useEffect(() => {
    if (!position && fullHeight) {
      locateMe();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectSuggestion(item: any) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setPosition([lat, lng]);
    setAddress(item.display_name);
    setSearchQuery("");
    setSuggestions([]);
    onSelect(lat, lng, item.display_name);
  }

  const defaultCenter: [number, number] = [6.3703, 2.3912];

  /* ====== BARRE DE RECHERCHE ====== */
  const searchBar = (
    <div className="relative">
      <div className={cn(
        "flex items-center rounded-xl overflow-hidden",
        fullHeight
          ? "bg-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.12)] border border-gray-700"
          : "bg-gray-800 border border-gray-700"
      )}>
        <Search className={cn("w-4 h-4 ml-3.5 shrink-0", fullHeight ? "text-[#5f6368]" : "text-gray-500")} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Rechercher un lieu..."
          className={cn(
            "flex-1 pl-2.5 pr-2 py-3 text-sm focus:outline-none bg-transparent",
            fullHeight ? "text-gray-900 placeholder:text-[#9aa0a6]" : "text-white placeholder:text-gray-500"
          )}
        />
        {searching && <Loader2 className="w-4 h-4 text-orange-500 animate-spin mr-2 shrink-0" />}
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setSuggestions([]); }} className="p-2 mr-0.5 shrink-0">
            <X className={cn("w-4 h-4", fullHeight ? "text-[#5f6368]" : "text-gray-500")} />
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <div className={cn(
          "absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden shadow-xl max-h-52 overflow-y-auto z-50",
          fullHeight ? "bg-gray-900 border border-gray-700" : "bg-gray-900 border border-gray-700"
        )}>
          {suggestions.map((item: any, idx: number) => (
            <button key={idx} onClick={() => selectSuggestion(item)}
              className={cn(
                "w-full text-left px-3.5 py-2.5 text-sm flex items-start gap-2.5 transition-colors",
                fullHeight
                  ? "text-gray-700 hover:bg-gray-800 border-b border-gray-700 last:border-0"
                  : "text-gray-300 hover:bg-gray-800 border-b border-gray-800 last:border-0"
              )}>
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ====== MODE PLEIN ECRAN (style Google Maps) ====== */
  if (fullHeight) {
    return (
      <div className={cn("relative w-full", className)} style={{ height: "100%" }}>
        {/* Carte */}
        <div style={{ position: "absolute", inset: 0 }}>
          <MapContainer
            center={position || defaultCenter}
            zoom={position ? 17 : 13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              key={layer}
              url={layer === "streets" ? TILES.streets : TILES.hybrid}
              subdomains={GOOGLE_SUBDOMAINS}
              maxZoom={layer === "streets" ? 21 : 19}
            />
            <MapClickHandler />
            <MapController />
            {position && <Marker position={position} icon={icon} />}
          </MapContainer>
        </div>

        {/* Recherche */}
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 1000 }}>
          {searchBar}
        </div>

        {/* Indication quand aucun point — cliquable pour géolocaliser */}
        {!position && (
          <div
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 999 }}
          >
            <button
              onClick={locateMe}
              disabled={locating}
              className="bg-gray-900/95 backdrop-blur-sm text-gray-300 text-sm px-5 py-2.5 rounded-full shadow-lg font-medium flex items-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
            >
              {locating ? (
                <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 text-orange-500" />
              )}
              {locating ? "Localisation en cours..." : "Touchez pour placer le repère"}
            </button>
          </div>
        )}

        {/* Contrôles droite : zoom + couches + localisation */}
        <div
          style={{ position: "absolute", right: 12, bottom: address ? 72 : 16, zIndex: 1000 }}
          className="flex flex-col gap-2"
        >
          {/* Zoom */}
          <div className="bg-gray-900 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.15)] overflow-hidden">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors text-[#666]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <div className="h-px bg-gray-200" />
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors text-[#666]"
            >
              <Minus className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Bascule Plan / Satellite */}
          <button
            onClick={() => setLayer(layer === "streets" ? "satellite" : "streets")}
            className="w-10 h-10 bg-gray-900 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.15)] flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
            title={layer === "streets" ? "Vue satellite" : "Vue plan"}
          >
            {layer === "streets" ? (
              <Globe className="w-4 h-4 text-[#666]" />
            ) : (
              <Map className="w-4 h-4 text-[#666]" />
            )}
          </button>

          {/* Ma position */}
          <button
            onClick={locateMe}
            disabled={locating}
            className="w-10 h-10 bg-gray-900 rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.15)] flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
            title="Ma position"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            ) : (
              <Crosshair className="w-4 h-4 text-[#666]" />
            )}
          </button>
        </div>

        {/* Barre d'adresse en bas */}
        {address && (
          <div style={{ position: "absolute", bottom: 12, left: 12, right: 64, zIndex: 1000 }}>
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-gray-900 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{address}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ====== MODE NORMAL (intégré dans dark UI) ====== */
  return (
    <div className={cn("space-y-2", className)}>
      {searchBar}
      <div className="relative rounded-xl overflow-hidden border border-gray-700" style={{ height: "250px" }}>
        <MapContainer
          center={position || defaultCenter}
          zoom={position ? 16 : 13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer url={TILES.dark} />
          <MapClickHandler />
          <MapController />
          {position && <Marker position={position} icon={icon} />}
        </MapContainer>
        <button
          onClick={locateMe}
          disabled={locating}
          className="absolute bottom-3 right-3 z-[400] p-2.5 bg-gray-900/90 hover:bg-gray-800 border border-gray-700 rounded-lg text-white transition-colors shadow-lg"
          title="Ma position"
        >
          {locating ? (
            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          ) : (
            <Crosshair className="w-4 h-4 text-orange-400" />
          )}
        </button>
      </div>
      {address && (
        <div className="flex items-start gap-2 px-3 py-2 bg-orange-600/10 border border-orange-500/20 rounded-lg">
          <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300 leading-relaxed">{address}</p>
        </div>
      )}
    </div>
  );
}
