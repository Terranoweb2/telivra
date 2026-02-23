import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/with-tenant";


export const dynamic = "force-dynamic";
export const POST = withTenant(async function POST(request: NextRequest) {
  const now = new Date();
  const activePromos = await prisma.promotion.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
  });

  if (activePromos.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let alertCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const promo of activePromos) {
    // Vérifier si déjà notifié aujourd'hui
    const existing = await prisma.alert.findFirst({
      where: {
        type: "PROMOTION",
        createdAt: { gte: today },
        title: { contains: promo.id },
      },
    });
    if (existing) continue;

    const discountLabel = promo.discountType === "PERCENTAGE"
      ? `${promo.discountValue}%`
      : `${promo.discountValue} FCFA`;

    const alertData = users.map((u) => ({
      type: "PROMOTION" as const,
      severity: "INFO" as const,
      title: `Promotion: ${promo.name} [${promo.id}]`,
      message: promo.description || `${discountLabel} de reduction!`,
      userId: u.id,
      data: { promotionId: promo.id, image: promo.image },
    }));

    await prisma.alert.createMany({ data: alertData });
    alertCount += alertData.length;

    const io = (global as any).io;
    if (io) {
      io.emit("notification:new", {
        type: "PROMOTION",
        title: `Promotion: ${promo.name}`,
        message: promo.description || `${discountLabel} de reduction!`,
        image: promo.image,
      });
    }
  }

  return NextResponse.json({ sent: alertCount });
});
