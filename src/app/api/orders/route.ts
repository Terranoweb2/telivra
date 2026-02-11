import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
    // Mode livreur: afficher les commandes assignees a ce livreur
    where = { delivery: { driverId: userId } };
  } else {
    where = { clientId: userId };
  }
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true, email: true } },
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
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const body = await request.json();
  const { items, deliveryAddress, deliveryLat, deliveryLng, note } = body;

  if (!items?.length || !deliveryAddress || !deliveryLat || !deliveryLng) {
    return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
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
      clientId: (session.user as any).id,
      totalAmount: Math.round(totalAmount * 100) / 100,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      note,
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
  });

  const io = (global as any).io;
  if (io) {
    io.to("drivers").emit("order:new", {
      id: order.id,
      clientName: order.client?.name,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      items: order.items,
    });
  }

  return NextResponse.json(order, { status: 201 });
}
