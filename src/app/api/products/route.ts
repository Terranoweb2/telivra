import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateEffectivePrice } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const shop = searchParams.get("shop");
  const mealsOnly = searchParams.get("mealsOnly");
  const extrasOnly = searchParams.get("extrasOnly");

  const where: any = { isAvailable: true };
  if (category) where.category = category;
  if (shop) where.shopName = { contains: shop, mode: "insensitive" };
  if (mealsOnly === "true") where.isExtra = false;
  if (extrasOnly === "true") where.isExtra = true;

  const products = await prisma.product.findMany({
    where,
    orderBy: { shopName: "asc" },
    include: {
      orderItems: {
        include: {
          order: {
            include: { rating: { select: { mealRating: true } } },
          },
        },
      },
    },
  });

  // Charger les promotions actives
  const now = new Date();
  const activePromotions = await prisma.promotion.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    include: { products: true },
  });

  // Calculer note moyenne + prix effectif
  const productsWithRatings = products.map((p) => {
    const ratings = p.orderItems
      .map((oi) => oi.order?.rating?.mealRating)
      .filter((r): r is number => r != null);
    const ratingCount = ratings.length;
    const averageRating = ratingCount > 0
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratingCount) * 10) / 10
      : 0;

    const effectivePrice = calculateEffectivePrice(p, activePromotions);
    const { orderItems, ...product } = p;

    return {
      ...product,
      averageRating,
      ratingCount,
      originalPrice: p.price,
      effectivePrice,
      hasDiscount: effectivePrice < p.price,
    };
  });

  return NextResponse.json(productsWithRatings);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await request.json();
  const { name, description, price, category, shopName, image, cookingTimeMin, isExtra, paymentMethod, isAvailable, discountPercent, discountAmount } = body;

  const product = await prisma.product.create({
    data: {
      name,
      description: description || "",
      price: typeof price === "number" ? price : parseFloat(price) || 0,
      category: category || "RESTAURANT",
      shopName: shopName || "",
      image: image || null,
      cookingTimeMin: typeof cookingTimeMin === "number" ? cookingTimeMin : parseInt(cookingTimeMin) || 15,
      isExtra: isExtra === true,
      paymentMethod: paymentMethod || "BOTH",
      isAvailable: isAvailable !== false,
      discountPercent: discountPercent ? parseFloat(discountPercent) : null,
      discountAmount: discountAmount ? parseFloat(discountAmount) : null,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
