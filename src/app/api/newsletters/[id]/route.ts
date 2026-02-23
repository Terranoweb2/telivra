import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const PUT = withTenant(async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const newsletter = await prisma.newsletter.findUnique({ where: { id } });
  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter introuvable" }, { status: 404 });
  }
  if (newsletter.status === "sent") {
    return NextResponse.json({ error: "Impossible de modifier une newsletter envoyée" }, { status: 400 });
  }

  const { subject, htmlContent, scheduledFor, recipientType, recipientEmails } = await request.json();
  const data: any = {};
  if (subject !== undefined) data.subject = subject.trim();
  if (htmlContent !== undefined) data.htmlContent = htmlContent;
  if (recipientType !== undefined) data.recipientType = recipientType;
  if (recipientEmails !== undefined) data.recipientEmails = recipientEmails;

  if (scheduledFor !== undefined) {
    if (scheduledFor) {
      data.scheduledFor = new Date(scheduledFor);
      data.status = "scheduled";
    } else {
      data.scheduledFor = null;
      data.status = "draft";
    }
  }

  const updated = await prisma.newsletter.update({ where: { id }, data });
  return NextResponse.json(updated);
});

export const DELETE = withTenant(async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const newsletter = await prisma.newsletter.findUnique({ where: { id } });
  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter introuvable" }, { status: 404 });
  }
  if (newsletter.status === "sent") {
    return NextResponse.json({ error: "Impossible de supprimer une newsletter envoyée" }, { status: 400 });
  }

  await prisma.newsletter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
