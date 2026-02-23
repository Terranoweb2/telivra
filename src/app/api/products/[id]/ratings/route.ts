import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Trouver toutes les notes des commandes contenant ce produit
    const ratings = await prisma.rating.findMany({
      where: {
        order: {
          items: { some: { productId: id } },
        },
      },
      select: {
        mealRating: true,
        mealComment: true,
        createdAt: true,
        order: {
          select: {
            guestName: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const count = ratings.length;
    const averageRating = count > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.mealRating, 0) / count) * 10) / 10
      : 0;

    return NextResponse.json({ averageRating, count, ratings });
  } catch {
    return NextResponse.json({ averageRating: 0, count: 0, ratings: [] });
  }
});
