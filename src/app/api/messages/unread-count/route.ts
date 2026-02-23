import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ count: 0 });

    const userId = (session.user as any)?.id;
    const role = (session.user as any)?.role;

    let where: any;

    if (role === "ADMIN" || role === "MANAGER") {
      where = { isRead: false, sender: { in: ["CLIENT", "DRIVER"] } };
    } else if (role === "DRIVER") {
      where = {
        isRead: false,
        sender: { in: ["CLIENT", "ADMIN", "SYSTEM"] },
        order: { delivery: { driverId: userId } },
      };
    } else if (role === "CLIENT") {
      where = {
        isRead: false,
        sender: { in: ["DRIVER", "ADMIN", "SYSTEM"] },
        order: { clientId: userId },
      };
    } else {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.message.count({ where });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
});
