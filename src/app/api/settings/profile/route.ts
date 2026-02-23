import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, dateOfBirth: true, phone: true },
  });

  return NextResponse.json(user);
});

export const PUT = withTenant(async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await request.json();
  const data: any = {};

  if (body.dateOfBirth !== undefined) {
    if (body.dateOfBirth) {
      const dob = new Date(body.dateOfBirth);
      if (isNaN(dob.getTime())) {
        return NextResponse.json({ error: "Date invalide" }, { status: 400 });
      }
      if (dob > new Date()) {
        return NextResponse.json({ error: "La date doit être dans le passe" }, { status: 400 });
      }
      if (dob.getFullYear() < 1920) {
        return NextResponse.json({ error: "Date invalide" }, { status: 400 });
      }
      data.dateOfBirth = dob;
    } else {
      data.dateOfBirth = null;
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, dateOfBirth: true, phone: true },
  });

  return NextResponse.json(user);
});
