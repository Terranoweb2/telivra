import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const devices = await prisma.device.findMany({
    where: { userId: (session.user as any).id },
    include: {
      vehicle: true,
      person: true,
      asset: true,
      positions: { take: 1, orderBy: { timestamp: "desc" } },
    },
  });

  const devicesWithPosition = devices
    .filter((d) => d.positions.length > 0)
    .map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      status: d.status,
      batteryLevel: d.batteryLevel,
      lastSeen: d.lastSeen,
      vehicle: d.vehicle,
      person: d.person,
      asset: d.asset,
      position: d.positions[0],
    }));

  return NextResponse.json(devicesWithPosition);
}
