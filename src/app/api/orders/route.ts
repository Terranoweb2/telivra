import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateEffectivePrice, findBestPromotion } from "@/lib/pricing";
import { notifyRole } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const asDriver = searchParams.get("as") === "driver";

  // Update lastSeenAt for online status tracking (drivers)
  if (asDriver || role === "DRIVER") {
    prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }

  let where: any = {};
  if (role === "ADMIN") {
    // Admin sees ALL orders
    where = {};
  } else if (asDriver || role === "DRIVER") {
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
  const { items, deliveryAddress, deliveryLat, deliveryLng, note, paymentMethod, deliveryMode } = body;

  const isPickup = deliveryMode === "PICKUP";
  if (!items?.length) {
    return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
  }
  if (!isPickup && (!deliveryAddress || !deliveryLat || !deliveryLng)) {
    return NextResponse.json({ error: "Adresse de livraison requise" }, { status: 400 });
  }
  if (isPickup) {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    if (!settings?.pickupEnabled) {
      return NextResponse.json({ error: "Mode a emporter non disponible" }, { status: 400 });
    }
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
      deliveryMode: isPickup ? "PICKUP" : "DELIVERY",
      deliveryAddress: isPickup ? "À emporter" : deliveryAddress,
      deliveryLat: isPickup ? 0 : deliveryLat,
      deliveryLng: isPickup ? 0 : deliveryLng,
      note,
      paymentMethod: paymentMethod || "CASH",
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
  });

  const clientName = order.client?.name || "Client";
  const itemsSummary = order.items.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(", ");

  const io = (global as any).io;
  if (io) io.to("admins").emit("staff:refresh");
  if (io) {
    io.to("cooks").emit("order:new", {
      id: order.id,
      clientName,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      items: order.items,
      createdAt: order.createdAt,
      status: "PENDING",
      deliveryMode: isPickup ? "PICKUP" : "DELIVERY",
    });
  }

  // Notifier cuisiniers + admins
  const modeLabel = isPickup ? "[À emporter] " : "";
  const msg = `${modeLabel}${clientName} — ${itemsSummary} (${Math.round(order.totalAmount)} XOF)`;
  const firstImage = order.items?.[0]?.product?.image || null;
    notifyRole("COOK", {
    type: "ORDER_NOTIFICATION",
    title: "Nouvelle commande",
    message: msg,
    severity: "WARNING",
    data: { orderId: order.id },
    pushPayload: { title: "Nouvelle commande", body: msg, url: "/cuisine", tag: `order-${order.id}` },
  });
  notifyRole("ADMIN", {
    type: "ORDER_NOTIFICATION",
    title: "Nouvelle commande",
    message: msg,
    severity: "INFO",
    data: { orderId: order.id },
    pushPayload: { title: "Nouvelle commande", body: msg, url: "/alerts", tag: `order-${order.id}` },
  });

  return NextResponse.json(order, { status: 201 });
}
