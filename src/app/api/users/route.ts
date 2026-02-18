import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const callerRole = (session?.user as any)?.role;
    if (!session?.user || !["ADMIN", "MANAGER"].includes(callerRole))
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // Guest users mode
    if (searchParams.get("guests") === "true") {
      const guestOrders = await prisma.order.findMany({
        where: { clientId: null, OR: [{ guestName: { not: null } }, { guestPhone: { not: null } }] },
        select: { guestName: true, guestPhone: true, totalAmount: true, createdAt: true, status: true, deliveryAddress: true },
        orderBy: { createdAt: "desc" },
      });

      // Union-Find for deduplication by name OR phone
      const par = new Map<string, string>();
      function find(x: string): string {
        if (!par.has(x)) par.set(x, x);
        if (par.get(x) !== x) par.set(x, find(par.get(x)!));
        return par.get(x)!;
      }
      function union(a: string, b: string) {
        const ra = find(a), rb = find(b);
        if (ra !== rb) par.set(ra, rb);
      }

      const nk = (n: string) => "N:" + n.trim().toLowerCase();
      const pk = (p: string) => "P:" + p.replace(/\D/g, "");

      for (const o of guestOrders) {
        const n = o.guestName ? nk(o.guestName) : null;
        const p = o.guestPhone ? pk(o.guestPhone) : null;
        if (n && p) union(n, p);
      }

      const groups = new Map<string, typeof guestOrders>();
      for (const o of guestOrders) {
        const n = o.guestName ? nk(o.guestName) : null;
        const p = o.guestPhone ? pk(o.guestPhone) : null;
        const root = find(n || p || "unknown");
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root)!.push(o);
      }

      const guests: any[] = [];
      for (const [, orders] of groups) {
        const names = orders.map(o => o.guestName).filter(Boolean) as string[];
        const phones = orders.map(o => o.guestPhone).filter(Boolean) as string[];
        const delivered = orders.filter(o => o.status === "DELIVERED");

        const uniqueNames = [...new Set(names.map(n => n.trim()))];
        const displayName = uniqueNames.length > 1
          ? `${uniqueNames[0]} (${uniqueNames.slice(1).join(", ")})`
          : uniqueNames[0] || "Inconnu";

        const uniquePhones = [...new Set(phones.map(p => p.trim()))];
        const addresses = [...new Set(orders.map(o => o.deliveryAddress).filter(Boolean) as string[])];

        guests.push({
          name: displayName,
          phone: uniquePhones[0] || "N/A",
          allPhones: uniquePhones,
          totalOrders: orders.length,
          deliveredOrders: delivered.length,
          totalSpent: delivered.reduce((s, o) => s + (o.totalAmount || 0), 0),
          lastOrder: orders[0].createdAt,
          addresses: addresses.slice(0, 3),
        });
      }
      guests.sort((a, b) => new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime());
      return NextResponse.json(guests);
    }

    const usersWhere: any = {};
    if (callerRole === "MANAGER") usersWhere.role = { notIn: ["ADMIN", "MANAGER"] };
    const users = await prisma.user.findMany({
      where: usersWhere,
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true, phone: true,
        _count: { select: { clientOrders: true, driverDeliveries: true, cookOrders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (e: any) {
    console.error("[users] GET error:", e.message);
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const callerRole = (session?.user as any)?.role;
    const callerId = (session?.user as any)?.id;
    if (!session?.user || !["ADMIN", "MANAGER"].includes(callerRole))
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const { id, role, isActive } = await request.json();

    // Admin ne peut pas se bloquer lui-même
    if (id === callerId && isActive === false) {
      return NextResponse.json({ error: "Vous ne pouvez pas desactiver votre propre compte" }, { status: 400 });
    }

    // Manager : restrictions
    if (callerRole === "MANAGER") {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
      if (target.role === "ADMIN" || target.role === "MANAGER") {
        return NextResponse.json({ error: "Vous ne pouvez pas modifier cet utilisateur" }, { status: 403 });
      }
      if (role && !["CLIENT", "DRIVER", "COOK"].includes(role)) {
        return NextResponse.json({ error: "Rôle non autorisé" }, { status: 403 });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { ...(role && { role }), ...(typeof isActive === "boolean" && { isActive }) },
    });
    return NextResponse.json(user);
  } catch (e: any) {
    console.error("[users] PUT error:", e.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const callerRole = (session?.user as any)?.role;
    const callerId = (session?.user as any)?.id;
    if (!session?.user || !["ADMIN", "MANAGER"].includes(callerRole))
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const { id } = await request.json();

    if (id === callerId) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }

    // Manager ne peut pas supprimer un ADMIN/MANAGER
    if (callerRole === "MANAGER") {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (target?.role === "ADMIN" || target?.role === "MANAGER") {
        return NextResponse.json({ error: "Vous ne pouvez pas supprimer cet utilisateur" }, { status: 403 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { _count: { select: { clientOrders: true, driverDeliveries: true, cookOrders: true } } },
    });

    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const total = (user._count.clientOrders || 0) + (user._count.driverDeliveries || 0) + (user._count.cookOrders || 0);
    if (total > 0) {
      return NextResponse.json({ error: "Cet utilisateur a des commandes. Bloquez-le plutôt." }, { status: 400 });
    }

    // Delete related records first
    await prisma.alert.deleteMany({ where: { userId: id } });
    await prisma.device.deleteMany({ where: { userId: id } });
    await prisma.pushSubscription.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[users] DELETE error:", e.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
