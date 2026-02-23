import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";
import { auth } from "@/lib/auth";
import { sendNewsletter } from "@/lib/email";

export const dynamic = "force-dynamic";

export const POST = withTenant(async function POST(
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
    return NextResponse.json({ error: "Newsletter déjà envoyée" }, { status: 400 });
  }

  // Déterminer les destinataires
  let emails: string[] = [];

  if ((newsletter as any).recipientType === "selected" && Array.isArray((newsletter as any).recipientEmails) && (newsletter as any).recipientEmails.length > 0) {
    emails = (newsletter as any).recipientEmails;
  } else {
    // Par défaut : tous les clients actifs
    const clients = await prisma.user.findMany({
      where: { role: "CLIENT", isActive: true },
      select: { email: true },
    });
    emails = clients.map((c) => c.email);
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire" }, { status: 400 });
  }

  // Récupérer le nom du restaurant
  let restaurantName = "Terrano";
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (settings?.restaurantName) restaurantName = settings.restaurantName;
  } catch {}

  const sentCount = await sendNewsletter(emails, newsletter.subject, newsletter.htmlContent, restaurantName);

  await prisma.newsletter.update({
    where: { id },
    data: {
      status: "sent",
      sentAt: new Date(),
      sentCount,
    },
  });

  return NextResponse.json({ ok: true, sentCount, total: emails.length });
});
