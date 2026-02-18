import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ blocked: false });

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      select: { isActive: true },
    });

    return NextResponse.json({ blocked: user ? !user.isActive : false });
  } catch {
    return NextResponse.json({ blocked: false });
  }
}
