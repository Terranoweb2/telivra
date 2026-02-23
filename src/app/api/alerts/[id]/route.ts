import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const PUT = withTenant(async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as any).id;
  const body = await request.json();

  const existing = await prisma.alert.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ success: true });

  const alert = await prisma.alert.update({
    where: { id },
    data: { isRead: body.isRead ?? true },
  });
  return NextResponse.json(alert);
});

export const DELETE = withTenant(async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as any).id;

  const existing = await prisma.alert.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ success: true });

  await prisma.alert.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
