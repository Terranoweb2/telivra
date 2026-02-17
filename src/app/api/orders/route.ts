import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateEffectivePrice, findBestPromotion } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const asDriver = searchParams.get("as") === "driver";

  let where: any = {};
  if (asDriver || role === "DRIVER") {
    where = { delivery: { driverId: userId } };
  } else {
    where = { clientId: userId };
  }
  if (status) where.status = status;

  try {
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        client: { select: { id: true, name: true, email: true } },
        rating: true,
        promotion: { select: { name: true } },
        delivery: {
          include: {
            driver: { select: { id: true, name: true } },
            positions: { orderBy: { timestamp: "desc" }, take: 20 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (err) {
    console.error("[orders] GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const body = await request.json();
  const { items, deliveryAddress, deliveryLat, deliveryLng, note, paymentMethod } = body;

  if (!items?.length || !deliveryAddress || !deliveryLat || !deliveryLng) {
    return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
  }

  const productIds = items.map((i: any) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Charger les promotions actives
  const now = new Date();
  const activePromotions = await prisma.promotion.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    include: { products: true },
  });

  let totalAmount = 0;
  let totalDiscount = 0;
  let appliedPromotionId: string | null = null;

  const orderItems = items.map((i: any) => {
    const product = productMap.get(i.productId);
    if (!product) throw new Error("Produit introuvable");

    const effectivePrice = calculateEffectivePrice(product, activePromotions);
    const originalTotal = product.price * i.quantity;
    const discountedTotal = effectivePrice * i.quantity;

    totalAmount += discountedTotal;
    totalDiscount += originalTotal - discountedTotal;

    if (!appliedPromotionId) {
      const bestPromo = findBestPromotion(product, activePromotions);
      if (bestPromo) appliedPromotionId = bestPromo.id;
    }

    return { productId: i.productId, quantity: i.quantity, price: discountedTotal };
  });

  // Generate sequential numeric orderNumber
  const lastOrder = await prisma.$queryRaw<{ next: number }[]>`
    SELECT COALESCE(MAX(CAST("orderNumber" AS INTEGER)), 0) + 1 as next
    FROM orders WHERE "orderNumber" ~ '^[0-9]+$'
  `;
  const orderNumber = String(lastOrder[0]?.next || 1);

  const order = await prisma.order.create({
    data: {
      clientId: (session.user as any).id,
      orderNumber,
      totalAmount: Math.round(totalAmount * 100) / 100,
      discountAmount: Math.round(totalDiscount * 100) / 100,
      promotionId: appliedPromotionId,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      note,
      paymentMethod: paymentMethod || "CASH",
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
  });

  const io = (global as any).io;
  if (io) {
    io.to("cooks").emit("order:new", {
      id: order.id,
      clientName: order.client?.name,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      items: order.items,
      createdAt: order.createdAt,
      status: "PENDING",
    });
  }

  return NextResponse.json(order, { status: 201 });
}
