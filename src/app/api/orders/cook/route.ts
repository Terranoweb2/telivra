import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "COOK" && role !== "ADMIN") return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

  const cookId = (session.user as any).id;
  const isAdmin = role === "ADMIN";

  // Update lastSeenAt for online status tracking
  if (role === "COOK") {
    prisma.user.update({ where: { id: cookId }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }

  let where: any;
  if (isAdmin) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where = {
      OR: [
        { status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "DELIVERING"] } },
        { status: { in: ["DELIVERED", "CANCELLED"] }, updatedAt: { gte: sevenDaysAgo } },
      ],
    };
  } else {
    where = {
      OR: [
        { status: "PENDING" },
        { cookId, status: { in: ["ACCEPTED", "PREPARING", "READY"] } },
      ],
    };
  }

  try {
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
      cook: { select: { id: true, name: true } },
      rating: true,
    },
    orderBy: { createdAt: "desc" },
    ...(isAdmin ? { take: 200 } : {}),
  });

  return NextResponse.json(orders);
  } catch (err) {
    console.error("[orders/cook] error:", err);
    return NextResponse.json([], { status: 200 });
  }
});
