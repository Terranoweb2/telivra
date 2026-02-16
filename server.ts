import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import cron from "node-cron";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000");

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  (global as any).io = io;

  io.on("connection", (socket) => {
    console.log("[Socket.IO] Client connected:", socket.id);

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

    // Livraison: client ecoute ses commandes
    socket.on("subscribe:client", (clientId: string) => {
      socket.join(`client:${clientId}`);
      console.log(`[Socket.IO] ${socket.id} joined client:${clientId}`);
    });
    socket.on("unsubscribe:client", (clientId: string) => {
      socket.leave(`client:${clientId}`);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.IO] Client disconnected:", socket.id);
    });
  });

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
});
