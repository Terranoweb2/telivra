"use client";

import { useEffect, useState, useCallback, useRef } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePush() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const subscribed = useRef(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || subscribed.current) return;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const reg = await navigator.serviceWorker.ready;

      // Récupérer la clé VAPID
      const res = await fetch("/api/push/vapid");
      if (!res.ok) return;
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      subscribed.current = true;
    } catch (err) {
      console.error("[usePush] subscribe error:", err);
    }
  }, [isSupported]);

  // Auto-subscribe si permission déjà accordée
  useEffect(() => {
    if (isSupported && permission === "granted" && !subscribed.current) {
      subscribe();
    }
  }, [isSupported, permission, subscribe]);

  return { isSupported, permission, subscribe };
}
