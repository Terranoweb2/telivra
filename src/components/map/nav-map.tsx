"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Marqueur position actuelle (point bleu Google Maps style)
const myPosIcon = L.divIcon({
  className: "my-pos-marker",
  html: `<div style="position:relative;">
    <div style="width:40px;height:40px;border-radius:50%;background:rgba(66,133,244,0.15);position:absolute;top:-12px;left:-12px;animation:pulse-ring 1.5s infinite;"></div>
    <div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);position:relative;z-index:1;"></div>
  </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Marqueur destination (pin rouge Google Maps style)
const destIcon = L.divIcon({
  className: "dest-marker",
  html: `<div style="position:relative;width:30px;height:42px;">
    <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#EA4335;transform:rotate(-45deg);position:absolute;top:0;left:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
    <div style="width:10px;height:10px;border-radius:50%;background:white;position:absolute;top:10px;left:10px;"></div>
    <div style="width:4px;height:8px;background:#B31412;position:absolute;bottom:0;left:13px;border-radius:0 0 2px 2px;"></div>
  </div>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -42],
});

// Style CSS pour l'animation pulse
const pulseStyle = `
@keyframes pulse-ring {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}
.leaflet-routing-container { display: none !important; }
`;

interface RouteStep {
  instruction: string;
  distance: number;
  time: number;
}

interface Props {
  myPos: [number, number] | null;
  destination: [number, number] | null;
  isNavigating: boolean;
  heading: number | null;
  onMapClick: (lat: number, lng: number) => void;
  onRouteFound: (info: { distance: number; time: number; steps: RouteStep[] }) => void;
}

function MapController({ myPos, isNavigating, heading }: { myPos: [number, number] | null; isNavigating: boolean; heading: number | null }) {
  const map = useMap();
  const initialized = useRef(false);

  // Centrer sur la position initiale
  useEffect(() => {
    if (myPos && !initialized.current) {
      map.setView(myPos, 16);
      initialized.current = true;
    }
  }, [myPos, map]);

  // Suivi pendant la navigation
  useEffect(() => {
    if (isNavigating && myPos) {
      map.setView(myPos, 17, { animate: true, duration: 0.5 });
    }
  }, [isNavigating, myPos, map]);

  return null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RoutingEngine({
  from,
  to,
  onRouteFound,
}: {
  from: [number, number];
  to: [number, number];
  onRouteFound: (info: { distance: number; time: number; steps: RouteStep[] }) => void;
}) {
  const map = useMap();
  const controlRef = useRef<any>(null);

  useEffect(() => {
    if (controlRef.current) {
      try { map.removeControl(controlRef.current); } catch {}
      controlRef.current = null;
    }

    const control = (L as any).Routing.control({
      waypoints: [L.latLng(from[0], from[1]), L.latLng(to[0], to[1])],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      createMarker: () => null,
      lineOptions: {
        styles: [{ color: "#4285F4", weight: 6, opacity: 0.9 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
    });

    control.on("routesfound", (e: any) => {
      const route = e.routes[0];
      const steps: RouteStep[] = (route.instructions || []).map((inst: any) => ({
        instruction: inst.text,
        distance: inst.distance,
        time: inst.time,
      }));
      onRouteFound({
        distance: route.summary.totalDistance,
        time: route.summary.totalTime,
        steps,
      });
    });

    control.addTo(map);
    controlRef.current = control;

    return () => {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current); } catch {}
        controlRef.current = null;
      }
    };
  }, [from, to, map, onRouteFound]);

  return null;
}

export default function NavMap({ myPos, destination, isNavigating, heading, onMapClick, onRouteFound }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center: [number, number] = myPos || [6.5244, 3.3792];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pulseStyle }} />
      <MapContainer
        center={center}
        zoom={16}
        className="h-full w-full"
        zoomControl={false}
        style={{ background: "#1a1a2e" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController myPos={myPos} isNavigating={isNavigating} heading={heading} />
        <MapClickHandler onClick={onMapClick} />

        {/* Position actuelle */}
        {myPos && (
          <Marker position={myPos} icon={myPosIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-orange-600">Ma position</p>
                <p className="text-gray-500 text-xs">{myPos[0].toFixed(6)}, {myPos[1].toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination */}
        {destination && (
          <Marker position={destination} icon={destIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-red-600">Destination</p>
                <p className="text-gray-500 text-xs">{destination[0].toFixed(6)}, {destination[1].toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route */}
        {myPos && destination && (
          <RoutingEngine from={myPos} to={destination} onRouteFound={onRouteFound} />
        )}
      </MapContainer>
    </>
  );
}
