import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const geofences = await prisma.geofence.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { alerts: true } } },
  });
  return NextResponse.json(geofences);
});

export const POST = withTenant(async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await request.json();
  const { name, description, type, centerLat, centerLng, radiusMeters, coordinates, color } = body;

  if (!name || !type) return NextResponse.json({ error: "Nom et type requis" }, { status: 400 });

  const geofence = await prisma.geofence.create({
    data: {
      name,
      description: description || null,
      type,
      centerLat: centerLat ?? null,
      centerLng: centerLng ?? null,
      radiusMeters: radiusMeters ?? null,
      coordinates: coordinates ?? null,
      color: color || "#3B82F6",
    },
  });

  return NextResponse.json(geofence, { status: 201 });
});
