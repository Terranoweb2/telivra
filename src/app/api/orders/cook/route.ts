import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "COOK" && role !== "ADMIN") return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

  const cookId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let where: any;
  if (status === "PENDING") {
    where = { status: "PENDING" };
  } else if (status === "PREPARING") {
    where = { cookId, status: { in: ["ACCEPTED", "PREPARING"] } };
  } else if (status === "READY") {
    where = { cookId, status: "READY" };
  } else {
    where = {
      OR: [
        { status: "PENDING" },
        { cookId, status: { in: ["ACCEPTED", "PREPARING", "READY"] } },
      ],
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
