"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Navigation, MapPin, Clock, Ruler, Loader2, Phone,
  ChevronUp, ChevronDown, Gauge, ArrowUp, Flag, User, Banknote,
  Minimize2, Maximize2, CheckCircle, Truck, X, XCircle,
} from "lucide-react";
import { playSound } from "@/lib/sounds";
import { ChatButton } from "@/components/chat/chat-button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChat } from "@/hooks/use-chat";
import { useCall } from "@/hooks/use-call";
import { CallOverlay } from "@/components/call/call-overlay";

const NavMap = dynamic(() => import("@/components/map/nav-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-950">
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
    </div>
  ),
});

interface RouteStep {
  instruction: string;
  distance: number;
  time: number;
  latLng: [number, number];
}

type NavState = "idle" | "planning" | "navigating";

const cancelReasons = [
  "Client injoignable",
  "Adresse introuvable",
  "Produit indisponible",
  "Problème de véhicule",
  "Autre",
];

export default function NavigatePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-gray-950"><Loader2 className="w-12 h-12 text-orange-500 animate-spin" /></div>}>
      <NavigateContent />
    </Suspense>
  );
}

function NavigateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [navState, setNavState] = useState<NavState>("idle");
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [destName, setDestName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderId, setOrderId] = useState("");
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number } | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState<number | null>(null);
  const [locating, setLocating] = useState(true);
  const [selectedStepIdx, setSelectedStepIdx] = useState<number | null>(null);
  const [infoCollapsed, setInfoCollapsed] = useState(true);
  const [recentering, setRecentering] = useState(false);
  const [deliveryId, setDeliveryId] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const arrivedSoundPlayed = useRef(false);

  // Chat & Appel VoIP
  const chatEnabled = !!orderId && !!deliveryId && !["DELIVERED", "CANCELLED"].includes(deliveryStatus);
  const {
    messages: chatMessages, loading: chatLoading, sending: chatSending,
    typingUser, hasMore: chatHasMore, sendMessage: chatSendMessage,
    markAsRead: chatMarkAsRead, loadMore: chatLoadMore,
    emitTyping: chatEmitTyping, stopTyping: chatStopTyping,
    unreadCount: chatUnread, socket,
  } = useChat({ orderId, enabled: !!orderId && !!deliveryId });

  const {
    callState, remoteName: callRemoteName, callDuration,
    isMuted, isSpeaker, initiateCall, acceptCall, endCall,
    toggleMute, toggleSpeaker,
  } = useCall({
    orderId,
    socket,
    myName: "Livreur",
    myRole: "DRIVER",
    enabled: !!orderId && !!deliveryId,
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPickupDialog, setShowPickupDialog] = useState(false);

  useEffect(() => {
    if (deliveryStatus === "PICKING_UP") setShowPickupDialog(true);
  }, [deliveryStatus]);
  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendPosRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myPosRef = useRef<[number, number] | null>(null);
  const speedRef = useRef(0);

  // Reverse geocoding Nominatim
  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const data = await res.json();
      if (data.display_name) {
        // Raccourcir : garder les 3 premiers segments
        const parts = data.display_name.split(", ");
        return parts.slice(0, 3).join(", ");
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  // Lecture des params URL
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const addr = searchParams.get("address");
    const client = searchParams.get("client");
    const phone = searchParams.get("phone");
    const amount = searchParams.get("amount");
    const oid = searchParams.get("orderId");

    if (lat && lng) {
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      if (!isNaN(latN) && !isNaN(lngN)) {
        setDestination([latN, lngN]);
        if (addr) {
          setDestName(addr);
        } else {
          setDestName("Recherche de l'adresse...");
          reverseGeocode(latN, lngN).then(setDestName);
        }
        setNavState("planning");
      }
    }
    if (client) setClientName(client);
    if (phone) setClientPhone(phone);
    if (amount && amount !== "0") setOrderAmount(amount);
    if (oid) setOrderId(oid);
    const did = searchParams.get("deliveryId");
    const dstatus = searchParams.get("status");
    if (did) setDeliveryId(did);
    if (dstatus) setDeliveryStatus(dstatus);
  }, [searchParams]);

  // Geolocalisation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMyPos([9.3, 2.3]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Suivi GPS toutes les 5s (seulement hors navigation — watchPosition prend le relais)
  useEffect(() => {
    if (!navigator.geolocation || navState === "navigating") {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setMyPos(p);
          myPosRef.current = p;
          if (pos.coords.heading !== null) setHeading(pos.coords.heading);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 4000 }
      );
    }, 5000);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [navState]);

  // Suivi GPS rapide pendant navigation active
  useEffect(() => {
    if (navState !== "navigating" || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyPos(p);
        myPosRef.current = p;
        const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        setSpeed(spd);
        speedRef.current = spd;
        if (pos.coords.heading !== null) setHeading(pos.coords.heading);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [navState]);

  // Envoi position au serveur toutes les 5s (pour le suivi client)
  useEffect(() => {
    if (!deliveryId || deliveryStatus === "DELIVERED" || deliveryStatus === "CANCELLED") {
      if (sendPosRef.current) { clearInterval(sendPosRef.current); sendPosRef.current = null; }
      return;
    }
    sendPosRef.current = setInterval(async () => {
      const pos = myPosRef.current;
      if (!pos) return;
      try {
        await fetch(`/api/deliveries/${deliveryId}/position`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude: pos[0], longitude: pos[1], speed: speedRef.current }),
        });
      } catch {}
    }, 5000);
    return () => {
      if (sendPosRef.current) { clearInterval(sendPosRef.current); sendPosRef.current = null; }
    };
  }, [deliveryId, deliveryStatus]);

  function handleMapClick(lat: number, lng: number) {
    if (navState === "navigating") return;
    setDestination([lat, lng]);
    setDestName("Recherche de l'adresse...");
    reverseGeocode(lat, lng).then(setDestName);
    setNavState("planning");
    setPanelExpanded(false);
    setSelectedStepIdx(null);
  }

  const handleRouteFound = useCallback((info: { distance: number; time: number; steps: RouteStep[]; coords?: [number, number][] }) => {
    setRouteInfo({ distance: info.distance, time: info.time });
    setRouteSteps(info.steps || []);
    setSelectedStepIdx(null);
    // Son "arriving" quand le livreur est à moins de 200m de la destination
    if (info.distance <= 200 && !arrivedSoundPlayed.current) {
      arrivedSoundPlayed.current = true;
      playSound("arriving");
    }
  }, []);

  function startNavigation() {
    setNavState("navigating");
    setPanelExpanded(false);
    setSelectedStepIdx(null);
  }

  function stopNavigation() {
    setNavState("planning");
    setSpeed(0);
    setHeading(null);
    setPanelExpanded(false);
    setSelectedStepIdx(null);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }

  function recenter() {
    if (!navigator.geolocation || recentering) return;
    setSelectedStepIdx(null);
    setRecentering(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setMyPos([pos.coords.latitude, pos.coords.longitude]);
      // Signaler au NavMap de reprendre le suivi automatique
      window.dispatchEvent(new Event("nav-refollow"));
      setTimeout(() => setRecentering(false), 800);
    }, () => {
      setTimeout(() => setRecentering(false), 800);
    }, { enableHighAccuracy: true });
  }

  function selectStep(idx: number) {
    setSelectedStepIdx(prev => prev === idx ? null : idx);
  }

  async function updateDeliveryStatus(status: string) {
    if (!deliveryId || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const estMin = routeInfo ? Math.round(routeInfo.time / 60) : undefined;
      await fetch(`/api/deliveries/${deliveryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          currentLat: myPos?.[0],
          currentLng: myPos?.[1],
          estimatedMinutes: status === "DELIVERING" ? estMin : undefined,
        }),
      });
      if (status === "DELIVERED") {
        playSound("delivered");
        router.push("/livraison/order");
      } else if (status === "DELIVERING") {
        playSound("picked-up");
        setDeliveryStatus(status);
      } else {
        setDeliveryStatus(status);
      }
    } catch {} finally {
      setUpdatingStatus(false);
    }
  }

  async function cancelOrder() {
    if (!orderId) return;
    if (!cancelReason) {
      setCancelError("Veuillez sélectionner une raison");
      return;
    }
    if (cancelReason === "Autre" && !customReason.trim()) {
      setCancelError("Veuillez preciser la raison");
      return;
    }
    setCancelling(true);
    setCancelError("");
    const reason = cancelReason === "Autre" ? customReason : cancelReason;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setShowCancel(false);
        router.push("/livraison/order");
      } else {
        const data = await res.json();
        setCancelError(data.error || "Erreur lors de l'annulation");
      }
    } catch {
      setCancelError("Erreur réseau");
    }
    setCancelling(false);
  }

  function formatDistance(m: number) {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
  }

  function getETA(s: number) {
    const now = new Date();
    now.setSeconds(now.getSeconds() + s);
    return now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  const highlightPos = selectedStepIdx !== null && routeSteps[selectedStepIdx]
    ? routeSteps[selectedStepIdx].latLng
    : null;

  if (locating) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-950 z-50">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-white text-lg">Localisation en cours...</p>
        <p className="text-gray-500 text-sm mt-1">Autorisez l&apos;acces a votre position</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] -m-4 sm:-m-6 overflow-hidden">
      {/* Carte plein ecran */}
      <div className="absolute inset-0">
        <NavMap
          myPos={myPos}
          destination={destination}
          isNavigating={navState === "navigating"}
          heading={heading}
          speed={speed}
          highlightPos={highlightPos}
          onMapClick={handleMapClick}
          onRouteFound={handleRouteFound}
          onRecenter={recenter}
          recentering={recentering}
        />
      </div>

      {/* ─── BANDEAU INFO COMMANDE ─── */}
      <div className="absolute top-3 left-3 right-16 sm:left-4 sm:right-auto sm:w-[400px] z-[1000]">
        {infoCollapsed ? (
          /* ── Mode reduit : nom + montant + tel + expand ── */
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all duration-300 bg-gray-900/60 border border-gray-800"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
          >
            <button onClick={() => setInfoCollapsed(false)} className="flex items-center gap-2 min-w-0 flex-1">
              <User className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <span className="text-xs font-medium text-gray-800 truncate max-w-[100px]">{clientName || "Client"}</span>
              {orderAmount && <span className="text-xs font-bold text-emerald-600">{Number(orderAmount).toLocaleString()} F</span>}
            </button>
            {clientPhone && (
              <a
                href={`tel:${clientPhone}`}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-white text-[10px] font-semibold shrink-0"
                style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
              >
                <Phone className="w-3 h-3" />
                {clientPhone}
              </a>
            )}
            <button onClick={() => setInfoCollapsed(false)} className="p-0.5 shrink-0">
              <Maximize2 className="w-3 h-3 text-gray-400 animate-pulse" style={{ animationDuration: "2s" }} />
            </button>
          </div>
        ) : (
          /* ── Mode complet ── */
          <div
            className="rounded-2xl shadow-lg overflow-hidden transition-all duration-300 bg-gray-900/60 border border-gray-800"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
          >
            <div className="px-3.5 py-3">
              {/* Ligne 1 : Client + montant + reduire */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-900 truncate block">
                      {clientName || "Client"}
                    </span>
                    {orderId && <span className="text-[10px] text-gray-400 font-mono">#{orderId}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {orderAmount && (
                    <span className="text-sm font-bold text-emerald-600">{Number(orderAmount).toLocaleString()} F</span>
                  )}
                  <button
                    onClick={() => setInfoCollapsed(true)}
                    className="relative p-1.5 rounded-md hover:bg-gray-100 transition-colors group"
                  >
                    <div className="absolute inset-0 rounded-md bg-orange-400/20 animate-ping" style={{ animationDuration: "3s" }} />
                    <Minimize2 className="w-3.5 h-3.5 text-orange-500 relative z-10 animate-bounce" style={{ animationDuration: "2.5s" }} />
                  </button>
                </div>
              </div>

              {/* Ligne 2 : Adresse */}
              <div className="flex items-start gap-2 mb-2.5 pl-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{destName || "Destination non definie"}</p>
              </div>

              {/* Ligne 3 : Stats route */}
              {routeInfo ? (
                <div className="flex items-center gap-2 mb-2.5 pl-1">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100/80">
                    <Ruler className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium text-gray-800">{formatDistance(routeInfo.distance)}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100/80">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium text-gray-800">{formatTime(routeInfo.time)}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100/80">
                    <Navigation className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-gray-500">{getETA(routeInfo.time)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-2.5 pl-1">Calcul de l&apos;itineraire...</p>
              )}

              {/* Bouton Appeler */}
              {clientPhone && (
                <a
                  href={`tel:${clientPhone}`}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold text-white transition-colors shadow-sm"
                  style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Appeler {clientPhone}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── PANNEAU PLANIFICATION ─── */}
      {navState === "planning" && routeInfo && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000] rounded-t-2xl shadow-lg transition-all duration-300 bg-gray-900/90 border-t border-gray-800"
          style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          {/* Poignee + toggle */}
          <button
            onClick={() => setPanelExpanded(!panelExpanded)}
            className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-1.5 rounded-full transition-colors bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400" />
              <div className="absolute inset-0 w-10 h-1.5 rounded-full animate-pulse bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 opacity-50 blur-sm" style={{ animationDuration: "1.5s" }} />
            </div>
            <div className="mt-1 transition-transform duration-300 group-hover:scale-125">
              {panelExpanded ? (
                <ChevronDown className="w-4 h-4 text-orange-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-orange-500 animate-bounce" style={{ animationDuration: "1.5s" }} />
              )}
            </div>
          </button>

          {/* Infos compactes : destination + stats */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2.5 mb-2">
              <Flag className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-gray-900 truncate flex-1">{destName}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80">
                <Ruler className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-sm font-semibold text-gray-700">{formatDistance(routeInfo.distance)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-sm font-semibold text-gray-700">{formatTime(routeInfo.time)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80">
                <Navigation className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-sm text-gray-600 font-medium">{getETA(routeInfo.time)}</span>
              </div>
            </div>
          </div>

          {/* Contenu expandable : boutons + etapes */}
          {panelExpanded && (
            <div className="px-3 pb-3 space-y-2 border-t border-white/20 pt-2">
              <div className="flex gap-2">
                {deliveryId && deliveryStatus === "PICKING_UP" && (
                  <button
                    onClick={() => { updateDeliveryStatus("DELIVERING"); setShowPickupDialog(false); }}
                    disabled={updatingStatus}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
                  >
                    {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                    Récupérée
                  </button>
                )}
                {deliveryId && deliveryStatus === "DELIVERING" && (
                  <button
                    onClick={() => updateDeliveryStatus("DELIVERED")}
                    disabled={updatingStatus}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                  >
                    {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Livree
                  </button>
                )}
                <button
                  onClick={startNavigation}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-md"
                  style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
                >
                  <Navigation className="w-3.5 h-3.5" /> Naviguer
                </button>
                {deliveryId && orderId && deliveryStatus !== "DELIVERED" && deliveryStatus !== "CANCELLED" && !showCancel && (
                  <button
                    onClick={() => { setShowCancel(true); setCancelReason(""); setCustomReason(""); setCancelError(""); }}
                    className="py-2.5 px-3 rounded-xl text-xs font-medium text-red-500 border border-red-200/60 bg-red-50/50 hover:bg-red-100/60 transition-colors flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Annuler
                  </button>
                )}
              </div>
              {/* Formulaire annulation */}
              {showCancel && (
                <div className="bg-white/50 border border-red-200/60 rounded-xl p-2.5 space-y-2">
                  <p className="text-xs text-gray-800 font-medium">Confirmer l&apos;annulation ?</p>
                  <select
                    value={cancelReason}
                    onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
                    className="w-full bg-white/80 border border-gray-200 text-gray-800 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-400"
                  >
                    <option value="">Selectionnez une raison</option>
                    {cancelReasons.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {cancelReason === "Autre" && (
                    <textarea
                      value={customReason}
                      onChange={(e) => { setCustomReason(e.target.value); setCancelError(""); }}
                      placeholder="Preciser la raison..."
                      rows={2}
                      className="w-full bg-white/80 border border-gray-200 text-gray-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-red-400 resize-none"
                    />
                  )}
                  {cancelError && <p className="text-[10px] text-red-500">{cancelError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancel(false)}
                      className="flex-1 py-2 bg-gray-100/60 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200/60 transition-colors">
                      Non, continuer
                    </button>
                    <button onClick={cancelOrder} disabled={cancelling}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                      {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Oui, annuler
                    </button>
                  </div>
                </div>
              )}
              {/* Liste des etapes */}
              {routeSteps.length > 0 && (
                <div className="max-h-44 overflow-y-auto pt-1">
                  {routeSteps.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => selectStep(i)}
                      className={`w-full flex items-start gap-2 py-2 text-left transition-colors rounded-lg px-1.5 ${
                        selectedStepIdx === i ? "bg-orange-50/60" : "hover:bg-white/30"
                      }`}
                      style={i < routeSteps.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedStepIdx === i ? "bg-orange-500" : "bg-gray-200/60"
                      }`}>
                        <span className={`text-[10px] font-bold ${
                          selectedStepIdx === i ? "text-white" : "text-gray-500"
                        }`}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${
                          selectedStepIdx === i ? "text-orange-600 font-semibold" : "text-gray-700"
                        }`}>{step.instruction}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDistance(step.distance)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── PANNEAU NAVIGATION ACTIVE ─── */}
      {navState === "navigating" && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[1000] rounded-t-2xl shadow-lg transition-all duration-300 bg-gray-900/90 border-t border-gray-800"
          style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          {/* Poignee + toggle */}
          <button
            onClick={() => setPanelExpanded(!panelExpanded)}
            className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-1.5 rounded-full transition-colors bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400" />
              <div className="absolute inset-0 w-10 h-1.5 rounded-full animate-pulse bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 opacity-50 blur-sm" style={{ animationDuration: "1.5s" }} />
            </div>
            <div className="mt-1 transition-transform duration-300 group-hover:scale-125">
              {panelExpanded ? (
                <ChevronDown className="w-4 h-4 text-orange-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-orange-500 animate-bounce" style={{ animationDuration: "1.5s" }} />
              )}
            </div>
          </button>

          {/* Compact : instruction + stats */}
          <div className="px-4 pb-3">
            {routeSteps.length > 0 && (
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}>
                  <ArrowUp className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate flex-1">{routeSteps[0]?.instruction}</p>
                <span className="text-sm font-medium text-orange-600 shrink-0">{formatDistance(routeSteps[0]?.distance || 0)}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80">
                <span className="text-sm font-semibold text-gray-700">{speed} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80">
                <span className="text-sm font-semibold text-gray-700">{routeInfo ? formatDistance(routeInfo.distance) : "--"}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100/80">
                <span className="text-sm text-gray-600 font-medium">{routeInfo ? getETA(routeInfo.time) : "--"}</span>
              </div>
            </div>
          </div>

          {/* Contenu expandable : boutons + etapes */}
          {panelExpanded && (
            <div className="px-3 pb-3 space-y-2 border-t border-white/20 pt-2">
              <div className="flex gap-2">
                {deliveryId && deliveryStatus === "PICKING_UP" && (
                  <button
                    onClick={() => { updateDeliveryStatus("DELIVERING"); setShowPickupDialog(false); }}
                    disabled={updatingStatus}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
                  >
                    {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                    Récupérée
                  </button>
                )}
                {deliveryId && deliveryStatus === "DELIVERING" && (
                  <button
                    onClick={() => updateDeliveryStatus("DELIVERED")}
                    disabled={updatingStatus}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                  >
                    {updatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Livree
                  </button>
                )}
                <button
                  onClick={stopNavigation}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Arrêter
                </button>
                {deliveryId && orderId && deliveryStatus !== "DELIVERED" && deliveryStatus !== "CANCELLED" && !showCancel && (
                  <button
                    onClick={() => { setShowCancel(true); setCancelReason(""); setCustomReason(""); setCancelError(""); }}
                    className="py-2.5 px-3 rounded-xl text-xs font-medium text-red-500 border border-red-200/60 bg-red-50/50 hover:bg-red-100/60 transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Annuler
                  </button>
                )}
              </div>
              {/* Formulaire annulation */}
              {showCancel && (
                <div className="bg-white/50 border border-red-200/60 rounded-xl p-2.5 space-y-2">
                  <p className="text-xs text-gray-800 font-medium">Confirmer l&apos;annulation ?</p>
                  <select
                    value={cancelReason}
                    onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
                    className="w-full bg-white/80 border border-gray-200 text-gray-800 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-400"
                  >
                    <option value="">Selectionnez une raison</option>
                    {cancelReasons.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {cancelReason === "Autre" && (
                    <textarea
                      value={customReason}
                      onChange={(e) => { setCustomReason(e.target.value); setCancelError(""); }}
                      placeholder="Preciser la raison..."
                      rows={2}
                      className="w-full bg-white/80 border border-gray-200 text-gray-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-red-400 resize-none"
                    />
                  )}
                  {cancelError && <p className="text-[10px] text-red-500">{cancelError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancel(false)}
                      className="flex-1 py-2 bg-gray-100/60 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200/60 transition-colors">
                      Non, continuer
                    </button>
                    <button onClick={cancelOrder} disabled={cancelling}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                      {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Oui, annuler
                    </button>
                  </div>
                </div>
              )}
              {/* Liste des etapes */}
              {routeSteps.length > 0 && (
                <div className="max-h-44 overflow-y-auto pt-1">
                  {routeSteps.map((step, i) => (
                    <button
                      key={i}
                      onClick={() => selectStep(i)}
                      className={`w-full flex items-start gap-2 py-2 text-left transition-colors rounded-lg px-1.5 ${
                        selectedStepIdx === i ? "bg-orange-50/60" : "hover:bg-white/30"
                      }`}
                      style={i < routeSteps.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedStepIdx === i ? "bg-orange-500" : "bg-gray-200/60"
                      }`}>
                        <span className={`text-[10px] font-bold ${
                          selectedStepIdx === i ? "text-white" : "text-gray-500"
                        }`}>{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${
                          selectedStepIdx === i ? "text-orange-600 font-semibold" : "text-gray-700"
                        }`}>{step.instruction}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDistance(step.distance)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ========== APPEL VoIP ========== */}
      <CallOverlay
        callState={callState}
        remoteName={callRemoteName}
        duration={callDuration}
        isMuted={isMuted}
        isSpeaker={isSpeaker}
        onAccept={acceptCall}
        onEnd={endCall}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
      />

      {/* ========== CHAT ========== */}
      {orderId && deliveryId && (
        <>
          {!chatOpen && (
            <ChatButton
              onClick={() => setChatOpen(true)}
              unreadCount={chatUnread}
              disabled={!chatEnabled}
            />
          )}
          <ChatPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            messages={chatMessages}
            loading={chatLoading}
            sending={chatSending}
            typingUser={typingUser}
            hasMore={chatHasMore}
            currentSender="DRIVER"
            onSend={chatSendMessage}
            onMarkRead={chatMarkAsRead}
            onLoadMore={chatLoadMore}
            onTyping={() => chatEmitTyping("Livreur", "DRIVER")}
            onStopTyping={chatStopTyping}
            disabled={!chatEnabled}
            otherPartyName={clientName || `Commande #${orderId.slice(-6)}`}
            orderNumber={orderId.slice(-8).toUpperCase()}
            onCall={initiateCall}
            callDisabled={callState !== "idle" || !chatEnabled}
          />
        </>
      )}

      {/* Dialog Recuperation */}
      {showPickupDialog && deliveryStatus === "PICKING_UP" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPickupDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl mx-4 max-w-sm w-full p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Truck className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Commande à récupérer</h3>
              <p className="text-sm text-gray-500 mt-1">Confirmez quand vous avez récupéré la commande au restaurant</p>
            </div>
            <button
              onClick={() => { updateDeliveryStatus("DELIVERING"); setShowPickupDialog(false); }}
              disabled={updatingStatus}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
            >
              {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Commande récupérée
            </button>
            <button
              onClick={() => setShowPickupDialog(false)}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
