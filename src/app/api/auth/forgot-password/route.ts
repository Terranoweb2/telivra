import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Ne pas reveler si l'email existe ou non
      return NextResponse.json({ message: "Si ce compte existe, un code a été envoyé" });
    }

    // Generer un code a 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Supprimer les anciens codes non utilises pour cet email
    await prisma.passwordResetCode.deleteMany({
      where: { email, used: false },
    });

    // Creer le nouveau code
    await prisma.passwordResetCode.create({
      data: { email, code, expiresAt },
    });

    // Log le code pour l'admin (visible dans PM2 logs)
    console.log(`[RESET PASSWORD] Code pour ${email}: ${code} (expire dans 15 min)`);

    return NextResponse.json({ message: "Si ce compte existe, un code a été envoyé" });
  } catch (err) {
    console.error("Erreur forgot-password:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
