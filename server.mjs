var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/prisma.ts
var prisma_exports = {};
__export(prisma_exports, {
  prisma: () => prisma
});
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2e4,
    idleTimeoutMillis: 3e4,
    max: 10
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
var globalForPrisma, prisma;
var init_prisma = __esm({
  "src/lib/prisma.ts"() {
    "use strict";
    globalForPrisma = globalThis;
    prisma = globalForPrisma.prisma ?? createPrismaClient();
    globalForPrisma.prisma = prisma;
  }
});

// server.ts
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import next from "next";
import { Server } from "socket.io";
import cron from "node-cron";
var dev = process.env.NODE_ENV !== "production";
var hostname = "localhost";
var port = parseInt(process.env.PORT || "3000");
var app = next({ dev, hostname, port });
var handler = app.getRequestHandler();
app.prepare().then(() => {
  const MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav"
  };
  const httpServer = createServer((req, res) => {
    if (req.url && req.url.startsWith("/uploads/")) {
      const safePath = req.url.split("?")[0].replace(/\.\.\//g, "");
      const filePath = join(process.cwd(), "public", safePath);
      if (existsSync(filePath)) {
        const stat = statSync(filePath);
        const ext = extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Content-Length": stat.size,
          "Cache-Control": "public, max-age=31536000, immutable"
        });
        createReadStream(filePath).pipe(res);
        return;
      }
    }
    if (req.url && req.url.startsWith("/socket.io")) return;
    handler(req, res);
  });
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io"
  });
  global.io = io;
  const chatPresence = /* @__PURE__ */ new Map();
  function emitPresence(orderId) {
    const members = chatPresence.get(orderId);
    const count = members ? members.size : 0;
    io.to(`chat:${orderId}`).emit("chat:presence", { orderId, count });
  }
  const presenceMap = /* @__PURE__ */ new Map();
  const disconnectTimeouts = /* @__PURE__ */ new Map();
  io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected:", socket.id);
    socket.on("subscribe:device", (deviceId) => {
      socket.join(`device:${deviceId}`);
    });
    socket.on("subscribe:all", () => {
      socket.join("all-devices");
    });
    socket.on("unsubscribe:device", (deviceId) => {
      socket.leave(`device:${deviceId}`);
    });
    socket.on("subscribe:order", (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`[Socket.IO] ${socket.id} watching order:${orderId}`);
    });
    socket.on("unsubscribe:order", (orderId) => {
      socket.leave(`order:${orderId}`);
    });
    socket.on("subscribe:driver", () => {
      socket.join("drivers");
      console.log(`[Socket.IO] ${socket.id} joined drivers room`);
    });
    socket.on("unsubscribe:driver", () => {
      socket.leave("drivers");
    });
    socket.on("subscribe:cook", () => {
      socket.join("cooks");
      console.log(`[Socket.IO] ${socket.id} joined cooks room`);
    });
    socket.on("unsubscribe:cook", () => {
      socket.leave("cooks");
    });
    socket.on("subscribe:admin", () => {
      socket.join("admins");
      console.log(`[Socket.IO] ${socket.id} joined admins room`);
    });
    socket.on("unsubscribe:admin", () => {
      socket.leave("admins");
    });
    socket.on("presence:join", ({ userId, role, name }) => {
      socket.presenceUserId = userId;
      if (disconnectTimeouts.has(userId)) {
        clearTimeout(disconnectTimeouts.get(userId));
        disconnectTimeouts.delete(userId);
      }
      if (!presenceMap.has(userId)) {
        presenceMap.set(userId, { socketIds: /* @__PURE__ */ new Set(), role, name });
      }
      presenceMap.get(userId).socketIds.add(socket.id);
      io.to("admins").emit("presence:update", { userId, role, name, online: true });
      console.log(`[Presence] ${name} (${role}) online`);
    });
    socket.on("presence:list", () => {
      const list = Array.from(presenceMap.entries()).map(([userId, d]) => ({
        userId,
        role: d.role,
        name: d.name,
        online: true
      }));
      socket.emit("presence:list", list);
    });
    socket.on("subscribe:client", (clientId) => {
      socket.join(`client:${clientId}`);
      console.log(`[Socket.IO] ${socket.id} joined client:${clientId}`);
    });
    socket.on("unsubscribe:client", (clientId) => {
      socket.leave(`client:${clientId}`);
    });
    socket.on("subscribe:chat", (orderId) => {
      socket.join(`chat:${orderId}`);
      if (!chatPresence.has(orderId)) chatPresence.set(orderId, /* @__PURE__ */ new Set());
      chatPresence.get(orderId).add(socket.id);
      emitPresence(orderId);
      console.log(`[Socket.IO] ${socket.id} joined chat:${orderId} (${chatPresence.get(orderId).size} members)`);
    });
    socket.on("unsubscribe:chat", (orderId) => {
      socket.leave(`chat:${orderId}`);
      const members = chatPresence.get(orderId);
      if (members) {
        members.delete(socket.id);
        if (members.size === 0) chatPresence.delete(orderId);
      }
      emitPresence(orderId);
    });
    socket.on("chat:typing", (data) => {
      socket.to(`chat:${data.orderId}`).emit("chat:typing", {
        orderId: data.orderId,
        sender: data.sender,
        name: data.name
      });
    });
    socket.on("chat:stop-typing", (data) => {
      socket.to(`chat:${data.orderId}`).emit("chat:stop-typing", {
        orderId: data.orderId
      });
    });
    socket.on("chat:message-edited", (data) => {
      socket.to(`chat:${data.orderId}`).emit("chat:message-edited", data);
    });
    socket.on("chat:message-deleted", (data) => {
      socket.to(`chat:${data.orderId}`).emit("chat:message-deleted", data);
    });
    socket.on("call:initiate", (data) => {
      socket.to(`chat:${data.orderId}`).emit("call:incoming", {
        orderId: data.orderId,
        callerName: data.callerName,
        callerRole: data.callerRole
      });
      console.log(`[Call] ${data.callerName} calling on order ${data.orderId}`);
    });
    socket.on("call:accept", (data) => {
      socket.to(`chat:${data.orderId}`).emit("call:accepted", { orderId: data.orderId, accepterName: data.accepterName });
    });
    socket.on("call:offer", (data) => {
      socket.to(`chat:${data.orderId}`).emit("call:offer", { orderId: data.orderId, offer: data.offer });
    });
    socket.on("call:answer", (data) => {
      socket.to(`chat:${data.orderId}`).emit("call:answer", { orderId: data.orderId, answer: data.answer });
    });
    socket.on("call:ice-candidate", (data) => {
      socket.to(`chat:${data.orderId}`).emit("call:ice-candidate", { orderId: data.orderId, candidate: data.candidate });
    });
    socket.on("call:end", (data) => {
      socket.to(`chat:${data.orderId}`).emit("call:ended", { orderId: data.orderId });
    });
    socket.on("call:missed", async (data) => {
      try {
        const { prisma: db } = await Promise.resolve().then(() => (init_prisma(), prisma_exports));
        await db.message.create({
          data: {
            content: `Appel manque de ${data.callerName}`,
            sender: "SYSTEM",
            orderId: data.orderId
          }
        });
        const msg = await db.message.findFirst({
          where: { orderId: data.orderId, sender: "SYSTEM" },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, role: true } } }
        });
        if (msg) {
          io.to(`chat:${data.orderId}`).emit("chat:message", {
            ...msg,
            createdAt: msg.createdAt.toISOString()
          });
        }
      } catch (e) {
        console.error("[Call] Missed call error:", e);
      }
    });
    socket.on("call:busy", (data) => {
      socket.to(`chat:${data.orderId}`).emit("call:busy", { orderId: data.orderId });
    });
    socket.on("disconnect", () => {
      const presUserId = socket.presenceUserId;
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
                  userId: presUserId,
                  role: e.role,
                  name: e.name,
                  online: false
                });
                console.log(`[Presence] ${e.name} (${e.role}) offline`);
                Promise.resolve().then(() => (init_prisma(), prisma_exports)).then(({ prisma: prisma2 }) => {
                  prisma2.user.update({ where: { id: presUserId }, data: { lastSeenAt: /* @__PURE__ */ new Date() } }).catch((err) => console.error("[Presence] lastSeenAt error:", err));
                });
              }
              disconnectTimeouts.delete(presUserId);
            }, 5e3);
            disconnectTimeouts.set(presUserId, t);
          }
        }
      }
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
  httpServer.listen(port, () => {
    console.log(`> Terrano GPS ready on http://${hostname}:${port}`);
  });
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
});
