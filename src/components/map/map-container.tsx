"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createIcon = (color: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });

const manualIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#EF4444;width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;">
    <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid white;transform:rotate(180deg);"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const typeColors: Record<string, string> = {
  VEHICLE: "#3B82F6",
  PERSON: "#10B981",
  ASSET: "#F59E0B",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  MAINTENANCE: "Maintenance",
  LOST: "Perdu",
};

interface DeviceWithPosition {
  id: string;
  name: string;
  type: string;
  status: string;
  batteryLevel: number | null;
  vehicle?: { brand: string; model: string; licensePlate: string } | null;
  person?: { firstName: string; lastName: string } | null;
  asset?: { name: string; category: string } | null;
  position: { latitude: number; longitude: number; speed: number | null; timestamp: string };
}

interface GeofenceData {
  id: string;
  name: string;
  type: "CIRCLE" | "POLYGON";
  centerLat: number | null;
  centerLng: number | null;
  radiusMeters: number | null;
  coordinates: number[][] | null;
  color: string;
  isActive: boolean;
}

function FitBounds({ devices, manualMarker }: { devices: DeviceWithPosition[]; manualMarker?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = devices.map((d) => [d.position.latitude, d.position.longitude]);
    if (manualMarker) points.push([manualMarker.lat, manualMarker.lng]);
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [devices, manualMarker, map]);
  return null;
}

function FlyToMarker({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([position.lat, position.lng], 15, { duration: 1 });
  }, [position, map]);
  return null;
}

interface MapProps {
  devices: DeviceWithPosition[];
  manualMarker?: { lat: number; lng: number } | null;
  geofences?: GeofenceData[];
  className?: string;
}

export default function GPSMap({ devices, manualMarker, geofences = [], className }: MapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center: [number, number] =
    manualMarker ? [manualMarker.lat, manualMarker.lng]
    : devices.length > 0
      ? [devices[0].position.latitude, devices[0].position.longitude]
      : [6.5244, 3.3792];

  return (
    <MapContainer
      center={center}
      zoom={12}
      className={className || "h-full w-full rounded-xl"}
      style={{ minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {devices.length > 0 && !manualMarker && <FitBounds devices={devices} />}
      {manualMarker && <FlyToMarker position={manualMarker} />}

      {/* Geofences */}
      {geofences.map((g) => {
        if (g.type === "CIRCLE" && g.centerLat && g.centerLng && g.radiusMeters) {
          return (
            <Circle
              key={g.id}
              center={[g.centerLat, g.centerLng]}
              radius={g.radiusMeters}
              pathOptions={{ color: g.color, fillColor: g.color, fillOpacity: 0.12, weight: 2 }}
            >
              <Popup><div className="text-sm"><p className="font-bold">{g.name}</p><p className="text-gray-500">Rayon: {g.radiusMeters}m</p></div></Popup>
            </Circle>
          );
        }
        if (g.type === "POLYGON" && g.coordinates && g.coordinates.length >= 3) {
          return (
            <Polygon
              key={g.id}
              positions={g.coordinates.map((c: number[]) => [c[0], c[1]] as [number, number])}
              pathOptions={{ color: g.color, fillColor: g.color, fillOpacity: 0.12, weight: 2 }}
            >
              <Popup><div className="text-sm"><p className="font-bold">{g.name}</p><p className="text-gray-500">{g.coordinates.length} points</p></div></Popup>
            </Polygon>
          );
        }
        return null;
      })}

      {/* Manual marker */}
      {manualMarker && (
        <Marker position={[manualMarker.lat, manualMarker.lng]} icon={manualIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-red-600">Position manuelle</p>
              <p className="text-gray-600">Lat: {manualMarker.lat.toFixed(6)}</p>
              <p className="text-gray-600">Lng: {manualMarker.lng.toFixed(6)}</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Devices */}
      {devices.map((device) => (
        <Marker
          key={device.id}
          position={[device.position.latitude, device.position.longitude]}
          icon={createIcon(typeColors[device.type] || "#6B7280")}
        >
          <Popup>
            <div className="text-sm min-w-[180px]">
              <p className="font-bold text-gray-900">{device.name}</p>
              <p className="text-gray-600 text-xs">
                {device.type === "VEHICLE" && device.vehicle
                  ? `${device.vehicle.brand} ${device.vehicle.model} - ${device.vehicle.licensePlate}`
                  : device.type === "PERSON" && device.person
                  ? `${device.person.firstName} ${device.person.lastName}`
                  : device.asset?.name || ""}
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                <p>Statut: {statusLabels[device.status] || device.status}</p>
                {device.position.speed != null && <p>Vitesse: {device.position.speed} km/h</p>}
                {device.batteryLevel != null && <p>Batterie: {device.batteryLevel}%</p>}
                <p>Mis à jour: {new Date(device.position.timestamp).toLocaleTimeString("fr-FR")}</p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
