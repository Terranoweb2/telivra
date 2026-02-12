import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { orderId, latitude, longitude } = await request.json();
  if (!orderId) return NextResponse.json({ error: "orderId requis" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { delivery: true } });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.delivery) return NextResponse.json({ error: "Commande deja prise" }, { status: 400 });

  // Le livreur ne peut accepter que les commandes READY (cuisine terminee)
  if (order.status !== "READY") {
    return NextResponse.json({ error: "Commande pas encore prete (cuisine en cours)" }, { status: 400 });
  }

  const delivery = await prisma.delivery.create({
    data: {
      orderId,
      driverId: (session.user as any).id,
      status: "PICKING_UP",
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
    const driverName = (session.user as any).name;
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

  return NextResponse.json(delivery, { status: 201 });
}
