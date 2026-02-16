import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, description, image, discountType, discountValue, startDate, endDate, isActive, appliesToAll, productIds } = body;

  // Mettre à jour les produits liés si fournis
  if (productIds !== undefined) {
    await prisma.promotionProduct.deleteMany({ where: { promotionId: id } });
    if (productIds.length > 0) {
      await prisma.promotionProduct.createMany({
        data: productIds.map((pid: string) => ({ promotionId: id, productId: pid })),
      });
    }
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description || null;
  if (image !== undefined) data.image = image || null;
  if (discountType !== undefined) data.discountType = discountType;
  if (discountValue !== undefined) data.discountValue = parseFloat(discountValue);
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if (endDate !== undefined) data.endDate = new Date(endDate);
  if (isActive !== undefined) data.isActive = isActive;
  if (appliesToAll !== undefined) data.appliesToAll = appliesToAll;

  try {
    const promotion = await prisma.promotion.update({
      where: { id },
      data,
      include: { products: { include: { product: { select: { id: true, name: true, price: true } } } } },
    });
    return NextResponse.json(promotion);
  } catch {
    return NextResponse.json({ error: "Promotion introuvable" }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Promotion introuvable" }, { status: 404 });
  }
}
