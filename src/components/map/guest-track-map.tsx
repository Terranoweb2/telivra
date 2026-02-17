"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILES = {
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  streets: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
};
const GOOGLE_SUBDOMAINS = ["mt0", "mt1", "mt2", "mt3"];

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:80px;height:90px">
    <div style="position:absolute;top:0;left:8px;width:64px;height:64px">
      <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(66,133,244,0.6);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite"></div>
      <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(66,133,244,0.6);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;animation-delay:1s"></div>
      <svg style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)" width="34" height="34" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="17" fill="#4285F4" stroke="white" stroke-width="2.5"/>
        <circle cx="11" cy="23" r="4.5" fill="none" stroke="white" stroke-width="1.8"/>
        <g><animateTransform attributeName="transform" type="rotate" from="0 11 23" to="360 11 23" dur="0.8s" repeatCount="indefinite"/><line x1="11" y1="18.5" x2="11" y2="27.5" stroke="white" stroke-width="0.7" opacity="0.5"/><line x1="6.5" y1="23" x2="15.5" y2="23" stroke="white" stroke-width="0.7" opacity="0.5"/></g>
        <circle cx="25" cy="23" r="4.5" fill="none" stroke="white" stroke-width="1.8"/>
        <g><animateTransform attributeName="transform" type="rotate" from="0 25 23" to="360 25 23" dur="0.8s" repeatCount="indefinite"/><line x1="25" y1="18.5" x2="25" y2="27.5" stroke="white" stroke-width="0.7" opacity="0.5"/><line x1="20.5" y1="23" x2="29.5" y2="23" stroke="white" stroke-width="0.7" opacity="0.5"/></g>
        <path d="M11 23 L15 15 L21 15" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18 15 L25 23" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M18 15 L16 11" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="20" cy="9" r="2.5" fill="white"/>
        <g><animate attributeName="opacity" values="1;0.6;1" dur="0.6s" repeatCount="indefinite"/><line x1="7" y1="9" x2="5" y2="7" stroke="white" stroke-width="1" stroke-linecap="round" opacity="0.6"/><line x1="8" y1="7" x2="6" y2="5" stroke="white" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/></g>
      </svg>
    </div>
    <div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);background:#4285F4;color:white;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;white-space:nowrap;letter-spacing:0.4px;box-shadow:0 2px 6px rgba(66,133,244,0.5);border:1.5px solid white;font-family:system-ui,sans-serif">Livreur</div>
  </div>`,
  iconSize: [80, 90], iconAnchor: [40, 45], popupAnchor: [0, -36],
});

const clientIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:60px;height:68px">
    <div style="position:absolute;top:11px;left:13px;width:34px;height:34px;border-radius:50%;border:2px solid rgba(234,88,12,0.4);animation:vortex 2.5s linear infinite"></div>
    <div style="position:absolute;top:15px;left:17px;width:26px;height:26px;border-radius:50%;border:1.5px dashed rgba(234,88,12,0.3);animation:vortex 3.5s linear infinite reverse"></div>
    <div style="position:absolute;top:18px;left:20px;width:20px;height:20px;border-radius:50%;background:rgba(234,88,12,0.1);animation:vPulse 2s ease-in-out infinite"></div>
    <div style="position:absolute;top:0;left:13px;z-index:3;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">
      <svg width="34" height="46" viewBox="0 0 34 46">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 11.9 17 29 17 29s17-17.1 17-29C34 7.6 26.4 0 17 0z" fill="#ea580c"/>
        <circle cx="17" cy="17" r="6.5" fill="white"/>
        <circle cx="17" cy="17" r="3" fill="#ea580c"/>
      </svg>
    </div>
  </div>`,
  iconSize: [60, 68], iconAnchor: [30, 46], popupAnchor: [0, -46],
});

const css = `
@keyframes ping{0%{transform:scale(1);opacity:0.7}100%{transform:scale(1.8);opacity:0}}
@keyframes vortex{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes vPulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.15);opacity:0.6}}
.leaflet-control-attribution{display:none!important}
`;

function FitBounds({ driverPos, clientPos }: { driverPos: { lat: number; lng: number } | null; clientPos: { lat: number; lng: number } }) {
  const map = useMap();
  const initialFitDone = useRef(false);
  const updateCount = useRef(0);

  useEffect(() => {
    // Premier affichage : montrer les deux points
    if (!initialFitDone.current) {
      const points: [number, number][] = [[clientPos.lat, clientPos.lng]];
      if (driverPos) points.push([driverPos.lat, driverPos.lng]);
      map.fitBounds(points, { padding: [80, 80], maxZoom: 17 });
      initialFitDone.current = true;
      return;
    }

    // Suivre le livreur en temps réel
    if (driverPos) {
      updateCount.current += 1;
      // Zoom sur le livreur après quelques mises à jour
      if (updateCount.current <= 2) {
        map.flyTo([driverPos.lat, driverPos.lng], 16, { duration: 1 });
      } else {
        map.panTo([driverPos.lat, driverPos.lng], { animate: true, duration: 0.5 });
      }
    }
  }, [driverPos?.lat, driverPos?.lng, clientPos.lat, clientPos.lng]);
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

interface Props {
  driverPos: { lat: number; lng: number } | null;
  clientPos: { lat: number; lng: number };
  positions?: { latitude: number; longitude: number }[];
  routeCoords?: [number, number][];
  altRoutes?: [number, number][][];
  driverLabel?: string;
  driverPhone?: string;
  clientLabel?: string;
}

export default function GuestTrackMap({ driverPos, clientPos, positions = [], routeCoords = [], altRoutes = [], driverLabel = "Le livreur", driverPhone, clientLabel = "Ma position" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center = driverPos || clientPos;
  const trail: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          url={TILES.streets}
          subdomains={GOOGLE_SUBDOMAINS}
          maxZoom={19}
        />
        <FitBounds driverPos={driverPos} clientPos={clientPos} />
        <MapResizer />
        <Marker position={[clientPos.lat, clientPos.lng]} icon={clientIcon}>
          <Popup><div className="text-sm"><p className="font-semibold text-orange-600">{clientLabel}</p></div></Popup>
        </Marker>
        {driverPos && (
          <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
            <Popup>
              <div className="text-sm min-w-[140px]">
                <p className="font-semibold text-blue-600">{driverLabel}</p>
                {driverPhone && (
                  <a href={`tel:${driverPhone}`} className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg no-underline hover:bg-green-600 transition-colors" style={{ textDecoration: "none", color: "white" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Appeler {driverPhone}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        )}
        {altRoutes.map((alt, i) => alt.length > 1 && (
          <Polyline key={`alt-${i}`} positions={alt} color={i === 0 ? "#a855f7" : "#f59e0b"} weight={4} opacity={0.6} dashArray="10 8" />
        ))}
        {routeCoords.length > 1 && <Polyline positions={routeCoords} color="#3b82f6" weight={5} opacity={0.9} />}
        {trail.length > 1 && <Polyline positions={trail} color="#3b82f6" weight={3} opacity={0.4} />}
      </MapContainer>
    </>
  );
}
