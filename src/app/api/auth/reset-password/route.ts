import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Email, code et nouveau mot de passe requis" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
    }

    // Verifier le code
    const resetCode = await prisma.passwordResetCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetCode) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
    }

    // Marquer le code comme utilise
    await prisma.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { used: true },
    });

    // Mettre a jour le mot de passe
    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { email },
      data: { hashedPassword },
    });

    return NextResponse.json({ message: "Mot de passe mis à jour avec succès" });
  } catch (err) {
    console.error("Erreur reset-password:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
});
