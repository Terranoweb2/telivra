import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyRole } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { orderId, latitude, longitude } = await request.json();
  if (!orderId) return NextResponse.json({ error: "orderId requis" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.delivery) return NextResponse.json({ error: "Commande déjà prise" }, { status: 400 });

  // Le livreur ne peut accepter que les commandes READY (cuisine terminee)
  if (order.status !== "READY") {
    return NextResponse.json({ error: "Commande pas encore prête (cuisine en cours)" }, { status: 400 });
  }

  const driverId = (session.user as any).id;
  const driverName = (session.user as any).name;

  const delivery = await prisma.delivery.create({
    data: {
      orderId,
      driverId,
      status: "DELIVERING",
      currentLat: latitude || null,
      currentLng: longitude || null,
    },
  });

  await prisma.order.update({ where: { id: orderId }, data: { status: "PICKED_UP" } });

  // Creer la premiere position si disponible
  if (latitude && longitude) {
    await prisma.deliveryPosition.create({
      data: { deliveryId: delivery.id, latitude, longitude, speed: 0 },
    });
  }

  const io = (global as any).io;
  if (io) {
    io.to(`order:${orderId}`).emit("delivery:accepted", {
      deliveryId: delivery.id,
      driverName,
      latitude,
      longitude,
    });
    if (order.clientId) {
      io.to(`client:${order.clientId}`).emit("delivery:accepted", {
        orderId,
        deliveryId: delivery.id,
        driverName,
        status: "PICKED_UP",
      });
    }
    io.to("drivers").emit("order:taken", { orderId });

    // Envoyer la position initiale du livreur au client
    if (latitude && longitude) {
      io.to(`order:${orderId}`).emit("delivery:position", {
        deliveryId: delivery.id,
        latitude,
        longitude,
        speed: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Notifier les autres livreurs que la commande est prise
  notifyRole("ADMIN", {
    type: "ORDER_TAKEN",
    title: "Commande assignée",
    message: `Commande prise par ${driverName}`,
    severity: "INFO",
    data: { orderId },
    pushPayload: {
      title: "Commande assignée",
      body: `Prise par ${driverName}`,
      url: "/livraison",
      tag: `taken-${orderId}`,
    },
  });

  return NextResponse.json(delivery, { status: 201 });
}
