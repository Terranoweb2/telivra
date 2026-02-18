import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyRole } from "@/lib/notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { driverRating, mealRating, driverComment, mealComment } = body;

    if (!mealRating) {
      return NextResponse.json({ error: "La note du repas est requise" }, { status: 400 });
    }
    const mr = Math.round(Number(mealRating));
    if (mr < 1 || mr > 5) {
      return NextResponse.json({ error: "Les notes doivent être entre 1 et 5" }, { status: 400 });
    }
    const dr = driverRating ? Math.round(Number(driverRating)) : 0;
    if (dr !== 0 && (dr < 1 || dr > 5)) {
      return NextResponse.json({ error: "Les notes doivent être entre 1 et 5" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { rating: true, client: { select: { name: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    if (order.status !== "DELIVERED") {
      return NextResponse.json({ error: "La commande n'est pas encore livrée" }, { status: 400 });
    }
    if (order.rating) {
      return NextResponse.json({ error: "Cette commande a déjà été notée" }, { status: 409 });
    }

    const safeDriverComment = driverComment ? String(driverComment).slice(0, 500).trim() : null;
    const safeMealComment = mealComment ? String(mealComment).slice(0, 500).trim() : null;

    const rating = await prisma.rating.create({
      data: {
        orderId: id,
        driverRating: dr || mr,
        mealRating: mr,
        driverComment: safeDriverComment || null,
        mealComment: safeMealComment || null,
      },
    });

    const clientName = order.client?.name || (order as any).guestName || "Client";
    const avgRating = dr > 0 ? ((dr + mr) / 2).toFixed(1) : mr.toFixed(1);
    notifyRole("ADMIN", {
      type: "RATING",
      title: "Nouvelle note",
      message: `${avgRating}/5 par ${clientName}`,
      severity: "INFO",
      data: { orderId: id, driverRating: dr, mealRating: mr, clientName },
      pushPayload: {
        title: "Nouvelle note",
        body: `${avgRating}/5 par ${clientName}`,
        url: "/alerts",
        tag: `rating-${id}`,
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    console.error("Erreur notation:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
