import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyRole } from "@/lib/notify";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (!["COOK", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { client: { select: { name: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.paymentConfirmed) {
    return NextResponse.json({ error: "Paiement déjà confirmé" }, { status: 409 });
  }

  const cookId = (session.user as any).id;

  // Confirmer paiement = accepter la commande automatiquement
  const updateData: any = { paymentConfirmed: true, paymentStatus: "PAID" };
  if (order.status === "PENDING") {
    updateData.status = "PREPARING";
    updateData.cookId = cookId;
    updateData.cookAcceptedAt = new Date();
  }

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
  });

  const io = (global as any).io;
  if (io) {
    io.to("order:" + id).emit("order:payment-confirmed", { orderId: id });

    // Si la commande etait PENDING, emettre aussi l'evenement cook-accepted
    if (order.status === "PENDING") {
      const maxCookTime = Math.max(...updated.items.map((i: any) => i.product?.cookingTimeMin ?? 15));
      const eventData = {
        orderId: id,
        cookName: (session.user as any).name,
        cookAcceptedAt: updated.cookAcceptedAt?.toISOString(),
        cookingTimeMin: maxCookTime,
        status: "PREPARING",
      };
      io.to(`order:${id}`).emit("order:cook-accepted", eventData);
      if (updated.clientId) {
        io.to(`client:${updated.clientId}`).emit("order:cook-accepted", eventData);
      }
    }
  }

  // Notifier les admins de l'encaissement
  const clientName = order.client?.name || order.guestName || "Client";
  notifyRole("ADMIN", {
    type: "ENCAISSEMENT",
    title: "Paiement confirme",
    message: `${Math.round(order.totalAmount)} XOF — ${clientName}`,
    severity: "INFO",
    data: { orderId: id, amount: order.totalAmount, clientName, paymentMethod: order.paymentMethod },
    pushPayload: {
      title: "Paiement confirme",
      body: `${Math.round(order.totalAmount)} XOF — ${clientName}`,
      url: "/encaissement",
      tag: `payment-${id}`,
    },
  });

  return NextResponse.json(updated);
}
