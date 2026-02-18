import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser, notifyRole } from "@/lib/notify";

export async function POST(request: NextRequest) {
  // Vérifie que l'appel vient du cron interne
  const host = request.headers.get("host") || "";
  if (!host.includes("localhost")) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Trouver les clients dont c'est l'anniversaire aujourd'hui
  const birthdayUsers = await prisma.$queryRaw<
    { id: string; name: string; email: string; dateOfBirth: Date }[]
  >`
    SELECT id, name, email, "dateOfBirth"
    FROM users
    WHERE "dateOfBirth" IS NOT NULL
      AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
      AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
      AND "isActive" = true
  `;

  let notified = 0;

  for (const user of birthdayUsers) {
    const birthYear = new Date(user.dateOfBirth).getFullYear();
    const age = now.getFullYear() - birthYear;

    // Compter les commandes du client
    const orderCount = await prisma.order.count({
      where: { clientId: user.id, status: "DELIVERED" },
    });

    // Notifier le client
    await notifyUser(user.id, {
      type: "BIRTHDAY",
      title: "Joyeux anniversaire !",
      message: `Nous vous souhaitons un excellent anniversaire ! Un cadeau special vous attend.`,
      severity: "INFO",
      data: { age, userId: user.id },
      pushPayload: {
        title: "Joyeux anniversaire !",
        body: "Un cadeau special vous attend dans l'application !",
        url: "/livraison",
        tag: `birthday-${user.id}`,
      },
    });

    // Notifier les admins
    await notifyRole("ADMIN", {
      type: "BIRTHDAY",
      title: "Anniversaire client",
      message: `${user.name} fete ses ${age} ans aujourd'hui (${orderCount} commandes)`,
      severity: "INFO",
      data: { clientId: user.id, clientName: user.name, age, orderCount },
      pushPayload: {
        title: "Anniversaire client",
        body: `${user.name} fete ses ${age} ans`,
        url: "/alerts",
        tag: `birthday-admin-${user.id}`,
      },
    });

    // Créer une promotion anniversaire (-10% pendant 48h)
    const endDate = new Date();
    endDate.setHours(endDate.getHours() + 48);

    await prisma.promotion.create({
      data: {
        name: `Anniversaire ${user.name}`,
        description: `Reduction anniversaire pour ${user.name}`,
        discountType: "PERCENTAGE",
        discountValue: 10,
        startDate: now,
        endDate,
        isActive: true,
        appliesToAll: true,
      },
    });

    notified++;
  }

  return NextResponse.json({ notified, date: now.toISOString() });
}
