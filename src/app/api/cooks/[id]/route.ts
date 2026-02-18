import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;

  const cook = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!cook) return NextResponse.json({ error: "Cuisinier introuvable" }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { cookId: id },
    select: {
      id: true, status: true, totalAmount: true, createdAt: true,
      deliveryMode: true, cookAcceptedAt: true, cookReadyAt: true,
      discountAmount: true, paymentMethod: true,
      items: { select: { quantity: true, price: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const cancelled = orders.filter((o) => o.status === "CANCELLED");
  const inKitchen = orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const ready = orders.filter((o) => o.status === "READY");
  const pickup = delivered.filter((o) => o.deliveryMode === "PICKUP");

  const totalRevenue = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalDiscount = delivered.reduce((s, o) => s + (o.discountAmount || 0), 0);
  const avgOrderValue = delivered.length > 0 ? Math.round(totalRevenue / delivered.length) : 0;

  // Temps moyen de preparation (cookAcceptedAt -> cookReadyAt)
  const prepTimes = delivered
    .filter((o) => o.cookAcceptedAt && o.cookReadyAt)
    .map((o) => new Date(o.cookReadyAt!).getTime() - new Date(o.cookAcceptedAt!).getTime());
  const avgPrepTimeMin = prepTimes.length > 0 ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length / 60000) : 0;

  // Daily data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOrders = delivered.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
  const dailyMap: Record<string, { orders: number; revenue: number }> = {};
  for (const o of recentOrders) {
    const day = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { orders: 0, revenue: 0 };
    dailyMap[day].orders++;
    dailyMap[day].revenue += o.totalAmount || 0;
  }
  const dailyData = [];
  const d = new Date(thirtyDaysAgo);
  const today = new Date();
  while (d <= today) {
    const dateStr = d.toISOString().slice(0, 10);
    const found = dailyMap[dateStr];
    dailyData.push({
      date: dateStr,
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      revenue: found ? Math.round(found.revenue) : 0,
      orders: found ? found.orders : 0,
    });
    d.setDate(d.getDate() + 1);
  }

  // Top products
  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const o of delivered) {
    for (const item of o.items) {
      const name = item.product?.name || "Inconnu";
      if (!productMap[name]) productMap[name] = { name, quantity: 0, revenue: 0 };
      productMap[name].quantity += item.quantity;
      productMap[name].revenue += item.price;
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({ ...p, revenue: Math.round(p.revenue) }));

  return NextResponse.json({
    cook,
    summary: {
      totalOrders: orders.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      inKitchen: inKitchen.length,
      ready: ready.length,
      pickup: pickup.length,
      totalRevenue: Math.round(totalRevenue),
      totalDiscount: Math.round(totalDiscount),
      netRevenue: Math.round(totalRevenue - totalDiscount),
      avgOrderValue,
      avgPrepTimeMin,
    },
    dailyData,
    topProducts,
  });
}
