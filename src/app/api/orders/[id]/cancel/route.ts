import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const body = await request.json().catch(() => ({}));

  const order = await prisma.order.findUnique({
    where: { id },
    include: { delivery: true },
  });

  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.status === "DELIVERED") return NextResponse.json({ error: "Commande deja livree" }, { status: 400 });
  if (order.status === "CANCELLED") return NextResponse.json({ error: "Commande deja annulee" }, { status: 400 });

  // Raison obligatoire
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: "Veuillez preciser la raison de l'annulation" }, { status: 400 });
  }

  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const isClient = order.clientId && order.clientId === userId;
  const isGuest = !session && order.guestPhone && body.guestPhone === order.guestPhone;
  const isDriver = order.delivery?.driverId === userId;
  const isAdmin = userRole === "ADMIN";

  if (order.status === "PENDING") {
    if (!isClient && !isGuest && !isAdmin) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }
  } else {
    const acceptedAt = order.delivery?.startTime || order.updatedAt;
    const minutesSinceAccepted = (Date.now() - new Date(acceptedAt).getTime()) / 60000;

    if (isDriver || isAdmin) {
      // Livreur et admin peuvent annuler a tout moment (sauf livree)
    } else if ((isClient || isGuest) && minutesSinceAccepted <= 5) {
      // Client/Guest peut annuler dans les 5 minutes apres acceptation
    } else {
      return NextResponse.json(
        { error: "Delai d'annulation depasse (5 minutes apres acceptation)" },
        { status: 400 }
      );
    }
  }

  // Annuler la commande avec raison
  await prisma.order.update({
    where: { id },
    data: { status: "CANCELLED", cancelReason: reason },
  });

  if (order.delivery) {
    await prisma.delivery.update({
      where: { id: order.delivery.id },
      data: { status: "CANCELLED", endTime: new Date() },
    });
  }

  // Notifier via Socket.IO
  const io = (global as any).io;
  if (io) {
    io.to(`order:${id}`).emit("delivery:status", { orderId: id, status: "CANCELLED", reason });
    if (order.delivery) {
      io.to("drivers").emit("order:cancelled", { orderId: id, reason });
    }
  }

  return NextResponse.json({ ok: true, status: "CANCELLED", reason });
}
