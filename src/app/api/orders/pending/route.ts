import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  // Pour les livreurs: retourner les commandes READY (cuisine terminee)
  const orders = await prisma.order.findMany({
    where: { status: "READY", delivery: null },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(orders);
}
