import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  const products = await prisma.product.findMany({ where, orderBy: { shopName: "asc" } });
  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await request.json();
  const { name, description, price, category, shopName, image, cookingTimeMin, isExtra, paymentMethod, isAvailable } = body;

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
    },
  });
  return NextResponse.json(product, { status: 201 });
}
