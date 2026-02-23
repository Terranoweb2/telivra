import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id, userId: (session.user as any).id },
    include: {
      device: { include: { vehicle: true, person: true, asset: true } },
      positions: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!trip) return NextResponse.json({ error: "Trajet non trouvé" }, { status: 404 });
  return NextResponse.json(trip);
});

export const PUT = withTenant(async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data: any = {};
  if (body.status === "COMPLETED") {
    data.status = "COMPLETED";
    data.endTime = new Date();
  }
  if (body.status === "CANCELLED") {
    data.status = "CANCELLED";
    data.endTime = new Date();
  }
  if (body.name !== undefined) data.name = body.name;

  const trip = await prisma.trip.update({
    where: { id, userId: (session.user as any).id },
    data,
    include: { device: true, _count: { select: { positions: true } } },
  });

  return NextResponse.json(trip);
});

export const DELETE = withTenant(async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  await prisma.position.updateMany({ where: { tripId: id }, data: { tripId: null } });
  await prisma.trip.delete({ where: { id, userId: (session.user as any).id } });
  return NextResponse.json({ success: true });
});
