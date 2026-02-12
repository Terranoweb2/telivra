import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTransaction } from "@/lib/fedapay";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orderId } = body;

  if (!orderId) return NextResponse.json({ error: "orderId requis" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { client: { select: { name: true } } },
  });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  const origin = request.headers.get("origin") || request.headers.get("host") || "";
  const callbackUrl = `${origin.startsWith("http") ? origin : `https://${origin}`}/api/payments/callback?orderId=${orderId}`;

  try {
    const customerName = order.client?.name || order.guestName || "Client";
    const { transactionId, paymentUrl } = await createTransaction(
      orderId,
      order.totalAmount,
      customerName,
      callbackUrl
    );

    await prisma.order.update({
      where: { id: orderId },
      data: { fedapayTransId: transactionId },
    });

    return NextResponse.json({ paymentUrl, transactionId });
  } catch (err: any) {
    console.error("[FedaPay] Erreur creation transaction:", err);
    return NextResponse.json({ error: err.message || "Erreur paiement" }, { status: 500 });
  }
}
