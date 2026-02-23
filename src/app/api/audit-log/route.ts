import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const entity = searchParams.get("entity");

  const where: any = {};
  if (entity) where.entity = entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
});

export const POST = withTenant(async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "MANAGER"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const body = await request.json();
  const { action, entity, entityId, entityName, reason, details } = body;

  if (!action || !entity) {
    return NextResponse.json({ error: "action et entity requis" }, { status: 400 });
  }

  const log = await prisma.auditLog.create({
    data: {
      action: String(action).slice(0, 50),
      entity: String(entity).slice(0, 50),
      entityId: entityId ? String(entityId) : null,
      entityName: entityName ? String(entityName).slice(0, 200) : null,
      reason: reason ? String(reason).slice(0, 500) : null,
      details: details ? String(details).slice(0, 1000) : null,
      userId: (session.user as any).id,
    },
  });

  return NextResponse.json(log, { status: 201 });
});
