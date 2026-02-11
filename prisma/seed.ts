import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@terranogps.com" },
    update: {},
    create: {
      email: "admin@terranogps.com",
      name: "Administrateur",
      hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Seed termine: admin@terranogps.com / admin123");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
