import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser, notifyRole } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (!host.includes("localhost")) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

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

  // Charger les parametres de reduction anniversaire
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const discountEnabled = settings?.birthdayDiscountEnabled === true;
  const discountType = settings?.birthdayDiscountType || "PERCENTAGE";
  const discountValue = settings?.birthdayDiscountValue || 10;

  let notified = 0;

  for (const user of birthdayUsers) {
    const birthYear = new Date(user.dateOfBirth).getFullYear();
    const age = now.getFullYear() - birthYear;

    const orderCount = await prisma.order.count({
      where: { clientId: user.id, status: "DELIVERED" },
    });

    const discountMsg = discountEnabled
      ? discountType === "PERCENTAGE"
        ? ` Profitez de ${discountValue}% de reduction sur vos commandes aujourd'hui !`
        : ` Profitez de ${discountValue} FCFA de reduction sur vos commandes aujourd'hui !`
      : "";

    await notifyUser(user.id, {
      type: "BIRTHDAY",
      title: "Joyeux anniversaire !",
      message: `Nous vous souhaitons un excellent anniversaire !${discountMsg}`,
      severity: "INFO",
      data: { age, userId: user.id },
      pushPayload: {
        title: "Joyeux anniversaire !",
        body: `Nous vous souhaitons un excellent anniversaire !${discountMsg}`,
        url: "/dashboard",
        tag: `birthday-${user.id}`,
      },
    });

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

    notified++;
  }

  return NextResponse.json({ notified, date: now.toISOString() });
}
