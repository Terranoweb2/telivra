import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true, email: true } },
      delivery: {
        include: {
          driver: { select: { id: true, name: true } },
          positions: { orderBy: { timestamp: "asc" } },
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  return NextResponse.json(order);
});

export const PUT = withTenant(async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const order = await prisma.order.update({ where: { id }, data: { status: body.status } });
  return NextResponse.json(order);
});
