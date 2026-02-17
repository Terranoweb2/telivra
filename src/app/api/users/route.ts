import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN")
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

      // Unique names for display: "Nom1 (Nom2, Nom3)"
      const uniqueNames = [...new Set(names.map(n => n.trim()))];
      const displayName = uniqueNames.length > 1
        ? `${uniqueNames[0]} (${uniqueNames.slice(1).join(", ")})`
        : uniqueNames[0] || "Inconnu";

      // Unique phones
      const uniquePhones = [...new Set(phones.map(p => p.trim()))];

      // Unique addresses (max 3)
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

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, isActive: true, createdAt: true, phone: true,
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

  // Empêcher un admin de désactiver son propre compte
  if (id === (session.user as any).id && isActive === false) {
    return NextResponse.json({ error: "Vous ne pouvez pas désactiver votre propre compte" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { ...(role && { role }), ...(typeof isActive === "boolean" && { isActive }) },
  });
  return NextResponse.json(user);
}
