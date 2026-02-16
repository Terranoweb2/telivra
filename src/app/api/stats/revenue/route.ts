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

  const [
    todayDelivered, weekDelivered, monthDelivered, allOrders,
    pendingCount, activeDeliveries, deliveredToday,
    preparingCount, readyCount, pendingCookCount, preparedToday,
    cashDelivered, onlineDelivered,
  ] = await Promise.all([
    // Recettes = seulement les commandes DELIVERED
    prisma.order.findMany({ where: { status: "DELIVERED", createdAt: { gte: todayStart } }, select: { totalAmount: true } }),
    prisma.order.findMany({ where: { status: "DELIVERED", createdAt: { gte: weekStart } }, select: { totalAmount: true } }),
    prisma.order.findMany({ where: { status: "DELIVERED", createdAt: { gte: monthStart } }, select: { totalAmount: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.delivery.count({ where: { status: { in: ["PICKING_UP", "DELIVERING"] } } }),
    prisma.delivery.count({ where: { status: "DELIVERED", endTime: { gte: todayStart } } }),
    // Cook stats
    prisma.order.count({ where: { status: "PREPARING" } }),
    prisma.order.count({ where: { status: "READY" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: { in: ["READY", "PICKED_UP", "DELIVERING", "DELIVERED"] }, cookReadyAt: { gte: todayStart } } }),
    // Payment breakdown — seulement DELIVERED
    prisma.order.findMany({
      where: { status: "DELIVERED", createdAt: { gte: monthStart }, paymentMethod: "CASH" },
      select: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { status: "DELIVERED", createdAt: { gte: monthStart }, paymentMethod: "ONLINE" },
      select: { totalAmount: true },
    }),
  ]);

  // Nombre total de commandes (livrées) pour chaque période
  const todayOrdersCount = await prisma.order.count({ where: { createdAt: { gte: todayStart } } });
  const weekOrdersCount = await prisma.order.count({ where: { createdAt: { gte: weekStart } } });
  const monthOrdersCount = await prisma.order.count({ where: { createdAt: { gte: monthStart } } });

  // Revenue par jour (7 derniers jours) — seulement DELIVERED
  const dailyRevenue = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: dayStart, lt: dayEnd }, status: "DELIVERED" },
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
    today: { revenue: sum(todayDelivered), orders: todayOrdersCount },
    week: { revenue: sum(weekDelivered), orders: weekOrdersCount },
    month: { revenue: sum(monthDelivered), orders: monthOrdersCount },
    totals: { orders: allOrders, pending: pendingCount, activeDeliveries, deliveredToday },
    dailyRevenue,
    cookStats: {
      pendingCook: pendingCookCount,
      preparing: preparingCount,
      ready: readyCount,
      prepared: preparedToday,
    },
    paymentBreakdown: {
      cash: { revenue: sum(cashDelivered), count: cashDelivered.length },
      online: { revenue: sum(onlineDelivered), count: onlineDelivered.length },
    },
  });
}
