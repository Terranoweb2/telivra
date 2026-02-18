import { prisma } from "@/lib/prisma";
import { sendPushToUser, sendPushToRole } from "@/lib/web-push";

interface NotifyOptions {
  type: string;
  title: string;
  message: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  data?: any;
  pushPayload?: { title: string; body: string; url?: string; tag?: string; image?: string };
}

/** Créer une alerte pour un user spécifique + push */
export async function notifyUser(userId: string, opts: NotifyOptions) {
  try {
    await prisma.alert.create({
      data: {
        type: opts.type as any,
        severity: (opts.severity || "INFO") as any,
        title: opts.title,
        message: opts.message,
        data: opts.data || undefined,
        userId,
      },
    });
    const io = (global as any).io;
    if (io) {
      io.to(`client:${userId}`).emit("notification:new", { type: opts.type, title: opts.title });
    }
    if (opts.pushPayload) {
      sendPushToUser(userId, { ...opts.pushPayload, icon: "/icons/icon-192.png" });
    }
  } catch (err) {
    console.error("[notify] notifyUser error:", err);
  }
}

/** Créer une alerte pour tous les users d'un rôle + push */
export async function notifyRole(role: string, opts: NotifyOptions, excludeUserId?: string) {
  try {
    const where: any = { role, isActive: true };
    if (excludeUserId) where.id = { not: excludeUserId };
    const users = await prisma.user.findMany({ where, select: { id: true } });

    if (users.length > 0) {
      await prisma.alert.createMany({
        data: users.map((u) => ({
          type: opts.type as any,
          severity: (opts.severity || "INFO") as any,
          title: opts.title,
          message: opts.message,
          data: opts.data || undefined,
          userId: u.id,
        })),
      });

      const io = (global as any).io;
      if (io) {
        const room = role === "ADMIN" ? "admins" : role === "COOK" ? "cooks" : role === "DRIVER" ? "drivers" : null;
        if (room) {
          io.to(room).emit("notification:new", { type: opts.type, title: opts.title });
        }
      }

      if (opts.pushPayload) {
        sendPushToRole(role, { ...opts.pushPayload, icon: "/icons/icon-192.png" }, excludeUserId);
      }
    }
  } catch (err) {
    console.error("[notify] notifyRole error:", err);
  }
}
