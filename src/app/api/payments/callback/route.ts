import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkTransactionStatus } from "@/lib/fedapay";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const transId = searchParams.get("id");

  if (!orderId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const fedapayId = transId || order.fedapayTransId;
    if (fedapayId) {
      const { status } = await checkTransactionStatus(fedapayId);
      if (status === "approved") {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "PAID" },
        });
      } else if (status === "declined" || status === "cancelled") {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "FAILED" },
        });
      }
    }
  } catch (err) {
    console.error("[FedaPay] Erreur callback:", err);
  }

  // Redirect: si guest (pas de clientId), aller vers /track, sinon /livraison/order
  if (order.clientId) {
    return NextResponse.redirect(new URL(`/livraison/order/${orderId}`, request.url));
  } else {
    return NextResponse.redirect(new URL(`/track/${orderId}`, request.url));
  }
}
