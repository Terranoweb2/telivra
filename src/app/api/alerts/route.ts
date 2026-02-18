import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const severity = searchParams.get("severity");
    const isRead = searchParams.get("isRead");

    const where: any = { userId: (session.user as any).id };

    // Support multi-type: "ORDER_NOTIFICATION,ORDER_READY,ORDER_TAKEN"
    if (type) {
      const types = type.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length === 1) {
        where.type = types[0];
      } else if (types.length > 1) {
        where.type = { in: types };
      }
    }

    if (severity) where.severity = severity;
    if (isRead !== null && isRead !== undefined) where.isRead = isRead === "true";

    const alerts = await prisma.alert.findMany({
      where,
      include: { device: true, geofence: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(alerts);
  } catch (e: any) {
    console.error("[alerts] GET error:", e.message);
    return NextResponse.json([], { status: 200 });
  }
}
