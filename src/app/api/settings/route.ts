import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    return NextResponse.json({
      id: "default",
      restaurantName: "Mon Restaurant",
      defaultPaymentMethod: "BOTH",
      paymentPhoneNumber: null,
      deliveryFee: 0,
      currency: "XOF",
    });
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const body = await request.json();
  const {
    restaurantName,
    defaultPaymentMethod,
    paymentPhoneNumber,
    deliveryFee,
    currency,
  } = body;

  const data: Record<string, unknown> = {};
  if (restaurantName !== undefined) data.restaurantName = String(restaurantName).slice(0, 100);
  if (defaultPaymentMethod !== undefined) data.defaultPaymentMethod = defaultPaymentMethod;
  if (paymentPhoneNumber !== undefined) data.paymentPhoneNumber = paymentPhoneNumber ? String(paymentPhoneNumber).replace(/[^0-9+]/g, "").slice(0, 20) : null;
  if (deliveryFee !== undefined) data.deliveryFee = parseFloat(deliveryFee) || 0;
  if (currency !== undefined) data.currency = String(currency).slice(0, 10);

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  return NextResponse.json(settings);
}
