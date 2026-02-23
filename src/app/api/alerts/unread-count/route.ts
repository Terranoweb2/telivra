import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ count: 0 });

    const count = await prisma.alert.count({
      where: { userId: (session.user as any).id, isRead: false },
    });

    return NextResponse.json({ count });
  } catch (e: any) {
    console.error("[alerts/unread-count] error:", e.message);
    return NextResponse.json({ count: 0 });
  }
});
