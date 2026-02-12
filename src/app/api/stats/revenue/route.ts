import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayOrders, weekOrders, monthOrders, allOrders,
    pendingCount, activeDeliveries, deliveredToday,
    preparingCount, readyCount, pendingCookCount, preparedToday,
    cashOrders, onlineOrders,
  ] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: todayStart } }, select: { totalAmount: true, status: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: weekStart } }, select: { totalAmount: true, status: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: monthStart } }, select: { totalAmount: true, status: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.delivery.count({ where: { status: { in: ["PICKING_UP", "DELIVERING"] } } }),
    prisma.delivery.count({ where: { status: "DELIVERED", endTime: { gte: todayStart } } }),
    // Cook stats
    prisma.order.count({ where: { status: "PREPARING" } }),
    prisma.order.count({ where: { status: "READY" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { in: ["READY", "PICKED_UP", "DELIVERING", "DELIVERED"] }, cookReadyAt: { gte: todayStart } } }),
    // Payment breakdown
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" }, paymentMethod: "CASH" },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" }, paymentMethod: "ONLINE" },
      select: { totalAmount: true },
    }),
  ]);

  // Revenue par jour (7 derniers jours)
  const dailyRevenue = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: dayStart, lt: dayEnd }, status: { not: "CANCELLED" } },
      select: { totalAmount: true },
    });
    dailyRevenue.push({
      date: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString("fr-FR", { weekday: "short" }),
      revenue: orders.reduce((s, o) => s + o.totalAmount, 0),
      count: orders.length,
    });
  }

  const sum = (orders: { totalAmount: number }[]) => Math.round(orders.reduce((s, o) => s + o.totalAmount, 0));

  return NextResponse.json({
    today: { revenue: sum(todayOrders), orders: todayOrders.length },
    week: { revenue: sum(weekOrders), orders: weekOrders.length },
    month: { revenue: sum(monthOrders), orders: monthOrders.length },
    totals: { orders: allOrders, pending: pendingCount, activeDeliveries, deliveredToday },
    dailyRevenue,
    cookStats: {
      pendingCook: pendingCookCount,
      preparing: preparingCount,
      ready: readyCount,
      prepared: preparedToday,
    },
    paymentBreakdown: {
      cash: { revenue: sum(cashOrders), count: cashOrders.length },
      online: { revenue: sum(onlineOrders), count: onlineOrders.length },
    },
  });
}
