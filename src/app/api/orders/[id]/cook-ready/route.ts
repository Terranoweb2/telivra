import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyRole, notifyUser } from "@/lib/notify";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "COOK" && role !== "ADMIN") return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

  const { id } = await params;
  const cookId = (session.user as any).id;

  const order = await prisma.order.findUnique({ where: { id } });
  const isPickup = order?.deliveryMode === "PICKUP";
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.cookId !== cookId && role !== "ADMIN") {
    return NextResponse.json({ error: "Cette commande n'est pas la votre" }, { status: 403 });
  }
  if (!["ACCEPTED", "PREPARING"].includes(order.status)) {
    return NextResponse.json({ error: "Commande non en préparation" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "READY",
      cookReadyAt: new Date(),
    },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
  });

  const io = (global as any).io;
  if (io) io.to("admins").emit("staff:refresh");
  if (io) {
    const eventData = {
      orderId: id,
      status: "READY",
      clientName: updated.client?.name || updated.guestName,
      deliveryAddress: updated.deliveryAddress,
      totalAmount: updated.totalAmount,
      items: updated.items,
      deliveryMode: updated.deliveryMode,
    };
    // Notifier les livreurs (seulement pour livraison)
    if (!isPickup) {
      io.to("drivers").emit("order:ready", eventData);
    }
    // Notifier le client
    io.to(`order:${id}`).emit("order:ready", eventData);
    if (updated.clientId) {
      io.to(`client:${updated.clientId}`).emit("order:ready", eventData);
    }
  }

  // Notifier tous les livreurs par alerte + push
  const clientName = updated.client?.name || updated.guestName || "Client";
  const firstImg = updated.items?.[0]?.product?.image || null;
  if (!isPickup) {
    notifyRole("DRIVER", {
    type: "ORDER_READY",
    title: "Commande prête !",
    message: `${clientName} — ${updated.deliveryAddress}`,
    severity: "WARNING",
    data: { orderId: id, imageUrl: firstImg },
    pushPayload: {
      title: "Commande prête !",
      body: `${clientName} — ${updated.deliveryAddress}`,
      url: "/livraison",
      tag: `ready-${id}`,
    },
  });
  }


  // Notification push au client pour pickup
  if (isPickup && updated.clientId) {
    notifyUser(updated.clientId, {
      type: "ORDER_READY",
      title: "Votre commande est prête !",
      message: "Venez la récupérer au restaurant.",
      severity: "INFO",
      data: { orderId: id, status: "READY", imageUrl: firstImg, deliveryMode: "PICKUP" },
      pushPayload: {
        title: "Votre commande est prête !",
        body: "Venez la récupérer au restaurant.",
        url: `/track/${id}`,
        tag: `pickup-ready-${id}`,
      },
    });
  }
  return NextResponse.json(updated);
}
