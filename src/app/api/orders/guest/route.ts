import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateEffectivePrice, findBestPromotion } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { items, deliveryAddress, deliveryLat, deliveryLng, note, guestName, guestPhone, paymentMethod } = body;

  if (!items?.length || !deliveryAddress || !deliveryLat || !deliveryLng) {
    return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
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

  const ref = "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const order = await prisma.order.create({
    data: {
      orderNumber: ref,
      totalAmount: Math.round(totalAmount * 100) / 100,
      discountAmount: Math.round(totalDiscount * 100) / 100,
      promotionId: appliedPromotionId,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
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
    });
  }

  return NextResponse.json(order, { status: 201 });
}
