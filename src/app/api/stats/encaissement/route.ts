import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const user = session.user as any;
  const role = user.role;
  const userId = user.id;

  if (role !== "ADMIN" && role !== "COOK" && role !== "MANAGER") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  let fromStr = searchParams.get("from");
  let toStr = searchParams.get("to");
  const cookIdParam = searchParams.get("cookId");

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

  let targetCookId: string | null = null;
  if (role === "COOK") {
    targetCookId = userId;
  } else if (role === "ADMIN" && cookIdParam) {
    targetCookId = cookIdParam;
  }

  const cf = targetCookId
    ? Prisma.sql`AND "cookId" = ${targetCookId}`
    : Prisma.sql`AND "cookId" IS NOT NULL`;
  const cfO = targetCookId
    ? Prisma.sql`AND o."cookId" = ${targetCookId}`
    : Prisma.sql`AND o."cookId" IS NOT NULL`;

  try {
    const baseWhere: any = {
      createdAt: { gte: from, lte: to },
      ...(targetCookId ? { cookId: targetCookId } : { cookId: { not: null } }),
    };
    const deliveredWhere = { ...baseWhere, status: "DELIVERED" as const };

    // Batch 1: Simple counts and aggregates (4 queries)
    const [deliveredAgg, allCount, deliveredCount, cancelledCount] = await Promise.all([
      prisma.order.aggregate({
        where: deliveredWhere,
        _sum: { totalAmount: true, discountAmount: true },
        _count: true,
      }),
      prisma.order.count({ where: baseWhere }),
      prisma.order.count({ where: deliveredWhere }),
      prisma.order.count({ where: { ...baseWhere, status: "CANCELLED" } }),
    ]);

    // Batch 2: Payment aggregates (3 queries)
    const [cashAgg, onlineAgg, avgPrepRaw] = await Promise.all([
      prisma.order.aggregate({
        where: { ...deliveredWhere, paymentMethod: "CASH" },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.order.aggregate({
        where: { ...deliveredWhere, paymentMethod: "ONLINE" },
        _sum: { totalAmount: true }, _count: true,
      }),
      prisma.$queryRaw<{ avg_seconds: number }[]>(
        Prisma.sql`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("cookReadyAt" - "cookAcceptedAt"))), 0)::float as avg_seconds
        FROM orders
        WHERE status = 'DELIVERED' AND "cookAcceptedAt" IS NOT NULL AND "cookReadyAt" IS NOT NULL
          AND "createdAt" >= ${from} AND "createdAt" <= ${to} ${cf}`
      ).catch(() => [{ avg_seconds: 0 }]),
    ]);

    // Batch 3: Raw SQL analytics (3 queries)
    const [dailyRaw, topProducts, hourlyRaw] = await Promise.all([
      prisma.$queryRaw<{ day: string; revenue: number; orders: bigint; delivered: bigint }[]>(
        Prisma.sql`SELECT DATE("createdAt") as day,
          COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN "totalAmount" ELSE 0 END), 0)::float as revenue,
          COUNT(*) as orders,
          COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered
        FROM orders
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to} ${cf}
        GROUP BY DATE("createdAt") ORDER BY day`
      ).catch((e) => { console.error("ENCAISSEMENT SQL ERROR:", e.message); return []; }),
      prisma.$queryRaw<{ name: string; quantity: bigint; revenue: number }[]>(
        Prisma.sql`SELECT p.name, SUM(oi.quantity)::bigint as quantity, SUM(oi.price)::float as revenue
        FROM order_items oi
        JOIN products p ON p.id = oi."productId"
        JOIN orders o ON o.id = oi."orderId"
        WHERE o.status = 'DELIVERED' AND o."createdAt" >= ${from} AND o."createdAt" <= ${to} ${cfO}
        GROUP BY p.name ORDER BY revenue DESC`
      ).catch((e) => { console.error("ENCAISSEMENT SQL ERROR:", e.message); return []; }),
      prisma.$queryRaw<{ hour: number; orders: bigint }[]>(
        Prisma.sql`SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::bigint as orders
        FROM orders
        WHERE status = 'DELIVERED' AND "createdAt" >= ${from} AND "createdAt" <= ${to} ${cf}
        GROUP BY EXTRACT(HOUR FROM "createdAt") ORDER BY hour`
      ).catch((e) => { console.error("ENCAISSEMENT SQL ERROR:", e.message); return []; }),
    ]);

    const totalRevenue = Math.round(deliveredAgg._sum.totalAmount || 0);
    const totalDiscount = Math.round(deliveredAgg._sum.discountAmount || 0);
    const avgPrepMin = Math.round((avgPrepRaw[0]?.avg_seconds || 0) / 60);

    const dailyData: any[] = [];
    const d = new Date(from);
    while (d <= to) {
      const dateStr = d.toISOString().slice(0, 10);
      const found = (dailyRaw as any[]).find((r: any) => new Date(r.day).toISOString().slice(0, 10) === dateStr);
      dailyData.push({
        date: dateStr,
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        revenue: found ? Math.round(found.revenue) : 0,
        orders: found ? Number(found.orders) : 0,
        delivered: found ? Number(found.delivered) : 0,
      });
      d.setDate(d.getDate() + 1);
    }

    const result: any = {
      period: { from: fromStr, to: toStr },
      summary: {
        totalOrders: allCount,
        deliveredOrders: deliveredCount,
        cancelledOrders: cancelledCount,
        totalRevenue,
        cashRevenue: Math.round(cashAgg._sum.totalAmount || 0),
        onlineRevenue: Math.round(onlineAgg._sum.totalAmount || 0),
        cashCount: cashAgg._count,
        onlineCount: onlineAgg._count,
        discounts: totalDiscount,
        netRevenue: totalRevenue - totalDiscount,
        averagePrepTime: avgPrepMin,
      },
      dailyData,
      products: (topProducts as any[]).map((p: any) => ({
        name: p.name, quantity: Number(p.quantity), revenue: Math.round(p.revenue),
      })),
      hourlyDistribution: (hourlyRaw as any[]).map((h: any) => ({
        hour: h.hour, orders: Number(h.orders),
      })),
    };

    if (role === "ADMIN" && !cookIdParam) {
      const cooksRaw = await prisma.$queryRaw<any[]>(
        Prisma.sql`SELECT
          u.id as cook_id, u.name as cook_name,
          COUNT(o.id) FILTER (WHERE o."createdAt" >= ${from} AND o."createdAt" <= ${to})::int as total_orders,
          COUNT(o.id) FILTER (WHERE o.status = 'DELIVERED' AND o."createdAt" >= ${from} AND o."createdAt" <= ${to})::int as delivered_orders,
          COALESCE(SUM(o."totalAmount") FILTER (WHERE o.status = 'DELIVERED' AND o."createdAt" >= ${from} AND o."createdAt" <= ${to}), 0)::float as revenue,
          COALESCE(AVG(EXTRACT(EPOCH FROM (o."cookReadyAt" - o."cookAcceptedAt")))
            FILTER (WHERE o."cookAcceptedAt" IS NOT NULL AND o."cookReadyAt" IS NOT NULL
              AND o."createdAt" >= ${from} AND o."createdAt" <= ${to}), 0)::float as avg_prep,
          COUNT(o.id) FILTER (WHERE o.status IN ('ACCEPTED', 'PREPARING'))::int as active_orders
        FROM users u
        LEFT JOIN orders o ON o."cookId" = u.id
        WHERE u.role = 'COOK' AND u."isActive" = true
        GROUP BY u.id, u.name
        ORDER BY revenue DESC`
      );

      result.cooks = cooksRaw.map((c: any) => ({
        id: c.cook_id,
        name: c.cook_name,
        totalOrders: c.total_orders || 0,
        deliveredOrders: c.delivered_orders || 0,
        revenue: Math.round(c.revenue || 0),
        avgPrepTime: Math.round((c.avg_prep || 0) / 60),
        activeOrders: c.active_orders || 0,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur encaissement:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
