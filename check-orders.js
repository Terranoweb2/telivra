const { PrismaClient } = require("@prisma/client");
const { neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
neonConfig.webSocketConstructor = ws;

async function main() {
  const prisma = new PrismaClient();

  // Find Jean Marie
  const user = await prisma.user.findFirst({
    where: { name: { contains: "Jean Marie" } },
    select: { id: true, name: true }
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  console.log("User:", user.name, user.id);

  // Count all orders
  const allOrders = await prisma.order.count({
    where: { clientId: user.id }
  });
  console.log("Total orders:", allOrders);

  // Count by status
  const byStatus = await prisma.order.groupBy({
    by: ["status"],
    where: { clientId: user.id },
    _count: true,
  });
  console.log("By status:", JSON.stringify(byStatus));

  // Count delivered
  const delivered = await prisma.order.count({
    where: { clientId: user.id, status: "DELIVERED" }
  });
  console.log("Delivered:", delivered);

  await prisma.$disconnect();
}

main().catch(console.error);
