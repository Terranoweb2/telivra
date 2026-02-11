import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateDeviceSchema } from "@/lib/validators";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  const device = await prisma.device.findUnique({
    where: { id, userId: (session.user as any).id },
    include: {
      vehicle: true,
      person: true,
      asset: true,
      positions: { take: 50, orderBy: { timestamp: "desc" } },
    },
  });

  if (!device) return NextResponse.json({ error: "Appareil non trouve" }, { status: 404 });
  return NextResponse.json(device);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateDeviceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const device = await prisma.device.update({
    where: { id, userId: (session.user as any).id },
    data: parsed.data,
    include: { vehicle: true, person: true, asset: true },
  });

  return NextResponse.json(device);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id } = await params;
  await prisma.device.delete({ where: { id, userId: (session.user as any).id } });
  return NextResponse.json({ success: true });
}
