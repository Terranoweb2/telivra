const { Pool } = require("pg");

const MASTER_URL = "postgresql://neondb_owner:npg_FOyc4Bjq8lhk@ep-hidden-sunset-ai9tujv3-pooler.c-4.us-east-1.aws.neon.tech/terrano_master?sslmode=require";

async function main() {
  const pool = new Pool({ connectionString: MASTER_URL });

  // 1. List tenants to delete
  const { rows } = await pool.query("SELECT id, slug, name FROM tenants WHERE slug != 'terranogps'");
  console.log("Tenants à supprimer:", JSON.stringify(rows));

  if (rows.length === 0) {
    console.log("Rien à supprimer.");
    await pool.end();
    return;
  }

  // 2. Delete tenants from master DB
  for (const t of rows) {
    await pool.query("DELETE FROM tenants WHERE id = $1", [t.id]);
    console.log(`  Supprimé: ${t.slug} (${t.name})`);
  }

  // 3. Delete notifications
  await pool.query("DELETE FROM update_notifications");
  console.log("Notifications nettoyées.");

  // 4. Verify
  const { rows: remaining } = await pool.query("SELECT slug, name FROM tenants");
  console.log("Tenants restants:", JSON.stringify(remaining));

  await pool.end();
  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
