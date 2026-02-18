import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateEffectivePrice, findBestPromotion } from "@/lib/pricing";
import { notifyRole } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { items, deliveryAddress, deliveryLat, deliveryLng, note, guestName, guestPhone, paymentMethod, deliveryMode } = body;

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
  if (!guestName || !guestPhone) {
    return NextResponse.json({ error: "Nom et telephone requis" }, { status: 400 });
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
  const ref = String(lastOrder[0]?.next || 1);

  const order = await prisma.order.create({
    data: {
      orderNumber: ref,
      totalAmount: Math.round(totalAmount * 100) / 100,
      discountAmount: Math.round(totalDiscount * 100) / 100,
      promotionId: appliedPromotionId,
      deliveryMode: isPickup ? "PICKUP" : "DELIVERY",
      deliveryAddress: isPickup ? "À emporter" : deliveryAddress,
      deliveryLat: isPickup ? 0 : deliveryLat,
      deliveryLng: isPickup ? 0 : deliveryLng,
      note,
      guestName,
      guestPhone,
      paymentMethod: paymentMethod || "CASH",
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: true } },
    },
  });

  const itemsSummary = order.items.map((i: any) => `${i.quantity}x ${i.product?.name}`).join(", ");

  const io = (global as any).io;
  if (io) {
    io.to("cooks").emit("order:new", {
      id: order.id,
      clientName: guestName,
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
  const msg = `${modeLabel}${guestName} — ${itemsSummary} (${Math.round(order.totalAmount)} XOF)`;
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
