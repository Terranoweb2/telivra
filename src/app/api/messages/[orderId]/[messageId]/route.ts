import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
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

// PATCH — Edit message content
export const PATCH = withTenant(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; messageId: string }> }
) {
  try {
    const { orderId, messageId } = await params;
    const body = await request.json();
    const newContent = typeof body.content === "string" ? body.content.slice(0, 1000).trim().replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";

    if (!newContent) {
      return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
    }

    const order = await resolveOrderId(orderId);
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.orderId !== order.id) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    // Only the author or admin can edit
    if (!isAdmin) {
      if (message.userId) {
        if (message.userId !== userId) return NextResponse.json({ error: "Non autorise" }, { status: 403 });
      } else {
        // Guest message — only if no clientId on order (same guest)
        if (order.clientId) return NextResponse.json({ error: "Non autorise" }, { status: 403 });
      }
    }

    // Cannot edit file-only or system messages
    if (message.sender === "SYSTEM") {
      return NextResponse.json({ error: "Non modifiable" }, { status: 403 });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: newContent, isEdited: true },
    });

    const io = (global as any).io;
    if (io) {
      io.to(`chat:${order.id}`).emit("chat:message-edited", {
        messageId, content: newContent, orderId: order.id,
      });
      if (order.id !== orderId) {
        io.to(`chat:${orderId}`).emit("chat:message-edited", {
          messageId, content: newContent, orderId: order.id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur edition message:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});

// DELETE — Delete message
export const DELETE = withTenant(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string; messageId: string }> }
) {
  try {
    const { orderId, messageId } = await params;

    const order = await resolveOrderId(orderId);
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.orderId !== order.id) {
      return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
    }

    // Only the author or admin can delete
    if (!isAdmin) {
      if (message.userId) {
        if (message.userId !== userId) return NextResponse.json({ error: "Non autorise" }, { status: 403 });
      } else {
        if (order.clientId) return NextResponse.json({ error: "Non autorise" }, { status: 403 });
      }
    }

    if (message.sender === "SYSTEM") {
      return NextResponse.json({ error: "Non supprimable" }, { status: 403 });
    }

    await prisma.message.delete({ where: { id: messageId } });

    const io = (global as any).io;
    if (io) {
      io.to(`chat:${order.id}`).emit("chat:message-deleted", {
        messageId, orderId: order.id,
      });
      if (order.id !== orderId) {
        io.to(`chat:${orderId}`).emit("chat:message-deleted", {
          messageId, orderId: order.id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur suppression message:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
