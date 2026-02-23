import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const userId = (session.user as any).id;

  const { endpoint, keys } = await request.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Donnees subscription manquantes" }, { status: 400 });
  }

  // Valider l'URL endpoint
  try {
    new URL(endpoint);
  } catch {
    return NextResponse.json({ error: "Endpoint invalide" }, { status: 400 });
  }

  // Upsert : mettre à jour si même endpoint existe déjà
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withTenant(async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint requis" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
});
