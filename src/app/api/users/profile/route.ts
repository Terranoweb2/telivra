import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { compare, hash } from "bcryptjs";

// PUT /api/users/profile — Modifier son propre profil
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { name, currentPassword, newPassword } = body;

  // Mise à jour du nom
  if (name !== undefined) {
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Le nom doit faire au moins 2 caractères" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ ok: true, message: "Profil mis à jour" });
  }

  // Changement de mot de passe
  if (currentPassword && newPassword) {
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const isValid = await compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
    }

    const hashedPassword = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    return NextResponse.json({ ok: true, message: "Mot de passe modifié" });
  }

  return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
}
