import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      _count: { select: { clientOrders: true, driverDeliveries: true, cookOrders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { id, role, isActive } = await request.json();
  const user = await prisma.user.update({
    where: { id },
    data: { ...(role && { role }), ...(typeof isActive === "boolean" && { isActive }) },
  });
  return NextResponse.json(user);
}
