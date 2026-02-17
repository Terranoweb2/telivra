import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
// Resolve potentially truncated orderId (from old navigate URLs)
async function resolveOrderId(rawId: string) {
  // Try exact match first
  let order = await prisma.order.findUnique({
    where: { id: rawId },
    select: {
      id: true, status: true, clientId: true, guestPhone: true, guestName: true,
      delivery: { select: { driverId: true } },
    },
  });
  if (order) return order;

  // Fallback: try matching by end of ID (truncated IDs from old URLs)
  if (rawId.length < 15) {
    order = await prisma.order.findFirst({
      where: { id: { endsWith: rawId } },
      select: {
        id: true, status: true, clientId: true, guestPhone: true, guestName: true,
        delivery: { select: { driverId: true } },
      },
    });
  }
  return order;
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const order = await resolveOrderId(orderId);
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    const realOrderId = order.id;

    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;
    const isAdmin = role === "ADMIN" || role === "MANAGER";
    const isOrderClient = userId && userId === order.clientId;
    const isOrderDriver = userId && userId === order.delivery?.driverId;
    const isGuest = !session?.user && !order.clientId;

    if (!isAdmin && !isOrderClient && !isOrderDriver && !isGuest) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    // Determine current user's sender type (for unread count)
    let yourSenderType: string = "CLIENT";
    if (isGuest) yourSenderType = "CLIENT";
    else if (isAdmin) yourSenderType = "ADMIN";
    else if (isOrderDriver) yourSenderType = "DRIVER";
    else if (isOrderClient) yourSenderType = "CLIENT";

    const where: any = { orderId: realOrderId };
    if (cursor) where.createdAt = { lt: new Date(cursor) };

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, role: true } },
        replyTo: { select: { id: true, content: true, sender: true, guestName: true, fileUrl: true, user: { select: { name: true } } } },
      },
    });

    // Count unread messages from others (only on initial load)
    let unreadCount: number | undefined;
    if (!cursor) {
      unreadCount = await prisma.message.count({
        where: {
          orderId: realOrderId,
          isRead: false,
          sender: { not: yourSenderType as any },
        },
      });
    }

    return NextResponse.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
      resolvedOrderId: realOrderId !== orderId ? realOrderId : undefined,
      ...(unreadCount !== undefined && { unreadCount }),
      yourSenderType,
      chatEnabled: (await prisma.siteSettings.findUnique({ where: { id: "default" }, select: { chatEnabled: true } }))?.chatEnabled ?? true,
    });
  } catch (error) {
    console.error("Erreur lecture messages:", error);
    return NextResponse.json({ messages: [], hasMore: false, nextCursor: null });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();

    const rawContent = typeof body.content === "string" ? body.content.slice(0, 1000).trim().replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";
    const fileUrl = typeof body.fileUrl === "string" && body.fileUrl.startsWith("/uploads/") ? body.fileUrl : null;
    const replyToId = typeof body.replyToId === "string" && body.replyToId.length > 0 ? body.replyToId : null;

    if (!rawContent && !fileUrl) {
      return NextResponse.json({ error: "Message ou fichier requis" }, { status: 400 });
    }

    const order = await resolveOrderId(orderId);
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    const realOrderId = order.id;
    if (["DELIVERED", "CANCELLED"].includes(order.status)) {
      return NextResponse.json({ error: "Conversation terminee" }, { status: 403 });
    }
    const chatSettings = await prisma.siteSettings.findUnique({ where: { id: "default" }, select: { chatEnabled: true } });
    if (chatSettings && chatSettings.chatEnabled === false) {
      return NextResponse.json({ error: "Chat desactive" }, { status: 403 });
    }
    if (!order.delivery) return NextResponse.json({ error: "Chat indisponible" }, { status: 403 });

    const session = await auth();
    const userId = (session?.user as any)?.id;
    const role = (session?.user as any)?.role;

    let sender: "CLIENT" | "DRIVER" | "ADMIN";
    let senderUserId: string | null = null;
    let guestName: string | null = null;

    if (!session?.user) {
      if (order.clientId) return NextResponse.json({ error: "Non autorise" }, { status: 403 });
      sender = "CLIENT";
      guestName = order.guestName || "Client";
    } else if (role === "ADMIN" || role === "MANAGER") {
      sender = "ADMIN";
      senderUserId = userId;
    } else if (userId === order.delivery.driverId) {
      sender = "DRIVER";
      senderUserId = userId;
    } else if (userId === order.clientId) {
      sender = "CLIENT";
      senderUserId = userId;
    } else {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: { content: rawContent, fileUrl, sender, orderId: realOrderId, userId: senderUserId, guestName, replyToId },
      include: {
        user: { select: { id: true, name: true, role: true } },
        replyTo: { select: { id: true, content: true, sender: true, guestName: true, fileUrl: true, user: { select: { name: true } } } },
      },
    });

    const io = (global as any).io;
    if (io) {
      io.to(`chat:${realOrderId}`).emit("chat:message", {
        ...message,
        createdAt: message.createdAt.toISOString(),
      });
      // Also emit to truncated room for old URLs
      if (realOrderId !== orderId) {
        io.to(`chat:${orderId}`).emit("chat:message", {
          ...message,
          createdAt: message.createdAt.toISOString(),
        });
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Erreur envoi message:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
