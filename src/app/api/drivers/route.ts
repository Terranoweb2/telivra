import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN")
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const drivers = await prisma.user.findMany({
      where: { role: "DRIVER" },
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        _count: {
          select: { driverDeliveries: true },
        },
        driverDeliveries: {
          select: { id: true, status: true, order: { select: { totalAmount: true, rating: { select: { driverRating: true } } } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = drivers.map((d) => {
      const deliveries = d.driverDeliveries;
      const active = deliveries.filter((dl) => ["PICKING_UP", "DELIVERING"].includes(dl.status)).length;
      const completed = deliveries.filter((dl) => dl.status === "DELIVERED").length;
      const totalRevenue = deliveries
        .filter((dl) => dl.status === "DELIVERED")
        .reduce((s, dl) => s + (dl.order?.totalAmount || 0), 0);
      const ratings = deliveries
        .filter((dl) => dl.order?.rating?.driverRating && dl.order.rating.driverRating > 0)
        .map((dl) => dl.order!.rating!.driverRating);
      const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : null;
      return {
        id: d.id, name: d.name, email: d.email, isActive: d.isActive, createdAt: d.createdAt,
        stats: { active, completed, totalRevenue: Math.round(totalRevenue), avgRating, ratingCount: ratings.length },
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[drivers] GET error:", e.message);
    return NextResponse.json([], { status: 200 });
  }
}
