import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    // Lookup by deliveryId if byDelivery=true
    if (searchParams.get("byDelivery") === "true") {
      const delivery = await prisma.delivery.findUnique({
        where: { id },
        select: { orderId: true },
      });
      if (!delivery) return NextResponse.json({ error: "Livraison introuvable" }, { status: 404 });
      return NextResponse.json({ orderId: delivery.orderId });
    }

    return NextResponse.json({ error: "Parametre manquant" }, { status: 400 });
  } catch (error) {
    console.error("Erreur deliveries API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
