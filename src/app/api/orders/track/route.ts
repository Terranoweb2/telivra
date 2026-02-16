import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const phone = searchParams.get("phone");

  const where: any = {};
  if (ref && ref.trim().length >= 3) {
    where.orderNumber = { contains: ref.trim().toUpperCase(), mode: "insensitive" };
  } else if (phone && phone.length >= 8) {
    where.guestPhone = phone;
  } else {
    return NextResponse.json({ error: "Référence ou téléphone requis" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      delivery: {
        include: {
          driver: { select: { id: true, name: true } },
          positions: { orderBy: { timestamp: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(orders);
}
