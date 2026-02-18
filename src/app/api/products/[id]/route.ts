import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ALLOWED_FIELDS = [
  "name", "description", "price", "category", "shopName",
  "image", "isAvailable", "cookingTimeMin", "isExtra", "paymentMethod",
  "discountPercent", "discountAmount", "deletedAt",
];

const VALID_CATEGORIES = ["RESTAURANT", "GROCERY", "PHARMACY", "ELECTRONICS", "OTHER"];
const VALID_PAYMENT_METHODS = ["CASH", "ONLINE", "BOTH"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MANAGER"].includes((session.user as any).role))
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Filtrer uniquement les champs autorisés
  const data: any = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      data[key] = body[key];
    }
  }

  // Valider les types
  if (data.price !== undefined) {
    data.price = typeof data.price === "number" ? data.price : parseFloat(data.price) || 0;
  }
  if (data.cookingTimeMin !== undefined) {
    data.cookingTimeMin = typeof data.cookingTimeMin === "number" ? data.cookingTimeMin : parseInt(data.cookingTimeMin) || 15;
  }
  if (data.isExtra !== undefined) {
    data.isExtra = data.isExtra === true;
  }
  if (data.isAvailable !== undefined) {
    data.isAvailable = data.isAvailable !== false;
  }
  if (data.discountPercent !== undefined) {
    data.discountPercent = data.discountPercent ? parseFloat(data.discountPercent) : null;
    if (data.discountPercent !== null && (data.discountPercent < 0 || data.discountPercent > 100)) {
      return NextResponse.json({ error: "Pourcentage invalide (0-100)" }, { status: 400 });
    }
  }
  if (data.deletedAt !== undefined) {
    data.deletedAt = data.deletedAt === null ? null : new Date(data.deletedAt);
  }
  if (data.discountAmount !== undefined) {
    data.discountAmount = data.discountAmount ? parseFloat(data.discountAmount) : null;
    if (data.discountAmount !== null && data.discountAmount < 0) {
      return NextResponse.json({ error: "Montant remise invalide" }, { status: 400 });
    }
  }
  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }
  if (data.paymentMethod && !VALID_PAYMENT_METHODS.includes(data.paymentMethod)) {
    return NextResponse.json({ error: "Méthode de paiement invalide" }, { status: 400 });
  }

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MANAGER"].includes((session.user as any).role))
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.product.update({
      where: { id },
      data: { isAvailable: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
