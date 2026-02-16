import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      client: { select: { name: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  // Créer une notification pour chaque cuisinier
  const cooks = await prisma.user.findMany({ where: { role: "COOK", isActive: true }, select: { id: true } });
  const itemNames = order.items.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(", ");
  const clientName = order.client?.name || (order as any).guestName || "Client";

  if (cooks.length > 0) {
    await prisma.alert.createMany({
      data: cooks.map((cook) => ({
        type: "ORDER_NOTIFICATION" as any,
        severity: "WARNING" as any,
        title: `Nouvelle commande #${order.id.slice(-6)}`,
        message: `${clientName} — ${itemNames} (${order.totalAmount?.toLocaleString()} F)`,
        userId: cook.id,
        data: { orderId: order.id },
      })),
    });
  }

  // Socket.IO : notifier les cuisiniers en temps réel
  const io = (global as any).io;
  if (io) {
    io.to("cooks").emit("order:new", {
      id: order.id,
      clientName,
      totalAmount: order.totalAmount,
      items: order.items,
      createdAt: order.createdAt,
      status: order.status,
    });
    // Émettre aussi un événement notification pour le badge
    io.to("cooks").emit("notification:new");
  }

  return NextResponse.json({ success: true, notified: cooks.length });
}
