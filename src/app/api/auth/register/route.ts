import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyRole } from "@/lib/notify";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nom, email et mot de passe requis" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 });
    }

    // Normaliser l'email
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        hashedPassword,
        role: "CLIENT",
        ...(phone ? { phone: phone.trim() } : {}),
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Notifier les admins du nouveau client
    notifyRole("ADMIN", {
      type: "NEW_CLIENT",
      title: "Nouveau client",
      message: `${user.name} (${user.email})`,
      severity: "INFO",
      data: { clientId: user.id, clientName: user.name, email: user.email },
      pushPayload: {
        title: "Nouveau client",
        body: user.name,
        url: "/users",
        tag: `new-client-${user.id}`,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    console.error("[register] error:", err?.message || err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erreur serveur, veuillez réessayer" }, { status: 500 });
  }
}
