import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { latitude, longitude, speed } = await request.json();

  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });

  const position = await prisma.deliveryPosition.create({
    data: { deliveryId: id, latitude, longitude, speed },
  });

  await prisma.delivery.update({
    where: { id },
    data: { currentLat: latitude, currentLng: longitude },
  });

  const io = (global as any).io;
  if (io) {
    io.to(`order:${delivery.orderId}`).emit("delivery:position", {
      deliveryId: id,
      latitude, longitude, speed,
      timestamp: position.timestamp,
    });
  }

  return NextResponse.json({ success: true });
});
