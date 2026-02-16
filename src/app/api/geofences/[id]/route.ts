import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const geofence = await prisma.geofence.findUnique({ where: { id }, include: { alerts: { take: 20, orderBy: { createdAt: "desc" } } } });
  if (!geofence) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(geofence);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const geofence = await prisma.geofence.update({ where: { id }, data: body });
  return NextResponse.json(geofence);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  await prisma.geofence.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
