import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";
import { sendVerificationCode } from "@/lib/email";

export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  try {
    const { email, code, resend } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Renvoyer un nouveau code
    if (resend) {
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
      }
      if (user.emailVerified) {
        return NextResponse.json({ message: "Email déjà vérifié" });
      }

      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.passwordResetCode.deleteMany({
        where: { email: normalizedEmail, used: false },
      });

      await prisma.passwordResetCode.create({
        data: { email: normalizedEmail, code: newCode, expiresAt },
      });

      let restaurantName = "Terrano";
      try {
        const settings = await prisma.siteSettings.findFirst();
        if (settings?.restaurantName) restaurantName = settings.restaurantName;
      } catch {}

      await sendVerificationCode(normalizedEmail, newCode, restaurantName);

      return NextResponse.json({ message: "Nouveau code envoyé" });
    }

    // Vérifier le code
    if (!code) {
      return NextResponse.json({ error: "Code requis" }, { status: 400 });
    }

    const record = await prisma.passwordResetCode.findFirst({
      where: {
        email: normalizedEmail,
        code: String(code),
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
    }

    // Marquer le code comme utilisé
    await prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Marquer l'email comme vérifié
    await prisma.user.updateMany({
      where: { email: normalizedEmail },
      data: { emailVerified: true },
    });

    return NextResponse.json({ message: "Email vérifié avec succès" });
  } catch (err) {
    console.error("[verify-email] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
