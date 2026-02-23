import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true, phone: true } },
      promotion: { select: { name: true } },
      rating: true,
      delivery: {
        include: {
          driver: { select: { id: true, name: true, phone: true } },
          positions: { orderBy: { timestamp: "desc" }, take: 20 },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  return NextResponse.json(order);
});
