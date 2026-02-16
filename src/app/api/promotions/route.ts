import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");

  if (all === "true") {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }
    const promotions = await prisma.promotion.findMany({
      include: { products: { include: { product: { select: { id: true, name: true, price: true, image: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(promotions);
  }

  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    include: { products: { include: { product: { select: { id: true, name: true, price: true, image: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(promotions);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await request.json();
  const { name, description, image, discountType, discountValue, startDate, endDate, isActive, appliesToAll, productIds } = body;

  if (!name || !discountType || !discountValue || !startDate || !endDate) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const value = parseFloat(discountValue);
  if (value <= 0) return NextResponse.json({ error: "Valeur de remise invalide" }, { status: 400 });
  if (discountType === "PERCENTAGE" && value > 100) return NextResponse.json({ error: "Pourcentage max 100%" }, { status: 400 });
  if (new Date(endDate) <= new Date(startDate)) return NextResponse.json({ error: "Date fin doit etre apres date debut" }, { status: 400 });

  const promotion = await prisma.promotion.create({
    data: {
      name,
      description: description || null,
      image: image || null,
      discountType,
      discountValue: value,
      startDate: (() => { const d = new Date(startDate); d.setHours(0, 0, 0, 0); return d; })(),
      endDate: (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })(),
      isActive: isActive !== false,
      appliesToAll: appliesToAll === true,
      products: productIds?.length
        ? { create: productIds.map((pid: string) => ({ productId: pid })) }
        : undefined,
    },
    include: { products: { include: { product: { select: { id: true, name: true, price: true, image: true } } } } },
  });

  return NextResponse.json(promotion, { status: 201 });
}
