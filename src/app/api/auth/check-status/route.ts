import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";

export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ blocked: false, emailNotVerified: false });

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      select: { isActive: true, emailVerified: true },
    });

    if (!user) return NextResponse.json({ blocked: false, emailNotVerified: false });

    return NextResponse.json({
      blocked: !user.isActive,
      emailNotVerified: !user.emailVerified,
    });
  } catch {
    return NextResponse.json({ blocked: false, emailNotVerified: false });
  }
});
