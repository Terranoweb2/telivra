import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MANAGER"].includes((session.user as any).role))
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  let fromStr = searchParams.get("from");
  let toStr = searchParams.get("to");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    fromStr = todayStart.toISOString().slice(0, 10);
    toStr = todayStart.toISOString().slice(0, 10);
  } else if (period === "week") {
    const ws = new Date(todayStart);
    ws.setDate(ws.getDate() - ws.getDay() + 1);
    fromStr = ws.toISOString().slice(0, 10);
    toStr = todayStart.toISOString().slice(0, 10);
  } else if (period === "month") {
    fromStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    toStr = todayStart.toISOString().slice(0, 10);
  } else if (period === "year") {
    fromStr = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    toStr = todayStart.toISOString().slice(0, 10);
  }

  if (!fromStr || !toStr) {
    fromStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    toStr = todayStart.toISOString().slice(0, 10);
  }

  const from = new Date(fromStr + "T00:00:00.000Z");
  const to = new Date(toStr + "T23:59:59.999Z");

  try {
    const [
      deliveredAgg, allOrdersCount, deliveredCount, cancelledCount,
      discountAgg, cashAgg, onlineAgg,
      dailyRaw, topProductsRaw, statusCounts,
      pickupCount, pickupDeliveredCount,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: "DELIVERED", createdAt: { gte: from, lte: to } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.order.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.order.count({ where: { status: "DELIVERED", createdAt: { gte: from, lte: to } } }),
      prisma.order.count({ where: { status: "CANCELLED", createdAt: { gte: from, lte: to } } }),
      prisma.order.aggregate({
        where: { status: "DELIVERED", createdAt: { gte: from, lte: to } },
        _sum: { discountAmount: true },
      }),
      prisma.order.aggregate({
        where: { status: "DELIVERED", createdAt: { gte: from, lte: to }, paymentMethod: "CASH" },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { status: "DELIVERED", createdAt: { gte: from, lte: to }, paymentMethod: "ONLINE" },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.$queryRaw<{ day: string; revenue: number; orders: bigint; delivered: bigint; cancelled: bigint }[]>`
        SELECT DATE("createdAt") as day,
               COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN "totalAmount" ELSE 0 END), 0)::float as revenue,
               COUNT(*) as orders,
               COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered,
               COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled
        FROM orders
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        GROUP BY DATE("createdAt")
        ORDER BY day
      `,
      prisma.$queryRaw<{ name: string; quantity: bigint; revenue: number }[]>`
        SELECT p.name, SUM(oi.quantity)::bigint as quantity,
               SUM(oi.price)::float as revenue
        FROM order_items oi
        JOIN products p ON p.id = oi."productId"
        JOIN orders o ON o.id = oi."orderId"
        WHERE o.status = 'DELIVERED' AND o."createdAt" >= ${from} AND o."createdAt" <= ${to}
        GROUP BY p.name
        ORDER BY revenue DESC
        LIMIT 10
      `,
      prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT status, COUNT(*) as count
        FROM orders
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        GROUP BY status
      `,
      prisma.order.count({ where: { deliveryMode: "PICKUP", createdAt: { gte: from, lte: to } } }),
      prisma.order.count({ where: { status: "DELIVERED", deliveryMode: "PICKUP", createdAt: { gte: from, lte: to } } }),
    ]);

    const totalRevenue = Math.round(deliveredAgg._sum.totalAmount || 0);
    const totalDiscounts = Math.round(discountAgg._sum.discountAmount || 0);
    const avgOrderValue = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0;

    // Remplir les jours manquants
    const dailyData = [];
    const d = new Date(from);
    while (d <= to) {
      const dateStr = d.toISOString().slice(0, 10);
      const found = dailyRaw.find((r: any) => new Date(r.day).toISOString().slice(0, 10) === dateStr);
      dailyData.push({
        date: dateStr,
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        revenue: found ? Math.round(found.revenue) : 0,
        orders: found ? Number(found.orders) : 0,
        delivered: found ? Number(found.delivered) : 0,
        cancelled: found ? Number(found.cancelled) : 0,
      });
      d.setDate(d.getDate() + 1);
    }

    const ordersByStatus: Record<string, number> = {};
    for (const s of statusCounts) {
      ordersByStatus[s.status] = Number(s.count);
    }

    return NextResponse.json({
      period: { from: fromStr, to: toStr },
      summary: {
        totalRevenue,
        totalOrders: allOrdersCount,
        deliveredOrders: deliveredCount,
        cancelledOrders: cancelledCount,
        pickupOrders: pickupCount,
        pickupDelivered: pickupDeliveredCount,
        averageOrderValue: avgOrderValue,
        discounts: totalDiscounts,
        netRevenue: totalRevenue - totalDiscounts,
      },
      deliveryModeBreakdown: {
        pickup: pickupCount,
        delivery: allOrdersCount - pickupCount,
      },
      paymentBreakdown: {
        cash: { revenue: Math.round(cashAgg._sum.totalAmount || 0), count: cashAgg._count },
        online: { revenue: Math.round(onlineAgg._sum.totalAmount || 0), count: onlineAgg._count },
      },
      dailyData,
      topProducts: topProductsRaw.map((p: any) => ({
        name: p.name,
        quantity: Number(p.quantity),
        revenue: Math.round(p.revenue),
      })),
      ordersByStatus,
    });
  } catch (error) {
    console.error("Erreur stats detailed:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
