const pg = require("pg");
const { createDecipheriv } = require("crypto");
const KEY = "0bc77e081c1f0946095ce1aacedecabe403cf8b82595a1b333201d8902f78008";

function decrypt(enc) {
  if (!enc.includes(":")) return enc;
  const [ivHex, tagHex, encrypted] = enc.split(":");
  const d = createDecipheriv("aes-256-gcm", Buffer.from(KEY, "hex"), Buffer.from(ivHex, "hex"));
  d.setAuthTag(Buffer.from(tagHex, "hex"));
  return d.update(encrypted, "hex", "utf8") + d.final("utf8");
}

async function run() {
  const pool = new pg.Pool({
    connectionString: "postgresql://neondb_owner:npg_FOyc4Bjq8lhk@ep-hidden-sunset-ai9tujv3-pooler.c-4.us-east-1.aws.neon.tech/terrano_master?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });
  const r = await pool.query('SELECT slug, name, "isBlocked", "databaseUrl" FROM tenants ORDER BY "createdAt"');
  for (const row of r.rows) {
    const dbUrl = decrypt(row.databaseUrl);
    // Show only the database name from the URL
    const dbName = dbUrl.match(/\/([^?]+)/)?.[1] || "unknown";
    console.log(`${row.slug} | ${row.name} | blocked=${row.isBlocked} | db=${dbName}`);
  }
  await pool.end();
}
run().catch(e => console.error(e.message));
