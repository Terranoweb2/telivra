"use client";

import { useEffect, useState, useCallback } from "react";

export function useAlerts() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?isRead=false");
      const data = await res.json();
      setUnreadCount(Array.isArray(data) ? data.length : 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);

    // Écouter les mises à jour manuelles (marquer lu, supprimer)
    const onManual = () => refresh();
    window.addEventListener("alerts-updated", onManual);

    // Écouter les notifications Socket.IO temps réel
    let socket: any = null;
    try {
      const win = window as any;
      if (win.__socket) {
        socket = win.__socket;
        socket.on("notification:new", refresh);
      }
    } catch {}

    return () => {
      clearInterval(interval);
      window.removeEventListener("alerts-updated", onManual);
      if (socket) socket.off("notification:new", refresh);
    };
  }, [refresh]);

  return { unreadCount, refresh };
}
