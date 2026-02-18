import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateEffectivePrice } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  try {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const shop = searchParams.get("shop");
  const mealsOnly = searchParams.get("mealsOnly");
  const extrasOnly = searchParams.get("extrasOnly");

  const deleted = searchParams.get("deleted");
  const where: any = deleted === "true"
    ? { deletedAt: { not: null } }
    : { isAvailable: true, deletedAt: null };
  if (category) where.category = category;
  if (shop) where.shopName = { contains: shop, mode: "insensitive" };
  if (mealsOnly === "true") where.isExtra = false;
  if (extrasOnly === "true") where.isExtra = true;

  const [products, activePromotions] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { shopName: "asc" } }),
    prisma.promotion.findMany({
      where: { isActive: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
      include: { products: true },
    }),
  ]);

  // Notes moyennes en une seule requête SQL agrégée
  const productIds = products.map(p => p.id);
  let ratingsMap = new Map<string, { avg: number; count: number }>();

  if (productIds.length > 0) {
    try {
      const ratingsAgg = await prisma.$queryRaw<
        { productId: string; avg: number; count: bigint }[]
      >`
        SELECT oi."productId",
               AVG(r."mealRating")::float as avg,
               COUNT(r.id) as count
        FROM ratings r
        JOIN orders o ON o.id = r."orderId"
        JOIN order_items oi ON oi."orderId" = o.id
        WHERE oi."productId" = ANY(${productIds})
        GROUP BY oi."productId"
      `;
      ratingsMap = new Map(
        ratingsAgg.map(r => [r.productId, {
          avg: Math.round(r.avg * 10) / 10,
          count: Number(r.count)
        }])
      );
    } catch {
      // Fallback si la requête raw échoue
    }
  }

  const productsWithRatings = products.map((p) => {
    const rating = ratingsMap.get(p.id);
    const effectivePrice = calculateEffectivePrice(p, activePromotions);
    return {
      ...p,
      averageRating: rating?.avg ?? 0,
      ratingCount: rating?.count ?? 0,
      originalPrice: p.price,
      effectivePrice,
      hasDiscount: effectivePrice < p.price,
    };
  });

  return NextResponse.json(productsWithRatings, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
  } catch (err) {
    console.error("Products API error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MANAGER"].includes((session.user as any).role))
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await request.json();
  const { name, description, price, category, shopName, image,
          cookingTimeMin, isExtra, paymentMethod, isAvailable,
          discountPercent, discountAmount } = body;

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
