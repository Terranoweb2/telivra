import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  const status = searchParams.get("status");

  const where: any = { userId: (session.user as any).id };
  if (deviceId) where.deviceId = deviceId;
  if (status) where.status = status;

  const trips = await prisma.trip.findMany({
    where,
    include: {
      device: { include: { vehicle: true, person: true, asset: true } },
      _count: { select: { positions: true } },
    },
    orderBy: { startTime: "desc" },
    take: 50,
  });

  return NextResponse.json(trips);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await request.json();
  const { deviceId, name } = body;

  if (!deviceId) return NextResponse.json({ error: "deviceId requis" }, { status: 400 });

  // Verifier qu'il n'y a pas de trip en cours
  const existing = await prisma.trip.findFirst({
    where: { deviceId, status: "IN_PROGRESS" },
  });
  if (existing) return NextResponse.json({ error: "Un trajet est déjà en cours" }, { status: 409 });

  const trip = await prisma.trip.create({
    data: {
      name: name || null,
      deviceId,
      userId: (session.user as any).id,
    },
    include: { device: true },
  });

  return NextResponse.json(trip, { status: 201 });
}
