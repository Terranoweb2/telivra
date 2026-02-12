import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  let totalAmount = 0;
  const orderItems = items.map((i: any) => {
    const product = productMap.get(i.productId);
    if (!product) throw new Error("Produit introuvable");
    const price = product.price * i.quantity;
    totalAmount += price;
    return { productId: i.productId, quantity: i.quantity, price };
  });

  const order = await prisma.order.create({
    data: {
      totalAmount: Math.round(totalAmount * 100) / 100,
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

  // Notifier les cuisiniers (pas les livreurs)
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
