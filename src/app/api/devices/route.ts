import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createDeviceSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const where: any = { userId: (session.user as any).id };
  if (type) where.type = type;
  if (status) where.status = status;

  const devices = await prisma.device.findMany({
    where,
    include: { vehicle: true, person: true, asset: true, positions: { take: 1, orderBy: { timestamp: "desc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(devices);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const body = await request.json();
  const parsed = createDeviceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, serialNumber, type, vehicle, person, asset } = parsed.data;

  const device = await prisma.device.create({
    data: {
      name,
      serialNumber,
      type,
      userId: (session.user as any).id,
      ...(type === "VEHICLE" && vehicle ? { vehicle: { create: vehicle } } : {}),
      ...(type === "PERSON" && person ? { person: { create: person } } : {}),
      ...(type === "ASSET" && asset ? { asset: { create: asset } } : {}),
    },
    include: { vehicle: true, person: true, asset: true },
  });

  return NextResponse.json(device, { status: 201 });
}
