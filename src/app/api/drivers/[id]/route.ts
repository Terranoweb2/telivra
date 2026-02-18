import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;

  const driver = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  });
  if (!driver) return NextResponse.json({ error: "Livreur introuvable" }, { status: 404 });

  const deliveries = await prisma.delivery.findMany({
    where: { driverId: id, status: "DELIVERED" },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      order: {
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          deliveryAddress: true,
          deliveryMode: true,
          client: { select: { id: true, name: true, email: true } },
          guestName: true,
          guestPhone: true,
          cook: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, price: true, image: true } } } },
          rating: { select: { driverRating: true, mealRating: true, driverComment: true, mealComment: true, createdAt: true } },
        },
      },
    },
    orderBy: { endTime: "desc" },
  });

  // Aggregate stats
  const totalRevenue = deliveries.reduce((s, d) => s + (d.order?.totalAmount || 0), 0);
  const ratings = deliveries
    .filter((d) => d.order?.rating?.driverRating && d.order.rating.driverRating > 0)
    .map((d) => d.order!.rating!.driverRating);
  const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : null;

  // Unique clients
  const clientMap = new Map<string, { id: string; name: string; count: number }>();
  for (const d of deliveries) {
    const clientId = d.order?.client?.id || d.order?.guestPhone || d.order?.guestName || "unknown";
    const clientName = d.order?.client?.name || d.order?.guestName || "Invite";
    if (clientMap.has(clientId)) {
      clientMap.get(clientId)!.count++;
    } else {
      clientMap.set(clientId, { id: clientId, name: clientName, count: 1 });
    }
  }

  // Unique cooks
  const cookMap = new Map<string, { id: string; name: string; count: number }>();
  for (const d of deliveries) {
    if (d.order?.cook) {
      const cookId = d.order.cook.id;
      if (cookMap.has(cookId)) {
        cookMap.get(cookId)!.count++;
      } else {
        cookMap.set(cookId, { id: cookId, name: d.order.cook.name || "Cuisinier", count: 1 });
      }
    }
  }

  return NextResponse.json({
    driver,
    stats: {
      totalDeliveries: deliveries.length,
      totalRevenue: Math.round(totalRevenue),
      avgRating,
      ratingCount: ratings.length,
    },
    deliveries: deliveries.map((d) => ({
      id: d.id,
      startTime: d.startTime,
      endTime: d.endTime,
      order: d.order,
    })),
    clients: Array.from(clientMap.values()).sort((a, b) => b.count - a.count),
    cooks: Array.from(cookMap.values()).sort((a, b) => b.count - a.count),
  });
}
