import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = withTenant(async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
});
