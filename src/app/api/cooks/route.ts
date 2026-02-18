import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const cooks = await prisma.user.findMany({
    where: { role: "COOK" },
    select: {
      id: true, name: true, email: true, isActive: true, createdAt: true,
      cookOrders: {
        select: { id: true, status: true, cookAcceptedAt: true, cookReadyAt: true, totalAmount: true, deliveryMode: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
    orderBy: { name: "asc" },
  });

  const result = cooks.map((c) => {
    const orders = c.cookOrders;
    const inKitchen = orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status)).length;
    const ready = orders.filter((o) => o.status === "READY").length;
    const delivered = orders.filter((o) => o.status === "DELIVERED").length;
    const totalRevenue = orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pickup = orders.filter((o) => o.deliveryMode === "PICKUP" && o.status === "DELIVERED").length;
    return {
      id: c.id, name: c.name, email: c.email, isActive: c.isActive, createdAt: c.createdAt,
      stats: { inKitchen, ready, delivered, pickup, totalRevenue: Math.round(totalRevenue) },
    };
  });

  return NextResponse.json(result);
}
