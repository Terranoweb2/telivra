import { NextRequest, NextResponse } from "next/server";
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

  const newsletters = await prisma.newsletter.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(newsletters);
});

export const POST = withTenant(async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { subject, htmlContent, scheduledFor, recipientType, recipientEmails } = await request.json();

  if (!subject?.trim() || !htmlContent?.trim()) {
    return NextResponse.json({ error: "Sujet et contenu requis" }, { status: 400 });
  }

  const data: any = {
    subject: subject.trim(),
    htmlContent,
    recipientType: recipientType || "all",
    recipientEmails: Array.isArray(recipientEmails) ? recipientEmails : [],
  };

  if (scheduledFor) {
    data.scheduledFor = new Date(scheduledFor);
    data.status = "scheduled";
  }

  const newsletter = await prisma.newsletter.create({ data });
  return NextResponse.json(newsletter, { status: 201 });
});
