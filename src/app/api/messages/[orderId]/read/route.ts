import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
// Resolve potentially truncated orderId
async function resolveOrderId(rawId: string) {
  let order = await prisma.order.findUnique({
    where: { id: rawId },
    select: { id: true, clientId: true, delivery: { select: { driverId: true } } },
  });
  if (order) return order;
  if (rawId.length < 15) {
    order = await prisma.order.findFirst({
      where: { id: { endsWith: rawId } },
      select: { id: true, clientId: true, delivery: { select: { driverId: true } } },
    });
  }
  return order;
}

export const POST = withTenant(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    const order = await resolveOrderId(orderId);
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    const realOrderId = order.id;

    let senderFilter: string[];

    if (!session?.user) {
      senderFilter = ["DRIVER", "ADMIN", "SYSTEM"];
    } else if (role === "ADMIN" || role === "MANAGER") {
      senderFilter = ["CLIENT", "DRIVER"];
    } else if (userId === order.delivery?.driverId) {
      senderFilter = ["CLIENT", "ADMIN", "SYSTEM"];
    } else if (userId === order.clientId) {
      senderFilter = ["DRIVER", "ADMIN", "SYSTEM"];
    } else {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    await prisma.message.updateMany({
      where: {
        orderId: realOrderId,
        isRead: false,
        sender: { in: senderFilter as any },
      },
      data: { isRead: true },
    });

    const io = (global as any).io;
    if (io) {
      io.to(`chat:${realOrderId}`).emit("chat:read", { orderId: realOrderId, readBy: role || "CLIENT" });
      if (realOrderId !== orderId) {
        io.to(`chat:${orderId}`).emit("chat:read", { orderId, readBy: role || "CLIENT" });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur mark read:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
});
