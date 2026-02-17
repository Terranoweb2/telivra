import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // Batch 1: Aggregates (6 queries)
  const [todayAgg, weekAgg, monthAgg, allOrders, cashAgg, onlineAgg] = await Promise.all([
    prisma.order.aggregate({ where: { status: "DELIVERED", createdAt: { gte: todayStart } }, _sum: { totalAmount: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "DELIVERED", createdAt: { gte: weekStart } }, _sum: { totalAmount: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "DELIVERED", createdAt: { gte: monthStart } }, _sum: { totalAmount: true }, _count: true }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: "DELIVERED", createdAt: { gte: monthStart }, paymentMethod: "CASH" }, _sum: { totalAmount: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "DELIVERED", createdAt: { gte: monthStart }, paymentMethod: "ONLINE" }, _sum: { totalAmount: true }, _count: true }),
  ]);

  // Batch 2: Counts (6 queries)
  const [pendingCount, activeDeliveries, deliveredToday, preparingCount, readyCount, preparedToday] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.delivery.count({ where: { status: { in: ["PICKING_UP", "DELIVERING"] } } }),
    prisma.delivery.count({ where: { status: "DELIVERED", endTime: { gte: todayStart } } }),
    prisma.order.count({ where: { status: "PREPARING" } }),
    prisma.order.count({ where: { status: "READY" } }),
    prisma.order.count({ where: { status: { in: ["READY", "PICKED_UP", "DELIVERING", "DELIVERED"] }, cookReadyAt: { gte: todayStart } } }),
  ]);
  const pendingCookCount = pendingCount;

  // Batch 3: Period counts + daily SQL (4 queries)
  const [todayOrdersCount, weekOrdersCount, monthOrdersCount, dailyRevenueRaw] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.$queryRaw<{ day: string; revenue: number; count: bigint }[]>`
      SELECT DATE("createdAt") as day,
             COALESCE(SUM("totalAmount"), 0)::float as revenue,
             COUNT(*) as count
      FROM orders
      WHERE status = 'DELIVERED'
        AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY day
    `,
  ]);

  // Remplir les 7 jours (inclure ceux sans commandes)
  const dailyRevenue = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dateStr = dayStart.toISOString().slice(0, 10);
    const found = dailyRevenueRaw.find((r: any) => new Date(r.day).toISOString().slice(0, 10) === dateStr);
    dailyRevenue.push({
      date: dateStr,
      label: dayStart.toLocaleDateString("fr-FR", { weekday: "short" }),
      revenue: found ? found.revenue : 0,
      count: found ? Number(found.count) : 0,
    });
  }

  return NextResponse.json({
    today: { revenue: Math.round(todayAgg._sum.totalAmount || 0), orders: todayOrdersCount },
    week: { revenue: Math.round(weekAgg._sum.totalAmount || 0), orders: weekOrdersCount },
    month: { revenue: Math.round(monthAgg._sum.totalAmount || 0), orders: monthOrdersCount },
    totals: { orders: allOrders, pending: pendingCount, activeDeliveries, deliveredToday },
    dailyRevenue,
    cookStats: {
      pendingCook: pendingCookCount,
      preparing: preparingCount,
      ready: readyCount,
      prepared: preparedToday,
    },
    paymentBreakdown: {
      cash: { revenue: Math.round(cashAgg._sum.totalAmount || 0), count: cashAgg._count },
      online: { revenue: Math.round(onlineAgg._sum.totalAmount || 0), count: onlineAgg._count },
    },
  });
}
