import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { driverRating, mealRating, driverComment, mealComment, guestPhone } = body;

    // Validation des notes
    if (!driverRating || !mealRating) {
      return NextResponse.json({ error: "Les deux notes sont requises" }, { status: 400 });
    }
    const dr = Math.round(Number(driverRating));
    const mr = Math.round(Number(mealRating));
    if (dr < 1 || dr > 5 || mr < 1 || mr > 5) {
      return NextResponse.json({ error: "Les notes doivent être entre 1 et 5" }, { status: 400 });
    }

    // Verifier que la commande existe et est livree
    const order = await prisma.order.findUnique({
      where: { id },
      include: { rating: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.status !== "DELIVERED") {
      return NextResponse.json({ error: "La commande n'est pas encore livree" }, { status: 400 });
    }
    if (order.rating) {
      return NextResponse.json({ error: "Cette commande a déjà été notée" }, { status: 409 });
    }

    // Autorisation : client authentifie ou guest avec bon telephone
    const session = await auth();
    const userId = (session?.user as any)?.id;

    if (order.clientId) {
      // Commande client authentifie
      if (!userId || userId !== order.clientId) {
        return NextResponse.json({ error: "Non autorise" }, { status: 403 });
      }
    } else if (order.guestPhone) {
      // Commande guest : verifier le telephone
      if (!guestPhone || guestPhone !== order.guestPhone) {
        return NextResponse.json({ error: "Téléphone incorrect" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Impossible de vérifier l'identité" }, { status: 403 });
    }

    // Sanitiser les commentaires
    const safeDriverComment = driverComment ? String(driverComment).slice(0, 500).trim() : null;
    const safeMealComment = mealComment ? String(mealComment).slice(0, 500).trim() : null;

    const rating = await prisma.rating.create({
      data: {
        orderId: id,
        driverRating: dr,
        mealRating: mr,
        driverComment: safeDriverComment || null,
        mealComment: safeMealComment || null,
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    console.error("Erreur notation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
