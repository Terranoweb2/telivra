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
      fedapayEnvironment: "sandbox",
      deliveryFee: 0,
      currency: "XOF",
    });
  }
  // Masquer les cles secretes pour les non-admin
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({
      ...settings,
      fedapaySecretKey: undefined,
      fedapayPublicKey: settings.fedapayPublicKey ? "****" : null,
    });
  }
  return NextResponse.json({
    ...settings,
    fedapaySecretKey: settings.fedapaySecretKey ? "****" : null,
  });
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
    fedapayPublicKey,
    fedapaySecretKey,
    fedapayEnvironment,
    deliveryFee,
    currency,
  } = body;

  const data: any = {};
  if (restaurantName !== undefined) data.restaurantName = restaurantName;
  if (defaultPaymentMethod !== undefined) data.defaultPaymentMethod = defaultPaymentMethod;
  if (fedapayEnvironment !== undefined) data.fedapayEnvironment = fedapayEnvironment;
  if (deliveryFee !== undefined) data.deliveryFee = parseFloat(deliveryFee) || 0;
  if (currency !== undefined) data.currency = currency;
  // Ne mettre a jour les cles que si elles sont fournies et pas "****"
  if (fedapayPublicKey && fedapayPublicKey !== "****") data.fedapayPublicKey = fedapayPublicKey;
  if (fedapaySecretKey && fedapaySecretKey !== "****") data.fedapaySecretKey = fedapaySecretKey;

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  return NextResponse.json({
    ...settings,
    fedapaySecretKey: settings.fedapaySecretKey ? "****" : null,
  });
}
