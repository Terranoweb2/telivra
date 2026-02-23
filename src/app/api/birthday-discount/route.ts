import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ eligible: false });

  const userId = (session.user as any).id;
  if (!userId) return NextResponse.json({ eligible: false });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dateOfBirth: true },
  });

  if (!user?.dateOfBirth) return NextResponse.json({ eligible: false });

  const now = new Date();
  const dob = new Date(user.dateOfBirth);
  if (dob.getMonth() !== now.getMonth() || dob.getDate() !== now.getDate()) {
    return NextResponse.json({ eligible: false });
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings?.birthdayDiscountEnabled) {
    return NextResponse.json({ eligible: false });
  }

  return NextResponse.json({
    eligible: true,
    type: settings.birthdayDiscountType || "PERCENTAGE",
    value: settings.birthdayDiscountValue || 10,
  }, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
});
