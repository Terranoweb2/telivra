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

  const count = await prisma.user.count({
    where: { role: "CLIENT", isActive: true },
  });

  return NextResponse.json({ count });
});
