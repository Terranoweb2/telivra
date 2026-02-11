"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "next-themes";
import "leaflet/dist/leaflet.css";

const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative"><div style="width:40px;height:40px;border-radius:50%;background:rgba(59,130,246,0.15);position:absolute;top:-11px;left:-11px;animation:dp 1.5s infinite"></div><div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:2"></div></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const clientIcon = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#10B981;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(16,185,129,0.4);display:flex;align-items:center;justify-content:center"><div style="width:12px;height:12px;border-radius:50%;background:white;transform:rotate(45deg)"></div></div>`,
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
});

const css = `@keyframes dp{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.8);opacity:0}}`;

function FitAll({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [points, map]);
  return null;
}

interface Props {
  driverPos: { lat: number; lng: number } | null;
  clientPos: { lat: number; lng: number };
  positions: { latitude: number; longitude: number; timestamp?: string }[];
  driverLabel?: string;
  clientLabel?: string;
}

export default function DeliveryTrackMap({ driverPos, clientPos, positions, driverLabel = "Livreur", clientLabel = "Client" }: Props) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center: [number, number] = driverPos ? [driverPos.lat, driverPos.lng] : [clientPos.lat, clientPos.lng];
  const trail: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);
  const fitPoints: [number, number][] = [[clientPos.lat, clientPos.lng]];
  if (driverPos) fitPoints.push([driverPos.lat, driverPos.lng]);
  const tiles = resolvedTheme === "dark" ? DARK_TILES : LIGHT_TILES;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <MapContainer center={center} zoom={14} className="h-full w-full" zoomControl={true} scrollWheelZoom={true}>
        <TileLayer attribution='&copy; OSM' url={tiles} />
        <FitAll points={fitPoints} />
        {trail.length >= 2 && <Polyline positions={trail} pathOptions={{ color: "#3B82F6", weight: 3, opacity: 0.6, dashArray: "6,4" }} />}
        {driverPos && (
          <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
            <Popup><div className="text-sm"><p className="font-semibold text-blue-600">{driverLabel}</p><p className="text-xs text-gray-500">{driverPos.lat.toFixed(5)}, {driverPos.lng.toFixed(5)}</p></div></Popup>
          </Marker>
        )}
        <Marker position={[clientPos.lat, clientPos.lng]} icon={clientIcon}>
          <Popup><div className="text-sm"><p className="font-semibold text-green-600">{clientLabel}</p></div></Popup>
        </Marker>
      </MapContainer>
    </>
  );
}
