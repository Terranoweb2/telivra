import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { clientId: true, delivery: { select: { driverId: true } } },
    });

    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

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
        orderId,
        isRead: false,
        sender: { in: senderFilter as any },
      },
      data: { isRead: true },
    });

    const io = (global as any).io;
    if (io) {
      io.to(`chat:${orderId}`).emit("chat:read", { orderId, readBy: role || "CLIENT" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur mark read:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
