import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const birthdayUsers = await prisma.$queryRaw<
    { id: string; name: string; email: string; dateOfBirth: Date; phone: string | null }[]
  >`
    SELECT id, name, email, "dateOfBirth", phone
    FROM users
    WHERE "dateOfBirth" IS NOT NULL
      AND EXTRACT(MONTH FROM "dateOfBirth") = ${month}
      AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
      AND "isActive" = true
  `;

  const results = [];
  for (const user of birthdayUsers) {
    const birthYear = new Date(user.dateOfBirth).getFullYear();
    const age = now.getFullYear() - birthYear;
    const orderCount = await prisma.order.count({
      where: { clientId: user.id, status: "DELIVERED" },
    });
    results.push({
      id: user.id,
      name: user.name,
      age,
      orderCount,
      phone: user.phone,
    });
  }

  return NextResponse.json(results);
}
