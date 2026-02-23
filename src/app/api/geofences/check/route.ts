import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isPointInGeofence } from "@/lib/geofence-utils";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { latitude, longitude } = await request.json();
  if (!latitude || !longitude) return NextResponse.json({ error: "Coordonnees requises" }, { status: 400 });

  const geofences = await prisma.geofence.findMany({ where: { isActive: true } });
  const results = geofences.map((g) => ({
    id: g.id,
    name: g.name,
    inside: isPointInGeofence(latitude, longitude, g),
  }));

  return NextResponse.json(results);
});
