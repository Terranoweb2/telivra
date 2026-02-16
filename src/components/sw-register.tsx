"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Enregistre, scope:", reg.scope);

        // Nettoyage des tuiles toutes les 30 minutes
        setInterval(() => {
          reg.active?.postMessage("cleanup-tiles");
        }, 30 * 60 * 1000);

        // Quand on revient en ligne, synchroniser les mutations
        window.addEventListener("online", () => {
          setTimeout(() => {
            reg.active?.postMessage("sync-mutations");
          }, 2000);
        });

        // Verifier les mises a jour du SW toutes les heures
        setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch((err) => {
        console.log("[SW] Erreur:", err);
      });
  }, []);

  return null;
}
