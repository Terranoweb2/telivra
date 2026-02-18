import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "COOK" && role !== "ADMIN") return NextResponse.json({ error: "Acces refuse" }, { status: 403 });

  const { id } = await params;
  const cookId = (session.user as any).id;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (order.status !== "PENDING") return NextResponse.json({ error: "Commande déjà prise en charge" }, { status: 400 });

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "PREPARING",
      cookId,
      cookAcceptedAt: new Date(),
    },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, name: true } },
    },
  });

  const io = (global as any).io;
  if (io) io.to("admins").emit("staff:refresh");
  if (io) {
    const maxCookTime = Math.max(...updated.items.map((i) => i.product.cookingTimeMin ?? 15));
    const eventData = {
      orderId: id,
      cookName: (session.user as any).name,
      cookAcceptedAt: updated.cookAcceptedAt?.toISOString(),
      cookingTimeMin: maxCookTime,
      status: "PREPARING",
    };
    io.to(`order:${id}`).emit("order:cook-accepted", eventData);
    if (updated.clientId) {
      io.to(`client:${updated.clientId}`).emit("order:cook-accepted", eventData);
    }
  }

  return NextResponse.json(updated);
}
