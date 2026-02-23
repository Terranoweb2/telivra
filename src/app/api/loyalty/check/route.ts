import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyRole } from "@/lib/notify";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (!host.includes("localhost")) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Clients avec >= 5 commandes livrées dans les 30 derniers jours
  const loyalClients = await prisma.$queryRaw<
    { clientId: string; name: string; orderCount: bigint; totalSpent: number }[]
  >`
    SELECT u.id as "clientId", u.name, COUNT(o.id) as "orderCount",
           COALESCE(SUM(o."totalAmount"), 0) as "totalSpent"
    FROM users u
    JOIN orders o ON o."clientId" = u.id
    WHERE o.status = 'DELIVERED'
      AND o."createdAt" >= ${thirtyDaysAgo}
      AND u."isActive" = true
      AND u.role = 'CLIENT'
    GROUP BY u.id, u.name
    HAVING COUNT(o.id) >= 5
  `;

  let notified = 0;

  for (const client of loyalClients) {
    const count = Number(client.orderCount);
    const spent = Math.round(Number(client.totalSpent));

    await notifyRole("ADMIN", {
      type: "LOYALTY",
      title: "Client fidele",
      message: `${client.name} — ${count} commandes ce mois (${spent} XOF)`,
      severity: "INFO",
      data: {
        clientId: client.clientId,
        clientName: client.name,
        orderCount: count,
        totalSpent: spent,
      },
      pushPayload: {
        title: "Client fidele detecte",
        body: `${client.name} — ${count} commandes`,
        url: "/alerts",
        tag: `loyalty-${client.clientId}`,
      },
    });

    notified++;
  }

  return NextResponse.json({ notified });
});
