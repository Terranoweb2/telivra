import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json(null, { status: 401 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "DRIVER") return NextResponse.json(null);

  const delivery = await prisma.delivery.findFirst({
    where: {
      driverId: userId,
      status: { notIn: ["DELIVERED", "CANCELLED"] },
    },
    orderBy: { startTime: "desc" },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          guestName: true,
          guestPhone: true,
          client: { select: { name: true, phone: true } },
        },
      },
    },
  });

  return NextResponse.json(delivery);
}
