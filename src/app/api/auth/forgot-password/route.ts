import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";
import { sendResetCode } from "@/lib/email";

export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "Si ce compte existe, un code a été envoyé" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetCode.deleteMany({
      where: { email, used: false },
    });

    await prisma.passwordResetCode.create({
      data: { email, code, expiresAt },
    });

    // Récupérer le nom du restaurant pour l'email
    let restaurantName = "Terrano";
    try {
      const settings = await prisma.siteSettings.findFirst();
      if (settings?.restaurantName) restaurantName = settings.restaurantName;
    } catch {}

    // Envoyer le code par email
    await sendResetCode(email, code, restaurantName);
    console.log(`[RESET PASSWORD] Code envoyé à ${email} (expire dans 15 min)`);

    return NextResponse.json({ message: "Si ce compte existe, un code a été envoyé" });
  } catch (err) {
    console.error("Erreur forgot-password:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
