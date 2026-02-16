"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

function playConnectionSound(type: "lost" | "restored") {
  try {
    const ctx = new AudioContext();
    const play = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      if (type === "lost") {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(400, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + 0.24);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
      osc.onended = () => ctx.close().catch(() => {});
    };
    if (ctx.state === "suspended") {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch {}
}

export function OfflineIndicator() {
  const mountedRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { mountedRef.current = true; }, 1000);

    function handleOffline() {
      if (!mountedRef.current) return;
      playConnectionSound("lost");
      toast.error("Hors connexion", {
        description: "Mode cache actif — vos actions seront synchronisées au retour",
        icon: <WifiOff className="w-4 h-4" />,
        duration: 5000,
      });
    }

    function handleOnline() {
      if (!mountedRef.current) return;
      playConnectionSound("restored");
      toast.success("Connexion rétablie", {
        description: "Synchronisation des actions en attente...",
        icon: <Wifi className="w-4 h-4" />,
        duration: 3000,
      });
      // Declencher la sync des mutations
      navigator.serviceWorker?.controller?.postMessage("sync-mutations");
    }

    function handleSWMessage(event: MessageEvent) {
      if (event.data?.type === "mutation-queued") {
        setPendingCount((c) => c + 1);
        toast.info("Action enregistree hors-ligne", {
          description: "Sera synchronisée au retour de la connexion",
          icon: <RefreshCw className="w-4 h-4" />,
          duration: 3000,
        });
      }
      if (event.data?.type === "mutations-synced") {
        setPendingCount(0);
        toast.success(`${event.data.count} action(s) synchronisée(s)`, {
          icon: <RefreshCw className="w-4 h-4" />,
          duration: 3000,
        });
      }
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] px-3 py-2 bg-yellow-600/90 text-white rounded-xl text-xs font-medium flex items-center gap-2 backdrop-blur-sm shadow-lg">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      {pendingCount} action(s) en attente
    </div>
  );
}
