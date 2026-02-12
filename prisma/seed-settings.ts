import { prisma } from "../src/lib/prisma";

async function main() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", restaurantName: "Terrano Restaurant" },
    update: {},
  });
  console.log("SiteSettings:", settings);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
