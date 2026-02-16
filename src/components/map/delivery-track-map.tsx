"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILES = {
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  streets: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
};
const GOOGLE_SUBDOMAINS = ["mt0", "mt1", "mt2", "mt3"];

// Meme fleche nav que nav-map
const driverIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:56px;height:56px">
    <div style="position:absolute;inset:2px;border-radius:50%;border:2.5px solid rgba(66,133,244,0.35);animation:navPulse 2s ease-out infinite"></div>
    <div style="position:absolute;top:8px;left:8px;width:40px;height:40px">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#4285F4" stroke="white" stroke-width="3"/>
        <path d="M20 8 L13 30 L20 24.5 L27 30 Z" fill="white"/>
      </svg>
    </div>
  </div>`,
  iconSize: [56, 56], iconAnchor: [28, 28], popupAnchor: [0, -28],
});

// Meme pin destination que nav-map
const clientIcon = L.divIcon({
  className: "",
  html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">
    <svg width="34" height="46" viewBox="0 0 34 46">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 11.9 17 29 17 29s17-17.1 17-29C34 7.6 26.4 0 17 0z" fill="#EA4335"/>
      <circle cx="17" cy="17" r="6.5" fill="white"/>
      <circle cx="17" cy="17" r="3" fill="#EA4335"/>
    </svg>
  </div>`,
  iconSize: [34, 46], iconAnchor: [17, 46], popupAnchor: [0, -46],
});

const css = `
@keyframes navPulse{0%{transform:scale(0.8);opacity:1}100%{transform:scale(1.6);opacity:0}}
.leaflet-routing-container{display:none!important}
.leaflet-control-attribution{display:none!important}
.leaflet-control-zoom{display:none!important}
`;

function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 17 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [points, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timers = [100, 300, 600, 1000].map(ms =>
      setTimeout(() => map.invalidateSize(), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

function MapCapture({ onMap }: { onMap: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
}

interface Props {
  driverPos: { lat: number; lng: number } | null;
  clientPos: { lat: number; lng: number };
  positions: { latitude: number; longitude: number; timestamp?: string }[];
  routeCoords?: [number, number][];
  altRoutes?: [number, number][][];
  speed?: number;
  driverLabel?: string;
  clientLabel?: string;
}

export default function DeliveryTrackMap({ driverPos, clientPos, positions, routeCoords = [], altRoutes = [], speed = 0, driverLabel = "Livreur", clientLabel = "Client" }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tileType, setTileType] = useState<"hybrid" | "streets">("streets");
  const [mapInst, setMapInst] = useState<L.Map | null>(null);
  const handleMap = useCallback((m: L.Map) => setMapInst(m), []);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center: [number, number] = driverPos ? [driverPos.lat, driverPos.lng] : [clientPos.lat, clientPos.lng];
  const trail: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);
  const fitPoints: [number, number][] = [[clientPos.lat, clientPos.lng]];
  if (driverPos) fitPoints.push([driverPos.lat, driverPos.lng]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer key={tileType} url={TILES[tileType]} subdomains={GOOGLE_SUBDOMAINS} maxZoom={21} />
        <MapCapture onMap={handleMap} />
        <FitAll points={fitPoints} />
        <MapResizer />
        {driverPos && (
          <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
            <Popup><div className="text-sm"><p className="font-semibold text-blue-600">{driverLabel}</p></div></Popup>
          </Marker>
        )}
        <Marker position={[clientPos.lat, clientPos.lng]} icon={clientIcon}>
          <Popup><div className="text-sm"><p className="font-semibold text-red-600">{clientLabel}</p></div></Popup>
        </Marker>
        {altRoutes.map((alt, i) => alt.length > 1 && (
          <Polyline key={`alt-${i}`} positions={alt} color={i === 0 ? "#a855f7" : "#f59e0b"} weight={4} opacity={0.6} dashArray="10 8" />
        ))}
        {routeCoords.length > 1 && <Polyline positions={routeCoords} color="#4285F4" weight={6} opacity={0.9} />}
        {trail.length > 1 && <Polyline positions={trail} color="#4285F4" weight={3} opacity={0.4} />}
      </MapContainer>

      {/* Controles carte — meme style que nav-map */}
      <div style={{ position: "absolute", right: 12, top: 70, zIndex: 800, display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => setTileType(t => t === "hybrid" ? "streets" : "hybrid")}
          className="!bg-gray-800" style={{ width: 44, height: 44, borderRadius: 12, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {tileType === "hybrid" ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          )}
        </button>
        <button
          onClick={() => mapInst?.zoomIn()}
          className="!bg-gray-800 !text-gray-200" style={{ width: 44, height: 44, borderRadius: 12, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", cursor: "pointer", fontSize: 22, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
        >+</button>
        <button
          onClick={() => mapInst?.zoomOut()}
          className="!bg-gray-800 !text-gray-200" style={{ width: 44, height: 44, borderRadius: 12, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.18)", cursor: "pointer", fontSize: 22, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
        >−</button>
      </div>

      {/* Badge vitesse — meme style que nav-map */}
      {driverPos && (
        <div className="bg-gray-800 border-[3px] border-gray-800" style={{
          position: "absolute", bottom: 16, left: 16, zIndex: 900,
          width: 64, height: 64, borderRadius: "50%",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span className="text-white" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{speed}</span>
          <span className="text-gray-400" style={{ fontSize: 9, fontWeight: 600, marginTop: 1 }}>km/h</span>
        </div>
      )}
    </div>
  );
}
