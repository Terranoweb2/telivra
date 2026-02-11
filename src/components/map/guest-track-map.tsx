"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const clientIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ driverPos, clientPos }: { driverPos: { lat: number; lng: number } | null; clientPos: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [[clientPos.lat, clientPos.lng]];
    if (driverPos) points.push([driverPos.lat, driverPos.lng]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 16 });
    }
  }, [driverPos?.lat, driverPos?.lng, clientPos.lat, clientPos.lng]);
  return null;
}

interface Props {
  driverPos: { lat: number; lng: number } | null;
  clientPos: { lat: number; lng: number };
  positions?: { latitude: number; longitude: number }[];
}

export default function GuestTrackMap({ driverPos, clientPos, positions = [] }: Props) {
  const center = driverPos || clientPos;
  const trail: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="" />
      <FitBounds driverPos={driverPos} clientPos={clientPos} />
      <Marker position={[clientPos.lat, clientPos.lng]} icon={clientIcon}>
        <Popup>Adresse de livraison</Popup>
      </Marker>
      {driverPos && (
        <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
          <Popup>Votre livreur</Popup>
        </Marker>
      )}
      {trail.length > 1 && <Polyline positions={trail} color="#3b82f6" weight={3} opacity={0.6} />}
    </MapContainer>
  );
}
