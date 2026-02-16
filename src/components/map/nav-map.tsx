"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

const TILES = {
  hybrid: "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
  streets: "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
};
const GOOGLE_SUBDOMAINS = ["mt0", "mt1", "mt2", "mt3"];

// ─── Traduction instructions OSRM en français ───
const DIRS: Record<string, string> = {
  north: "le nord", south: "le sud", east: "l'est", west: "l'ouest",
  northeast: "le nord-est", northwest: "le nord-ouest",
  southeast: "le sud-est", southwest: "le sud-ouest",
};

function translateToFrench(text: string): string {
  if (!text) return text;
  let t = text;

  // Destination
  t = t.replace(/^You have (?:arrived at|reached) your destination, on the left$/i, "Arrivée à destination, sur la gauche");
  t = t.replace(/^You have (?:arrived at|reached) your destination, on the right$/i, "Arrivée à destination, sur la droite");
  t = t.replace(/^You have (?:arrived at|reached) your destination.*$/i, "Vous êtes arrivé à destination");
  t = t.replace(/^Arrive at your destination, on the left$/i, "Arrivée à destination, sur la gauche");
  t = t.replace(/^Arrive at your destination, on the right$/i, "Arrivée à destination, sur la droite");
  t = t.replace(/^Arrive at your destination$/i, "Arrivée à destination");

  // Head
  t = t.replace(/^Head (northeast|northwest|southeast|southwest|north|south|east|west) on (.+)$/i,
    (_, dir, road) => `Aller vers ${DIRS[dir.toLowerCase()] || dir} sur ${road}`);
  t = t.replace(/^Head (northeast|northwest|southeast|southwest|north|south|east|west)$/i,
    (_, dir) => `Aller vers ${DIRS[dir.toLowerCase()] || dir}`);

  // Continue
  t = t.replace(/^Continue straight on (.+)$/i, (_, road) => `Continuer tout droit sur ${road}`);
  t = t.replace(/^Continue on (.+)$/i, (_, road) => `Continuer sur ${road}`);
  t = t.replace(/^Continue straight$/i, "Continuer tout droit");
  t = t.replace(/^Continue$/i, "Continuer tout droit");

  // Turn sharp
  t = t.replace(/^Turn sharp left onto (.+)$/i, (_, road) => `Tourner fortement à gauche sur ${road}`);
  t = t.replace(/^Turn sharp right onto (.+)$/i, (_, road) => `Tourner fortement à droite sur ${road}`);
  t = t.replace(/^Turn sharp left$/i, "Tourner fortement à gauche");
  t = t.replace(/^Turn sharp right$/i, "Tourner fortement à droite");

  // Turn slight
  t = t.replace(/^Turn slight left onto (.+)$/i, (_, road) => `Tourner légèrement à gauche sur ${road}`);
  t = t.replace(/^Turn slight right onto (.+)$/i, (_, road) => `Tourner légèrement à droite sur ${road}`);
  t = t.replace(/^Turn slight left$/i, "Tourner légèrement à gauche");
  t = t.replace(/^Turn slight right$/i, "Tourner légèrement à droite");

  // Turn
  t = t.replace(/^Turn left onto (.+)$/i, (_, road) => `Tourner à gauche sur ${road}`);
  t = t.replace(/^Turn right onto (.+)$/i, (_, road) => `Tourner à droite sur ${road}`);
  t = t.replace(/^Turn left$/i, "Tourner à gauche");
  t = t.replace(/^Turn right$/i, "Tourner à droite");

  // Keep
  t = t.replace(/^Keep left on (.+)$/i, (_, road) => `Rester à gauche sur ${road}`);
  t = t.replace(/^Keep right on (.+)$/i, (_, road) => `Rester à droite sur ${road}`);
  t = t.replace(/^Keep left$/i, "Rester à gauche");
  t = t.replace(/^Keep right$/i, "Rester à droite");

  // Roundabout / Traffic circle
  t = t.replace(/^(?:At the roundabout|Enter the roundabout|At the traffic circle|Enter the traffic circle), take the 1st exit onto (.+)$/i,
    (_, road) => `Au rond-point, prendre la 1ère sortie sur ${road}`);
  t = t.replace(/^(?:At the roundabout|Enter the roundabout|At the traffic circle|Enter the traffic circle), take the (\d+)(?:st|nd|rd|th) exit onto (.+)$/i,
    (_, n, road) => `Au rond-point, prendre la ${n}e sortie sur ${road}`);
  t = t.replace(/^(?:At the roundabout|Enter the roundabout|At the traffic circle|Enter the traffic circle), take the 1st exit$/i,
    "Au rond-point, prendre la 1ère sortie");
  t = t.replace(/^(?:At the roundabout|Enter the roundabout|At the traffic circle|Enter the traffic circle), take the (\d+)(?:st|nd|rd|th) exit$/i,
    (_, n) => `Au rond-point, prendre la ${n}e sortie`);

  // Enter/Exit traffic circle
  t = t.replace(/^Enter the (?:traffic circle|roundabout) and take the 1st exit onto (.+)$/i,
    (_, road) => `Entrer dans le rond-point et prendre la 1ère sortie sur ${road}`);
  t = t.replace(/^Enter the (?:traffic circle|roundabout) and take the (\d+)(?:st|nd|rd|th) exit onto (.+)$/i,
    (_, n, road) => `Entrer dans le rond-point et prendre la ${n}e sortie sur ${road}`);
  t = t.replace(/^Enter the (?:traffic circle|roundabout) and take the 1st exit$/i,
    "Entrer dans le rond-point et prendre la 1ère sortie");
  t = t.replace(/^Enter the (?:traffic circle|roundabout) and take the (\d+)(?:st|nd|rd|th) exit$/i,
    (_, n) => `Entrer dans le rond-point et prendre la ${n}e sortie`);
  t = t.replace(/^Exit the (?:traffic circle|roundabout) onto (.+)$/i,
    (_, road) => `Sortir du rond-point sur ${road}`);
  t = t.replace(/^Exit the (?:traffic circle|roundabout)$/i, "Sortir du rond-point");

  // Merge
  t = t.replace(/^Merge left onto (.+)$/i, (_, road) => `Se rabattre à gauche sur ${road}`);
  t = t.replace(/^Merge right onto (.+)$/i, (_, road) => `Se rabattre à droite sur ${road}`);
  t = t.replace(/^Merge left$/i, "Se rabattre à gauche");
  t = t.replace(/^Merge right$/i, "Se rabattre à droite");

  // Ramp
  t = t.replace(/^Take the ramp on the left onto (.+)$/i, (_, road) => `Prendre la bretelle à gauche sur ${road}`);
  t = t.replace(/^Take the ramp on the right onto (.+)$/i, (_, road) => `Prendre la bretelle à droite sur ${road}`);
  t = t.replace(/^Take the ramp on the left$/i, "Prendre la bretelle à gauche");
  t = t.replace(/^Take the ramp on the right$/i, "Prendre la bretelle à droite");
  t = t.replace(/^Take the ramp$/i, "Prendre la bretelle");

  // U-turn
  t = t.replace(/^Make a U-turn and continue on (.+)$/i, (_, road) => `Faire demi-tour et continuer sur ${road}`);
  t = t.replace(/^Make a U-turn onto (.+)$/i, (_, road) => `Faire demi-tour sur ${road}`);
  t = t.replace(/^Make a U-turn$/i, "Faire demi-tour");

  // Fork
  t = t.replace(/^At the fork, keep left onto (.+)$/i, (_, road) => `À la bifurcation, rester à gauche sur ${road}`);
  t = t.replace(/^At the fork, keep right onto (.+)$/i, (_, road) => `À la bifurcation, rester à droite sur ${road}`);
  t = t.replace(/^At the fork, keep left$/i, "À la bifurcation, rester à gauche");
  t = t.replace(/^At the fork, keep right$/i, "À la bifurcation, rester à droite");

  // Depart / end of road
  t = t.replace(/^Depart$/i, "Départ");
  t = t.replace(/^End of road, turn left onto (.+)$/i, (_, road) => `Fin de route, tourner à gauche sur ${road}`);
  t = t.replace(/^End of road, turn right onto (.+)$/i, (_, road) => `Fin de route, tourner à droite sur ${road}`);
  t = t.replace(/^End of road, turn left$/i, "Fin de route, tourner à gauche");
  t = t.replace(/^End of road, turn right$/i, "Fin de route, tourner à droite");

  // Go straight
  t = t.replace(/^Go straight on (.+)$/i, (_, road) => `Continuer tout droit sur ${road}`);
  t = t.replace(/^Go straight$/i, "Continuer tout droit");

  // Bear
  t = t.replace(/^Bear left onto (.+)$/i, (_, road) => `Serrer à gauche sur ${road}`);
  t = t.replace(/^Bear right onto (.+)$/i, (_, road) => `Serrer à droite sur ${road}`);
  t = t.replace(/^Bear left$/i, "Serrer à gauche");
  t = t.replace(/^Bear right$/i, "Serrer à droite");

  // Slight (sans Turn)
  t = t.replace(/^Slight left onto (.+)$/i, (_, road) => `Légèrement à gauche sur ${road}`);
  t = t.replace(/^Slight right onto (.+)$/i, (_, road) => `Légèrement à droite sur ${road}`);
  t = t.replace(/^Slight left$/i, "Légèrement à gauche");
  t = t.replace(/^Slight right$/i, "Légèrement à droite");

  // Sharp (sans Turn)
  t = t.replace(/^Sharp left onto (.+)$/i, (_, road) => `Fortement à gauche sur ${road}`);
  t = t.replace(/^Sharp right onto (.+)$/i, (_, road) => `Fortement à droite sur ${road}`);
  t = t.replace(/^Sharp left$/i, "Fortement à gauche");
  t = t.replace(/^Sharp right$/i, "Fortement à droite");

  // Take exit
  t = t.replace(/^Take the (\d+)(?:st|nd|rd|th) exit onto (.+)$/i,
    (_, n, road) => `Prendre la ${n === "1" ? "1ère" : n + "e"} sortie sur ${road}`);
  t = t.replace(/^Take the (\d+)(?:st|nd|rd|th) exit$/i,
    (_, n) => `Prendre la ${n === "1" ? "1ère" : n + "e"} sortie`);
  t = t.replace(/^Take the exit onto (.+)$/i, (_, road) => `Prendre la sortie sur ${road}`);
  t = t.replace(/^Take the exit$/i, "Prendre la sortie");

  // Leave roundabout
  t = t.replace(/^Leave the (?:roundabout|traffic circle) onto (.+)$/i,
    (_, road) => `Quitter le rond-point sur ${road}`);
  t = t.replace(/^Leave the (?:roundabout|traffic circle)$/i, "Quitter le rond-point");

  return t;
}

// ─── Icônes ───

const navArrowIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:56px;height:56px">
    <div style="position:absolute;inset:2px;border-radius:50%;border:2.5px solid rgba(66,133,244,0.35);animation:navPulse 2s ease-out infinite"></div>
    <div class="nav-arrow-inner" style="position:absolute;top:8px;left:8px;width:40px;height:40px;transition:transform 0.5s ease">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#4285F4" stroke="white" stroke-width="3"/>
        <path d="M20 8 L13 30 L20 24.5 L27 30 Z" fill="white"/>
      </svg>
    </div>
  </div>`,
  iconSize: [56, 56],
  iconAnchor: [28, 28],
});

const destIcon = L.divIcon({
  className: "",
  html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4))">
    <svg width="34" height="46" viewBox="0 0 34 46">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 11.9 17 29 17 29s17-17.1 17-29C34 7.6 26.4 0 17 0z" fill="#EA4335"/>
      <circle cx="17" cy="17" r="6.5" fill="white"/>
      <circle cx="17" cy="17" r="3" fill="#EA4335"/>
    </svg>
  </div>`,
  iconSize: [34, 46],
  iconAnchor: [17, 46],
  popupAnchor: [0, -46],
});

const stepHighlightIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:28px;height:28px">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,140,0,0.25);animation:stepPulse 1.5s ease-out infinite"></div>
    <div style="position:absolute;inset:5px;border-radius:50%;background:#FF8C00;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const css = `
@keyframes navPulse{0%{transform:scale(0.8);opacity:1}100%{transform:scale(1.6);opacity:0}}
@keyframes stepPulse{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.2);opacity:0}}
.leaflet-routing-container{display:none!important}
.leaflet-control-attribution{display:none!important}
.leaflet-control-zoom{display:none!important}
`;

interface RouteStep {
  instruction: string;
  distance: number;
  time: number;
  latLng: [number, number];
}

interface Props {
  myPos: [number, number] | null;
  destination: [number, number] | null;
  isNavigating: boolean;
  heading: number | null;
  speed: number;
  highlightPos: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
  onRouteFound: (info: { distance: number; time: number; steps: RouteStep[]; coords: [number, number][] }) => void;
  onRecenter?: () => void;
  recentering?: boolean;
}

function MapCapture({ onMap }: { onMap: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
}

function MapController({ myPos, isNavigating, heading }: { myPos: [number, number] | null; isNavigating: boolean; heading: number | null }) {
  const map = useMap();
  const initialized = useRef(false);
  const followingRef = useRef(true);
  const wasNavigating = useRef(false);

  // Init : centrer sur la position
  useEffect(() => {
    if (myPos && !initialized.current) {
      map.setView(myPos, 16);
      initialized.current = true;
    }
  }, [myPos, map]);

  // Quand navigation demarre : zoom serre
  useEffect(() => {
    if (isNavigating && !wasNavigating.current && myPos) {
      followingRef.current = true;
      map.setView(myPos, 19, { animate: true, duration: 0.8 });
    }
    wasNavigating.current = isNavigating;
  }, [isNavigating, myPos, map]);

  // Detecter interaction utilisateur pour arreter le suivi auto
  useEffect(() => {
    if (!isNavigating) return;
    const onDragStart = () => { followingRef.current = false; };
    map.on("dragstart", onDragStart);
    return () => { map.off("dragstart", onDragStart); };
  }, [map, isNavigating]);

  // Suivi temps reel pendant navigation
  useEffect(() => {
    if (!isNavigating || !myPos || !followingRef.current) return;
    map.panTo(myPos, { animate: true, duration: 0.6, easeLinearity: 0.5 });
  }, [isNavigating, myPos, map]);

  // Ecouter l'event refollow depuis le bouton recentrer
  useEffect(() => {
    if (!isNavigating) return;
    const handler = () => {
      followingRef.current = true;
      if (myPos) map.setView(myPos, 19, { animate: true, duration: 0.6 });
    };
    window.addEventListener("nav-refollow", handler);
    return () => window.removeEventListener("nav-refollow", handler);
  }, [map, isNavigating, myPos]);

  return null;
}

function SpeedBadge({ speed }: { speed: number }) {
  return (
    <div className="bg-gray-800 border-[3px] border-gray-800" style={{
      position: "absolute", bottom: 16, left: 16, zIndex: 900,
      width: 64, height: 64, borderRadius: "50%",
      boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      <span className="text-white" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{speed}</span>
      <span className="text-gray-400" style={{ fontSize: 9, fontWeight: 600, marginTop: 1 }}>km/h</span>
    </div>
  );
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function NavArrowMarker({ position, heading }: { position: [number, number]; heading: number | null }) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const el = marker.getElement?.();
    if (!el) return;
    const arrow = el.querySelector(".nav-arrow-inner") as HTMLElement;
    if (arrow) arrow.style.transform = `rotate(${heading || 0}deg)`;
  }, [heading]);

  return (
    <Marker ref={markerRef} position={position} icon={navArrowIcon}>
      <Popup><div className="text-sm"><p className="font-semibold text-blue-600">Ma position</p></div></Popup>
    </Marker>
  );
}

function StepHighlight({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), 16), { animate: true, duration: 0.5 });
  }, [position, map]);
  return <Marker position={position} icon={stepHighlightIcon} />;
}

function RoutingEngine({ from, to, onRouteFound }: { from: [number, number]; to: [number, number]; onRouteFound: (info: { distance: number; time: number; steps: RouteStep[]; coords: [number, number][] }) => void }) {
  const map = useMap();
  const controlRef = useRef<any>(null);

  useEffect(() => {
    if (controlRef.current) {
      try { map.removeControl(controlRef.current); } catch {}
      controlRef.current = null;
    }

    const control = (L as any).Routing.control({
      router: new (L as any).Routing.OSRMv1({ serviceUrl: "https://router.project-osrm.org/route/v1" }),
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
      const coords = route.coordinates || [];
      const steps: RouteStep[] = (route.instructions || []).map((inst: any) => {
        const coord = coords[inst.index];
        return {
          instruction: translateToFrench(inst.text),
          distance: inst.distance,
          time: inst.time,
          latLng: coord ? [coord.lat, coord.lng] as [number, number] : from,
        };
      });
      const routeCoords: [number, number][] = coords.map((c: any) => [c.lat, c.lng]);
      onRouteFound({ distance: route.summary.totalDistance, time: route.summary.totalTime, steps, coords: routeCoords });
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

export default function NavMap({ myPos, destination, isNavigating, heading, speed, highlightPos, onMapClick, onRouteFound, onRecenter, recentering }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tileType, setTileType] = useState<"hybrid" | "streets">("streets");
  const [mapInst, setMapInst] = useState<L.Map | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [planOrigin, setPlanOrigin] = useState<[number, number] | null>(null);
  const [mapRotation, setMapRotation] = useState(0);
  const handleMap = useCallback((m: L.Map) => setMapInst(m), []);

  const handleRouteFound = useCallback((info: { distance: number; time: number; steps: RouteStep[]; coords: [number, number][] }) => {
    setRouteCoords(info.coords);
    if (!planOrigin && myPos) setPlanOrigin(myPos);
    onRouteFound(info);
  }, [onRouteFound, planOrigin, myPos]);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const center: [number, number] = myPos || [9.3, 2.3];

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <MapContainer center={center} zoom={16} className="h-full w-full" zoomControl={false} attributionControl={false} style={{ transform: `rotate(${mapRotation}deg)`, transition: "transform 0.4s ease" }}>
        <TileLayer key={tileType} url={TILES[tileType]} subdomains={GOOGLE_SUBDOMAINS} maxZoom={21} />
        <MapCapture onMap={handleMap} />
        <MapController myPos={myPos} isNavigating={isNavigating} heading={heading} />
        <MapClickHandler onClick={onMapClick} />
        {myPos && <NavArrowMarker position={myPos} heading={heading} />}
        {destination && (
          <Marker position={destination} icon={destIcon}>
            <Popup><div className="text-sm"><p className="font-semibold text-red-600">Destination</p></div></Popup>
          </Marker>
        )}
        {/* Planification : calcul itineraire via OSRM */}
        {!isNavigating && myPos && destination && (
          <RoutingEngine from={planOrigin || myPos} to={destination} onRouteFound={handleRouteFound} />
        )}
        {/* Navigation : tracé statique (pas de recalcul) */}
        {isNavigating && routeCoords.length > 1 && (
          <Polyline positions={routeCoords} color="#4285F4" weight={6} opacity={0.9} />
        )}
        {highlightPos && <StepHighlight position={highlightPos} />}
      </MapContainer>

      {/* Controles carte - droite */}
      <div style={{ position: "absolute", right: 12, top: 70, zIndex: 800, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Switch satellite / plan */}
        <button
          onClick={() => setTileType(t => t === "hybrid" ? "streets" : "hybrid")}
          style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          title={tileType === "hybrid" ? "Mode plan" : "Mode satellite"}
        >
          {tileType === "hybrid" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          )}
        </button>
        {/* Zoom + */}
        <button
          onClick={() => mapInst?.zoomIn()}
          style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", fontSize: 20, fontWeight: "bold", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
        >+</button>
        {/* Zoom - */}
        <button
          onClick={() => mapInst?.zoomOut()}
          style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", fontSize: 20, fontWeight: "bold", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
        >−</button>
        {/* Rotation */}
        <button
          onClick={() => setMapRotation(r => (r + 90) % 360)}
          style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Pivoter la carte"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${mapRotation}deg)`, transition: "transform 0.4s ease" }}>
            <path d="M4 12a8 8 0 0 1 14.93-4" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
            <path d="M20 12a8 8 0 0 1-14.93 4" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19 4v4h-4" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 20v-4h4" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Recentrer */}
        {onRecenter && (
          <button
            onClick={onRecenter}
            style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}
            title="Recentrer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.7s", transform: recentering ? "rotate(360deg)" : "none" }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
            </svg>
          </button>
        )}
      </div>

      {/* Badge vitesse style Google Maps */}
      {isNavigating && <SpeedBadge speed={speed} />}
    </div>
  );
}
