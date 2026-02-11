"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icones Leaflet avec Next.js
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

function FitBounds({ devices }: { devices: DeviceWithPosition[] }) {
  const map = useMap();
  useEffect(() => {
    if (devices.length === 0) return;
    const bounds = L.latLngBounds(devices.map((d) => [d.position.latitude, d.position.longitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [devices, map]);
  return null;
}

interface MapProps {
  devices: DeviceWithPosition[];
  className?: string;
}

export default function GPSMap({ devices, className }: MapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center: [number, number] =
    devices.length > 0
      ? [devices[0].position.latitude, devices[0].position.longitude]
      : [6.5244, 3.3792]; // Lagos par defaut

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
      {devices.length > 0 && <FitBounds devices={devices} />}
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
                <p>Mis a jour: {new Date(device.position.timestamp).toLocaleTimeString("fr-FR")}</p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
