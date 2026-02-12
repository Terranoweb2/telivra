import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity } = body;

    if (!entity?.custom_metadata?.order_id) {
      return NextResponse.json({ ok: true });
    }

    const orderId = entity.custom_metadata.order_id;
    const status = entity.status;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ ok: true });

    if (status === "approved") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          fedapayTransId: String(entity.id),
        },
      });
    } else if (status === "declined" || status === "cancelled") {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "FAILED" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[FedaPay] Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
