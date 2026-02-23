import "dotenv/config";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import next from "next";
import { Server } from "socket.io";
import cron from "node-cron";
import { tenantStorage, cleanupIdleClients } from "./src/lib/prisma";
import { getTenant, refreshTenantCache, shouldRefreshCache, getAllTenants, getBlockedPageSettings } from "./src/lib/tenant";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000");
const BASE_DOMAIN = process.env.BASE_DOMAIN || "";

function extractSubdomain(host: string | undefined): string | null {
  if (!host || !BASE_DOMAIN) return null;
  const hostname = host.split(":")[0];
  if (hostname.endsWith("." + BASE_DOMAIN)) {
    const sub = hostname.replace("." + BASE_DOMAIN, "");
    if (sub && !sub.includes(".")) return sub;
  }
  return null;
}

// Échapper le HTML pour éviter les injections XSS dans le rendu dynamique
function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
  const MIME: Record<string, string> = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".wav": "audio/wav",
  };

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Servir les fichiers uploadés directement (évite le 404 Next.js post-build)
    if (req.url && req.url.startsWith("/uploads/")) {
      const safePath = req.url.split("?")[0].replace(/\.\.\//g, "");
      const filePath = join(process.cwd(), "public", safePath);
      if (existsSync(filePath)) {
        const stat = statSync(filePath);
        const ext = extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Content-Length": stat.size,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        createReadStream(filePath).pipe(res);
        return;
      }
    }
    // Ne pas passer les requetes socket.io a Next.js (sinon 308 redirect)
    if (req.url && req.url.startsWith("/socket.io")) return;

    // === MULTI-TENANT : routage par subdomain ===
    if (shouldRefreshCache()) refreshTenantCache();

    const subdomain = extractSubdomain(req.headers.host);

    if (subdomain) {
      const tenant = getTenant(subdomain);

      if (!tenant) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html><html><body style="background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><div style="text-align:center"><h1 style="font-size:2rem;margin-bottom:0.5rem">Restaurant introuvable</h1><p style="color:#888">Ce restaurant n'existe pas sur notre plateforme.</p></div></body></html>`);
        return;
      }

      if (tenant.isBlocked) {
        const bp = getBlockedPageSettings();
        const title = escHtml(bp?.blockedPageTitle || "Restaurant indisponible");
        const subtitle = bp?.blockedPageSubtitle ? escHtml(bp.blockedPageSubtitle) : "";
        // Le contenu WYSIWYG est déjà du HTML contrôlé par le super admin
        const content = bp?.blockedPageContent || "";
        const features = bp?.blockedPageFeatures || [];
        const btnText = bp?.blockedPageButtonText ? escHtml(bp.blockedPageButtonText) : "";
        const btnUrl = bp?.blockedPageButtonUrl ? escHtml(bp.blockedPageButtonUrl) : "";
        const email = bp?.blockedPageEmail ? escHtml(bp.blockedPageEmail) : "";
        const logo = bp?.blockedPageLogo || "🍽";
        const featuresHtml = features.map(f =>
          `<div class="feature"><div class="feature-icon">${escHtml(f.icon)}</div><div class="feature-title">${escHtml(f.title)}</div><div class="feature-desc">${escHtml(f.desc)}</div></div>`
        ).join("");
        res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Terrano - ${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0a0a;color:#fff;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem}
.container{max-width:480px;width:100%;text-align:center}
.logo{font-size:2.5rem;margin-bottom:0.5rem}
h1{font-size:1.6rem;font-weight:700;margin-bottom:0.5rem;line-height:1.3}
.subtitle{color:#a0a0a0;font-size:0.95rem;margin-bottom:1.5rem;line-height:1.5}
.content{color:#ccc;font-size:0.9rem;margin-bottom:1.5rem;line-height:1.6;text-align:left}
.content h3{font-size:1.1rem;font-weight:700;margin-bottom:0.5rem}
.content a{color:#ea580c;text-decoration:underline}
.content ul,.content ol{padding-left:1.2rem;margin-bottom:0.5rem}
.features{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:2rem;text-align:left}
.feature{background:#111;border:1px solid #222;border-radius:12px;padding:1rem}
.feature-icon{font-size:1.5rem;margin-bottom:0.4rem}
.feature-title{font-size:0.85rem;font-weight:600;color:#fff;margin-bottom:0.2rem}
.feature-desc{font-size:0.75rem;color:#888;line-height:1.4}
.cta{display:inline-flex;align-items:center;gap:0.5rem;background:#ea580c;color:#fff;padding:0.85rem 2rem;border-radius:12px;text-decoration:none;font-weight:600;font-size:0.95rem;transition:background 0.2s}
.cta:hover{background:#c2410c}
.cta-secondary{display:block;margin-top:0.75rem;color:#888;font-size:0.8rem;text-decoration:none}
.cta-secondary:hover{color:#fff}
@media(max-width:480px){.features{grid-template-columns:1fr}h1{font-size:1.3rem}}
</style></head><body>
<div class="container">
  <div class="logo">${logo}</div>
  <h1>${title}</h1>
  ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
  ${content ? `<div class="content">${content}</div>` : ""}
  ${featuresHtml ? `<div class="features">${featuresHtml}</div>` : ""}
  ${btnText ? `<a href="${btnUrl}" class="cta">&#128172; ${btnText}</a>` : ""}
  ${email ? `<a href="mailto:${email}" class="cta-secondary">${email}</a>` : ""}
</div>
</body></html>`);
        return;
      }

      if (tenant.maintenanceMode) {
        res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tenant.name} - Maintenance</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:system-ui;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}.c{max-width:420px;text-align:center}.icon{font-size:3rem;margin-bottom:1rem}h1{font-size:1.5rem;font-weight:700;margin-bottom:0.5rem}.sub{color:#a0a0a0;font-size:0.9rem;line-height:1.6;margin-bottom:1.5rem}.bar{width:120px;height:4px;background:#222;border-radius:2px;margin:0 auto;overflow:hidden}.bar-inner{width:40%;height:100%;background:#ea580c;border-radius:2px;animation:slide 1.5s ease-in-out infinite}@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}</style></head><body>
<div class="c"><div class="icon">&#128736;</div><h1>Maintenance en cours</h1><p class="sub">${tenant.name} est temporairement indisponible pour maintenance.<br>Nous serons de retour tres bientot.</p><div class="bar"><div class="bar-inner"></div></div></div>
</body></html>`);
        return;
      }

      // Injecter le header pour que next/headers puisse le lire dans prisma.ts
      req.headers["x-tenant-db-url"] = tenant.databaseUrl;

      // Wrapper la requête avec le contexte tenant (backup AsyncLocalStorage)
      tenantStorage.run(tenant.databaseUrl, () => {
        handler(req, res);
      });
      return;
    }

    // Pas de subdomain → comportement par défaut
    handler(req, res);
  });
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  (global as any).io = io;

  // Chat presence tracking: orderId -> Set<socketId>
  const chatPresence = new Map<string, Set<string>>();

  function emitPresence(orderId: string) {
    const members = chatPresence.get(orderId);
    const count = members ? members.size : 0;
    io.to(`chat:${orderId}`).emit("chat:presence", { orderId, count });
  }

  // Presence tracking: userId -> { socketIds, role, name }
  const presenceMap = new Map<string, { socketIds: Set<string>; role: string; name: string }>();
  const disconnectTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected:", socket.id);

    // Multi-tenant: stocker le contexte du tenant dans le socket
    socket.on("tenant:identify", (tenantSlug: string) => {
      const tenant = getTenant(tenantSlug);
      if (tenant) {
        (socket as any).__tenantSlug = tenantSlug;
        (socket as any).__tenantDbUrl = tenant.databaseUrl;
      }
    });

    // Tracking GPS devices
    socket.on("subscribe:device", (deviceId: string) => {
      socket.join(`device:${deviceId}`);
    });
    socket.on("subscribe:all", () => {
      socket.join("all-devices");
    });
    socket.on("unsubscribe:device", (deviceId: string) => {
      socket.leave(`device:${deviceId}`);
    });

    // Livraison: client suit sa commande
    socket.on("subscribe:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`[Socket.IO] ${socket.id} watching order:${orderId}`);
    });
    socket.on("unsubscribe:order", (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Livraison: livreur ecoute les nouvelles commandes
    socket.on("subscribe:driver", () => {
      socket.join("drivers");
      console.log(`[Socket.IO] ${socket.id} joined drivers room`);
    });
    socket.on("unsubscribe:driver", () => {
      socket.leave("drivers");
    });

    // Cuisine: cuisinier ecoute les nouvelles commandes
    socket.on("subscribe:cook", () => {
      socket.join("cooks");
      console.log(`[Socket.IO] ${socket.id} joined cooks room`);
    });
    socket.on("unsubscribe:cook", () => {
      socket.leave("cooks");
    });

    // Admin: ecoute les notifications admin
    socket.on("subscribe:admin", () => {
      socket.join("admins");
      console.log(`[Socket.IO] ${socket.id} joined admins room`);
    });
    socket.on("unsubscribe:admin", () => {
      socket.leave("admins");
    });

    // === Presence system for cook/driver online detection ===
    socket.on("presence:join", ({ userId, role, name }: { userId: string; role: string; name: string }) => {
      (socket as any).presenceUserId = userId;
      if (disconnectTimeouts.has(userId)) {
        clearTimeout(disconnectTimeouts.get(userId)!);
        disconnectTimeouts.delete(userId);
      }
      if (!presenceMap.has(userId)) {
        presenceMap.set(userId, { socketIds: new Set(), role, name });
      }
      presenceMap.get(userId)!.socketIds.add(socket.id);
      io.to("admins").emit("presence:update", { userId, role, name, online: true });
      console.log(`[Presence] ${name} (${role}) online`);
    });

    socket.on("presence:list", () => {
      const list = Array.from(presenceMap.entries()).map(([userId, d]) => ({
        userId, role: d.role, name: d.name, online: true,
      }));
      socket.emit("presence:list", list);
    });

    // Livraison: client ecoute ses commandes
    socket.on("subscribe:client", (clientId: string) => {
      socket.join(`client:${clientId}`);
      console.log(`[Socket.IO] ${socket.id} joined client:${clientId}`);
    });
    socket.on("unsubscribe:client", (clientId: string) => {
      socket.leave(`client:${clientId}`);
    });

    // Chat: rejoindre/quitter la room de discussion
    socket.on("subscribe:chat", (orderId: string) => {
      socket.join(`chat:${orderId}`);
      if (!chatPresence.has(orderId)) chatPresence.set(orderId, new Set());
      chatPresence.get(orderId)!.add(socket.id);
      emitPresence(orderId);
      console.log(`[Socket.IO] ${socket.id} joined chat:${orderId} (${chatPresence.get(orderId)!.size} members)`);
    });
    socket.on("unsubscribe:chat", (orderId: string) => {
      socket.leave(`chat:${orderId}`);
      const members = chatPresence.get(orderId);
      if (members) {
        members.delete(socket.id);
        if (members.size === 0) chatPresence.delete(orderId);
      }
      emitPresence(orderId);
    });

    // Chat: indicateur de frappe
    socket.on("chat:typing", (data: { orderId: string; sender: string; name: string }) => {
      socket.to(`chat:${data.orderId}`).emit("chat:typing", {
        orderId: data.orderId,
        sender: data.sender,
        name: data.name,
      });
    });
    socket.on("chat:stop-typing", (data: { orderId: string }) => {
      socket.to(`chat:${data.orderId}`).emit("chat:stop-typing", {
        orderId: data.orderId,
      });
    });

    // Chat: relayer editions et suppressions de messages
    socket.on("chat:message-edited", (data: { messageId: string; content: string; orderId: string }) => {
      socket.to(`chat:${data.orderId}`).emit("chat:message-edited", data);
    });
    socket.on("chat:message-deleted", (data: { messageId: string; orderId: string }) => {
      socket.to(`chat:${data.orderId}`).emit("chat:message-deleted", data);
    });


    // ===== APPELS VoIP WebRTC =====
    socket.on("call:initiate", (data: { orderId: string; callerName: string; callerRole: string }) => {
      socket.to(`chat:${data.orderId}`).emit("call:incoming", {
        orderId: data.orderId,
        callerName: data.callerName,
        callerRole: data.callerRole,
      });
      console.log(`[Call] ${data.callerName} calling on order ${data.orderId}`);
    });

    socket.on("call:accept", (data: { orderId: string; accepterName?: string }) => {
      socket.to(`chat:${data.orderId}`).emit("call:accepted", { orderId: data.orderId, accepterName: data.accepterName });
    });

    socket.on("call:offer", (data: { orderId: string; offer: any }) => {
      socket.to(`chat:${data.orderId}`).emit("call:offer", { orderId: data.orderId, offer: data.offer });
    });

    socket.on("call:answer", (data: { orderId: string; answer: any }) => {
      socket.to(`chat:${data.orderId}`).emit("call:answer", { orderId: data.orderId, answer: data.answer });
    });

    socket.on("call:ice-candidate", (data: { orderId: string; candidate: any }) => {
      socket.to(`chat:${data.orderId}`).emit("call:ice-candidate", { orderId: data.orderId, candidate: data.candidate });
    });

    socket.on("call:end", (data: { orderId: string }) => {
      socket.to(`chat:${data.orderId}`).emit("call:ended", { orderId: data.orderId });
    });

    socket.on("call:missed", async (data: { orderId: string; callerName: string }) => {
      const dbUrl = (socket as any).__tenantDbUrl;
      const runMissedCall = async () => {
      try {
        const { prisma: db } = await import("./src/lib/prisma");
        await db.message.create({
          data: {
            content: `Appel manque de ${data.callerName}`,
            sender: "SYSTEM",
            orderId: data.orderId,
          },
        });
        const msg = await db.message.findFirst({
          where: { orderId: data.orderId, sender: "SYSTEM" },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, role: true } } },
        });
        if (msg) {
          io.to(`chat:${data.orderId}`).emit("chat:message", {
            ...msg,
            createdAt: msg.createdAt.toISOString(),
          });
        }
      } catch (e) {
        console.error("[Call] Missed call error:", e);
      }
      };
      if (dbUrl) {
        const { tenantStorage: ts } = await import("./src/lib/prisma");
        ts.run(dbUrl, runMissedCall);
      } else {
        await runMissedCall();
      }
    });

    socket.on("call:busy", (data: { orderId: string }) => {
      socket.to(`chat:${data.orderId}`).emit("call:busy", { orderId: data.orderId });
    });

    socket.on("disconnect", () => {
      // Presence cleanup with 5s grace period (handles page refresh)
      const presUserId = (socket as any).presenceUserId as string | undefined;
      if (presUserId) {
        const entry = presenceMap.get(presUserId);
        if (entry) {
          entry.socketIds.delete(socket.id);
          if (entry.socketIds.size === 0) {
            const t = setTimeout(() => {
              const e = presenceMap.get(presUserId);
              if (e && e.socketIds.size === 0) {
                presenceMap.delete(presUserId);
                io.to("admins").emit("presence:update", {
                  userId: presUserId, role: e.role, name: e.name, online: false,
                });
                console.log(`[Presence] ${e.name} (${e.role}) offline`);
                // Persist lastSeenAt in DB
                const disconnectDbUrl = (socket as any).__tenantDbUrl;
                import("./src/lib/prisma").then(({ prisma, tenantStorage: ts }) => {
                  const doUpdate = () => prisma.user.update({ where: { id: presUserId }, data: { lastSeenAt: new Date() } })
                    .catch((err: any) => console.error("[Presence] lastSeenAt error:", err));
                  if (disconnectDbUrl) { ts.run(disconnectDbUrl, doUpdate); } else { doUpdate(); }
                });
              }
              disconnectTimeouts.delete(presUserId);
            }, 5000);
            disconnectTimeouts.set(presUserId, t);
          }
        }
      }

      // Clean up presence from all chat rooms
      for (const [orderId, members] of chatPresence.entries()) {
        if (members.has(socket.id)) {
          members.delete(socket.id);
          if (members.size === 0) chatPresence.delete(orderId);
          emitPresence(orderId);
        }
      }
      console.log("[Socket.IO] Client disconnected:", socket.id);
    });
  });

  // Initialiser le cache tenant AVANT de démarrer le serveur
  try {
    await refreshTenantCache();
    console.log("[Tenant] Cache initialized");
  } catch (e) {
    console.error("[Tenant] Initial cache load failed:", e);
  }

  httpServer.listen(port, () => {
    console.log(`> Terrano GPS ready on http://${hostname}:${port}`);
  });

  // Cron quotidien à 8h — notifications promotions
  cron.schedule("0 8 * * *", async () => {
    console.log("[Cron] Envoi des notifications promotions...");
    try {
      const res = await fetch(`http://localhost:${port}/api/promotions/notify`, { method: "POST" });
      const data = await res.json();
      console.log("[Cron] Notifications promotions:", data);
    } catch (err) {
      console.error("[Cron] Erreur notifications promotions:", err);
    }
  });

  // Cron quotidien à 7h — vérification anniversaires
  cron.schedule("0 7 * * *", async () => {
    console.log("[Cron] Verification des anniversaires...");
    try {
      const res = await fetch(`http://localhost:${port}/api/birthdays/check`, { method: "POST" });
      const data = await res.json();
      console.log("[Cron] Anniversaires:", data);
    } catch (err) {
      console.error("[Cron] Erreur anniversaires:", err);
    }
  });

  // Cron hebdomadaire lundi 9h — détection clients fidèles
  cron.schedule("0 9 * * 1", async () => {
    console.log("[Cron] Detection des clients fideles...");
    try {
      const res = await fetch(`http://localhost:${port}/api/loyalty/check`, { method: "POST" });
      const data = await res.json();
      console.log("[Cron] Clients fideles:", data);
    } catch (err) {
      console.error("[Cron] Erreur clients fideles:", err);
    }
  });

  // Nettoyage des clients Prisma idle (toutes les 5 minutes)
  cron.schedule("*/5 * * * *", () => {
    cleanupIdleClients();
  });

  // Cron toutes les 5 minutes — envoi des newsletters programmées
  cron.schedule("*/5 * * * *", async () => {
    try {
      const res = await fetch(`http://localhost:${port}/api/system/send-scheduled-newsletters`, { method: "POST" });
      const data = await res.json();
      if (data.totalSent > 0) {
        console.log("[Cron] Newsletters programmées envoyées:", data.totalSent);
      }
    } catch (err) {
      console.error("[Cron] Erreur newsletters programmées:", err);
    }
  });

  // Cron tous les 3 jours à 9h — envoi des astuces aux admins
  cron.schedule("0 9 */3 * *", async () => {
    console.log("[Cron] Envoi des astuces aux admins...");
    try {
      const res = await fetch(`http://localhost:${port}/api/system/send-tips`, { method: "POST" });
      const data = await res.json();
      console.log("[Cron] Astuces:", data);
    } catch (err) {
      console.error("[Cron] Erreur astuces:", err);
    }
  });
});
