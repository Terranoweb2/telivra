"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// === ICONES ===
const myPosIcon = L.divIcon({
  className: "my-pos-marker",
  html: `<div style="position:relative;">
    <div style="width:44px;height:44px;border-radius:50%;background:rgba(66,133,244,0.15);position:absolute;top:-14px;left:-14px;animation:gps-pulse 1.5s infinite;"></div>
    <div style="width:18px;height:18px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:2;"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destIcon = L.divIcon({
  className: "dest-marker",
  html: `<div style="position:relative;width:30px;height:42px;">
    <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#EA4335;transform:rotate(-45deg);position:absolute;top:0;left:0;box-shadow:0 3px 10px rgba(234,67,53,0.4);"></div>
    <div style="width:10px;height:10px;border-radius:50%;background:white;position:absolute;top:10px;left:10px;"></div>
  </div>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42],
});

const manualIcon = L.divIcon({
  className: "manual-marker",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#F59E0B;border:3px solid white;box-shadow:0 2px 8px rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;">
    <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const createDeviceIcon = (color: string) =>
  L.divIcon({
    className: "device-marker",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });

const typeColors: Record<string, string> = { VEHICLE: "#3B82F6", PERSON: "#10B981", ASSET: "#F59E0B" };
const statusLabels: Record<string, string> = { ACTIVE: "Actif", INACTIVE: "Inactif", MAINTENANCE: "Maintenance", LOST: "Perdu" };

const globalStyles = `
@keyframes gps-pulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
.leaflet-routing-container { display: none !important; }
.setting-pos-cursor { cursor: crosshair !important; }
`;

const tiles = {
  street: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>' },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: '&copy; Esri' },
};

// === SUB-COMPONENTS ===
function MapController({ myPos, isNavigating }: { myPos: [number, number] | null; isNavigating: boolean }) {
  const map = useMap();
  const init = useRef(false);
  useEffect(() => {
    if (myPos && !init.current) { map.setView(myPos, 15); init.current = true; }
  }, [myPos, map]);
  useEffect(() => {
    if (isNavigating && myPos) map.setView(myPos, 17, { animate: true, duration: 0.5 });
  }, [isNavigating, myPos, map]);
  return null;
}

function CursorMode({ settingPos }: { settingPos: boolean }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (settingPos) el.classList.add("setting-pos-cursor");
    else el.classList.remove("setting-pos-cursor");
    return () => el.classList.remove("setting-pos-cursor");
  }, [settingPos, map]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

interface RouteStep { instruction: string; distance: number; time: number; }

function RoutingEngine({ from, to, onRouteFound }: {
  from: [number, number]; to: [number, number];
  onRouteFound: (info: { distance: number; time: number; steps: RouteStep[] }) => void;
}) {
  const map = useMap();
  const ref = useRef<any>(null);
  useEffect(() => {
    if (ref.current) { try { map.removeControl(ref.current); } catch {} ref.current = null; }
    const ctrl = (L as any).Routing.control({
      waypoints: [L.latLng(from[0], from[1]), L.latLng(to[0], to[1])],
      routeWhileDragging: false, addWaypoints: false, fitSelectedRoutes: true, show: false,
      createMarker: () => null,
      lineOptions: { styles: [{ color: "#4285F4", weight: 6, opacity: 0.85 }], extendToWaypoints: true, missingRouteTolerance: 0 },
    });
    ctrl.on("routesfound", (e: any) => {
      const r = e.routes[0];
      onRouteFound({
        distance: r.summary.totalDistance, time: r.summary.totalTime,
        steps: (r.instructions || []).map((i: any) => ({ instruction: i.text, distance: i.distance, time: i.time })),
      });
    });
    ctrl.addTo(map); ref.current = ctrl;
    return () => { if (ref.current) { try { map.removeControl(ref.current); } catch {} ref.current = null; } };
  }, [from, to, map, onRouteFound]);
  return null;
}

// === TYPES ===
interface DeviceWithPosition {
  id: string; name: string; type: string; status: string; batteryLevel: number | null;
  vehicle?: { brand: string; model: string; licensePlate: string } | null;
  person?: { firstName: string; lastName: string } | null;
  asset?: { name: string; category: string } | null;
  position: { latitude: number; longitude: number; speed: number | null; timestamp: string };
}

interface GeofenceData {
  id: string; name: string; type: "CIRCLE" | "POLYGON";
  centerLat: number | null; centerLng: number | null; radiusMeters: number | null;
  coordinates: number[][] | null; color: string; isActive: boolean;
}

interface Props {
  myPos: [number, number] | null;
  devices: DeviceWithPosition[];
  destination: [number, number] | null;
  manualMarker: { lat: number; lng: number } | null;
  geofences: GeofenceData[];
  isNavigating: boolean;
  tileLayer: "street" | "satellite";
  accuracy: number | null;
  settingPos: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onRouteFound: (info: { distance: number; time: number; steps: RouteStep[] }) => void;
}

export default function MainMap({ myPos, devices, destination, manualMarker, geofences, isNavigating, tileLayer, accuracy, settingPos, onMapClick, onRouteFound }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center: [number, number] = myPos || [6.5244, 3.3792];
  const tile = tiles[tileLayer];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={false} style={{ background: "#1a1a2e" }}>
        <TileLayer attribution={tile.attr} url={tile.url} />
        <MapController myPos={myPos} isNavigating={isNavigating} />
        <CursorMode settingPos={settingPos} />
        <ClickHandler onClick={onMapClick} />

        {/* Cercle de precision */}
        {myPos && accuracy && accuracy > 10 && (
          <Circle center={myPos} radius={accuracy}
            pathOptions={{ color: "#4285F4", fillColor: "#4285F4", fillOpacity: 0.08, weight: 1, dashArray: "4,4" }} />
        )}

        {/* Position utilisateur */}
        {myPos && (
          <Marker position={myPos} icon={myPosIcon} zIndexOffset={1000}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-blue-600">Ma position</p>
                <p className="text-gray-500 text-xs">{myPos[0].toFixed(6)}, {myPos[1].toFixed(6)}</p>
                {accuracy !== null && accuracy > 0 && <p className="text-gray-400 text-xs">Precision: ±{accuracy}m</p>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination */}
        {destination && (
          <Marker position={destination} icon={destIcon} zIndexOffset={900}>
            <Popup><div className="text-sm"><p className="font-semibold text-red-600">Destination</p><p className="text-gray-500 text-xs">{destination[0].toFixed(6)}, {destination[1].toFixed(6)}</p></div></Popup>
          </Marker>
        )}

        {/* Route */}
        {myPos && destination && <RoutingEngine from={myPos} to={destination} onRouteFound={onRouteFound} />}

        {/* Marqueur manuel */}
        {manualMarker && (
          <Marker position={[manualMarker.lat, manualMarker.lng]} icon={manualIcon} zIndexOffset={800}>
            <Popup><div className="text-sm"><p className="font-semibold text-amber-600">Position manuelle</p><p className="text-gray-500 text-xs">{manualMarker.lat.toFixed(6)}, {manualMarker.lng.toFixed(6)}</p></div></Popup>
          </Marker>
        )}

        {/* Geofences */}
        {geofences.map((g) => {
          if (g.type === "CIRCLE" && g.centerLat && g.centerLng && g.radiusMeters) {
            return (
              <Circle key={g.id} center={[g.centerLat, g.centerLng]} radius={g.radiusMeters}
                pathOptions={{ color: g.color, fillColor: g.color, fillOpacity: 0.1, weight: 2 }}>
                <Popup><div className="text-sm"><p className="font-bold">{g.name}</p><p className="text-gray-500">Rayon: {g.radiusMeters}m</p></div></Popup>
              </Circle>
            );
          }
          if (g.type === "POLYGON" && g.coordinates && g.coordinates.length >= 3) {
            return (
              <Polygon key={g.id} positions={g.coordinates.map((c: number[]) => [c[0], c[1]] as [number, number])}
                pathOptions={{ color: g.color, fillColor: g.color, fillOpacity: 0.1, weight: 2 }}>
                <Popup><div className="text-sm"><p className="font-bold">{g.name}</p></div></Popup>
              </Polygon>
            );
          }
          return null;
        })}

        {/* Appareils */}
        {devices.map((d) => (
          <Marker key={d.id} position={[d.position.latitude, d.position.longitude]}
            icon={createDeviceIcon(typeColors[d.type] || "#6B7280")}>
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-bold text-gray-900">{d.name}</p>
                <p className="text-gray-600 text-xs">
                  {d.type === "VEHICLE" && d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model} - ${d.vehicle.licensePlate}`
                    : d.type === "PERSON" && d.person ? `${d.person.firstName} ${d.person.lastName}`
                    : d.asset?.name || ""}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                  <p>Statut: {statusLabels[d.status] || d.status}</p>
                  {d.position.speed != null && <p>Vitesse: {d.position.speed} km/h</p>}
                  {d.batteryLevel != null && <p>Batterie: {d.batteryLevel}%</p>}
                  <p>{new Date(d.position.timestamp).toLocaleTimeString("fr-FR")}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
