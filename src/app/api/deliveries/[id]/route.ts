import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      order: { include: { items: { include: { product: true } }, client: { select: { id: true, name: true } }, rating: true } },
      driver: { select: { id: true, name: true } },
      positions: { orderBy: { timestamp: "asc" } },
    },
  });
  if (!delivery) return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });
  return NextResponse.json(delivery);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  const delivery = await prisma.delivery.update({
    where: { id },
    data: {
      status: body.status,
      currentLat: body.currentLat,
      currentLng: body.currentLng,
      estimatedMinutes: body.estimatedMinutes,
      endTime: body.status === "DELIVERED" ? new Date() : undefined,
    },
    include: { order: true },
  });

  if (body.status === "DELIVERING") {
    await prisma.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERING" } });
  } else if (body.status === "DELIVERED") {
    await prisma.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } });
  }

  const io = (global as any).io;
  if (io) {
    const eventData = {
      deliveryId: id,
      orderId: delivery.orderId,
      status: body.status,
      currentLat: body.currentLat,
      currentLng: body.currentLng,
      estimatedMinutes: body.estimatedMinutes,
    };
    // Notifier le suivi de commande
    io.to(`order:${delivery.orderId}`).emit("delivery:status", eventData);
    // Notifier la liste de commandes du client
    io.to(`client:${delivery.order.clientId}`).emit("delivery:status", eventData);
  }

  return NextResponse.json(delivery);
}
