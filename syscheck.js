const { Pool } = require("pg");

const MASTER_URL = "postgresql://neondb_owner:npg_FOyc4Bjq8lhk@ep-hidden-sunset-ai9tujv3-pooler.c-4.us-east-1.aws.neon.tech/terrano_master?sslmode=require";

async function main() {
  const pool = new Pool({ connectionString: MASTER_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });

  console.log("=== 1. TENANTS MASTER DB ===");
  const { rows: tenants } = await pool.query('SELECT slug, name, "isBlocked" FROM tenants ORDER BY "createdAt"');
  console.log(JSON.stringify(tenants, null, 2));

  console.log("\n=== 2. NEON DATABASES ===");
  // Check via API
  const res = await fetch("https://console.neon.tech/api/v2/projects/floral-hat-52637371/branches/br-rapid-art-aio4n3j2/databases", {
    headers: { "Authorization": "Bearer napi_szwn7qijj61l25nxz7q1js9ilxbnxzd30lhfn6fcehycc3hx36a6o2ru8q2yzq63" }
  });
  const data = await res.json();
  data.databases.forEach(db => console.log(`  - ${db.name}`));

  await pool.end();
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
