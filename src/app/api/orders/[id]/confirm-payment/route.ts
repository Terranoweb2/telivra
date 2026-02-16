import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.paymentConfirmed) {
    return NextResponse.json({ error: "Paiement déjà confirmé" }, { status: 409 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { paymentConfirmed: true, paymentStatus: "PAID" },
  });

  const io = (global as any).io;
  if (io) {
    io.to("order:" + id).emit("order:payment-confirmed", { orderId: id });
  }

  return NextResponse.json(updated);
}
