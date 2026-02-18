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
  const pwd = await hash("Telivra2026!", 12);

  const users = [
    { email: "admin@telivra.com", name: "Super Admin", role: "ADMIN" as const, phone: "+229 90000001" },
    { email: "cuisine@telivra.com", name: "Chef Cuisine", role: "COOK" as const, phone: "+229 90000002" },
    { email: "livreur@telivra.com", name: "Livreur Principal", role: "DRIVER" as const, phone: "+229 90000003" },
    { email: "client@telivra.com", name: "Client Test", role: "CLIENT" as const, phone: "+229 90000004" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name },
      create: {
        email: u.email,
        name: u.name,
        hashedPassword: pwd,
        role: u.role,
        phone: u.phone,
      },
    });
    console.log(`[seed] ${u.role}: ${u.email}`);
  }

  console.log("\nComptes créés — mot de passe: Telivra2026!");
  console.log("  admin@telivra.com    → /admin");
  console.log("  cuisine@telivra.com  → /kitchen");
  console.log("  livreur@telivra.com  → /driver");
  console.log("  client@telivra.com   → /");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
