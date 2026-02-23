import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    const role = (session.user as any).role;
    if (role !== "COOK" && role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (order.deliveryMode !== "PICKUP") {
      return NextResponse.json({ error: "Pas une commande a emporter" }, { status: 400 });
    }
    if (order.status !== "READY") {
      return NextResponse.json({ error: "Commande pas encore prête" }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: "DELIVERED" },
      include: {
        items: { include: { product: true } },
        client: { select: { id: true, name: true } },
      },
    });

    const io = (global as any).io;
  if (io) { io.to("admins").emit("staff:refresh"); io.to("cooks").emit("staff:refresh"); }
    if (io) {
      const eventData = { orderId: id, status: "DELIVERED", deliveryMode: "PICKUP" };
      io.to("order:" + id).emit("order:delivered", eventData);
      io.to("cooks").emit("order:delivered", eventData);
      if (order.clientId) {
        io.to("client:" + order.clientId).emit("order:delivered", eventData);
      }
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("[pickup-delivered] error:", e.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
