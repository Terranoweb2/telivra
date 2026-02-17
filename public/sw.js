const CACHE_VERSION = "terrano-v2";
const TILE_CACHE = "terrano-tiles-v2";
const API_CACHE = "terrano-api-v2";
const STATIC_CACHE = "terrano-static-v2";

// Toutes les routes de l'application a pre-cacher
const APP_ROUTES = [
  "/",
  "/login",
  "/register",
  "/dashboard",
  "/map",
  "/navigate",
  "/livraison",
  "/livraison/order",
  "/livraison/driver",
  "/cuisine",
  "/products",
  "/devices",
  "/geofences",
  "/alerts",
  "/trips",
  "/users",
  "/settings",
  "/cooks",
  "/encaissement",
  "/statistiques",
  "/drivers",
  "/track",
];

// APIs critiques a pre-cacher
const API_PRECACHE = [
  "/api/products",
  "/api/settings",
  "/api/stats/revenue",
];

// ========== IndexedDB pour les mutations offline ==========
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("terrano-offline", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("mutations")) {
        db.createObjectStore("mutations", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveMutation(mutation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readwrite");
    tx.objectStore("mutations").add(mutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllMutations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readonly");
    const req = tx.objectStore("mutations").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearMutations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readwrite");
    tx.objectStore("mutations").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteMutation(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readwrite");
    tx.objectStore("mutations").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ========== INSTALL ==========
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      // Pre-cacher les pages
      caches.open(STATIC_CACHE).then((cache) =>
        Promise.allSettled(
          APP_ROUTES.map((url) =>
            fetch(url, { credentials: "include" })
              .then((res) => { if (res.ok) cache.put(url, res); })
              .catch(() => {})
          )
        )
      ),
      // Pre-cacher les APIs critiques
      caches.open(API_CACHE).then((cache) =>
        Promise.allSettled(
          API_PRECACHE.map((url) =>
            fetch(url, { credentials: "include" })
              .then((res) => { if (res.ok) cache.put(url, res); })
              .catch(() => {})
          )
        )
      ),
    ])
  );
  self.skipWaiting();
});

// ========== ACTIVATE ==========
self.addEventListener("activate", (event) => {
  const validCaches = [TILE_CACHE, API_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ========== FETCH ==========
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // === Mutations offline (POST, PUT, DELETE sur /api/) ===
  if (url.pathname.startsWith("/api/") && event.request.method !== "GET") {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        // Hors-ligne : sauvegarder la mutation pour replay
        try {
          const body = await event.request.clone().text();
          const contentType = event.request.headers.get("content-type") || "";
          await saveMutation({
            url: event.request.url,
            method: event.request.method,
            headers: { "content-type": contentType },
            body: body,
            timestamp: Date.now(),
          });

          // Notifier les clients
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({ type: "mutation-queued", url: url.pathname });
          });

          return new Response(
            JSON.stringify({ offline: true, queued: true, message: "Action enregistree, sera synchronisee au retour de la connexion" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch {
          return new Response(
            JSON.stringify({ offline: true, error: "Impossible de sauvegarder l'action" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
      })
    );
    return;
  }

  // === Tuiles de carte — Cache-first ===
  if (
    url.hostname.match(/^mt[0-3]\.google\.com$/) ||
    url.hostname.includes("tile.openstreetmap.org")
  ) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => new Response("", { status: 404 }));
        })
      )
    );
    return;
  }

  // === API GET — Network-first, fallback cache ===
  if (url.pathname.startsWith("/api/") && event.request.method === "GET") {
    if (url.pathname.startsWith("/api/auth/")) return;

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({ offline: true, error: "Hors connexion", data: [] }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          })
        )
    );
    return;
  }

  // === Assets statiques — Cache-first ===
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => new Response("", { status: 404 }));
        })
      )
    );
    return;
  }

  // === Pages HTML — Network-first, fallback cache ===
  if (event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Fallback : retourner la page d'accueil cachee
            return caches.match("/").then((home) => {
              if (home) return home;
              return new Response(
                "<html><body style='background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif'><div style='text-align:center'><h1>Hors connexion</h1><p>Verifiez votre connexion internet</p></div></body></html>",
                { status: 200, headers: { "Content-Type": "text/html" } }
              );
            });
          })
        )
    );
    return;
  }
});

// ========== SYNC : Rejouer les mutations en attente ==========
async function replayMutations() {
  try {
    const mutations = await getAllMutations();
    if (mutations.length === 0) return;

    let successCount = 0;
    for (const m of mutations) {
      try {
        const res = await fetch(m.url, {
          method: m.method,
          headers: m.headers,
          body: m.body || undefined,
          credentials: "include",
        });
        if (res.ok || res.status < 500) {
          await deleteMutation(m.id);
          successCount++;
        }
      } catch {
        // Toujours hors-ligne, arreter
        break;
      }
    }

    if (successCount > 0) {
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({ type: "mutations-synced", count: successCount });
      });
    }
  } catch {}
}

// Ecouter le message de sync
self.addEventListener("message", (event) => {
  if (event.data === "cleanup-tiles") {
    caches.open(TILE_CACHE).then((cache) =>
      cache.keys().then((keys) => {
        if (keys.length > 2000) {
          const toDelete = keys.slice(0, 500);
          return Promise.all(toDelete.map((k) => cache.delete(k)));
        }
      })
    );
  }
  if (event.data === "sync-mutations") {
    replayMutations();
  }
});
