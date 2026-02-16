"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Position {
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
}

function FitPolyline({ positions }: { positions: Position[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [positions, map]);
  return null;
}

export default function TripMap({ positions }: { positions: Position[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || positions.length === 0) return null;

  const coords: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);
  const start = positions[0];
  const end = positions[positions.length - 1];

  return (
    <MapContainer center={coords[0]} zoom={13} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitPolyline positions={positions} />
      <Polyline positions={coords} pathOptions={{ color: "#3B82F6", weight: 4, opacity: 0.8 }} />
      <CircleMarker center={[start.latitude, start.longitude]} radius={8} pathOptions={{ color: "#10B981", fillColor: "#10B981", fillOpacity: 1 }}>
        <Popup>Départ - {new Date(start.timestamp).toLocaleTimeString("fr-FR")}</Popup>
      </CircleMarker>
      <CircleMarker center={[end.latitude, end.longitude]} radius={8} pathOptions={{ color: "#EF4444", fillColor: "#EF4444", fillOpacity: 1 }}>
        <Popup>Arrivée - {new Date(end.timestamp).toLocaleTimeString("fr-FR")}</Popup>
      </CircleMarker>
    </MapContainer>
  );
}
