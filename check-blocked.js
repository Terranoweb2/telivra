// Load .env manually
const fs = require("fs");
const path = require("path");
const envPath = path.join("/root/terrano-gps", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach(line => {
  const idx = line.indexOf("=");
  if (idx > 0 && !line.startsWith("#")) {
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
});

const pg = require("pg");

async function main() {
  const url = process.env.MASTER_DATABASE_URL;
  console.log("MASTER_DB exists:", !!url);
  if (!url) { console.log("NO MASTER_DATABASE_URL!"); return; }

  const pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  try {
    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='platform_settings'"
    );
    console.log("Table exists:", tables.rows.length > 0);

    if (tables.rows.length > 0) {
      const data = await pool.query("SELECT * FROM platform_settings LIMIT 1");
      console.log("Rows found:", data.rows.length);
      if (data.rows.length > 0) {
        const row = data.rows[0];
        console.log("ID:", row.id);
        console.log("Title:", row.blockedPageTitle);
        console.log("Subtitle:", row.blockedPageSubtitle);
        console.log("Content length:", row.blockedPageContent ? row.blockedPageContent.length : 0);
        console.log("Features:", JSON.stringify(row.blockedPageFeatures));
        console.log("ButtonText:", row.blockedPageButtonText);
        console.log("ButtonUrl:", row.blockedPageButtonUrl);
        console.log("Email:", row.blockedPageEmail);
        console.log("Logo:", row.blockedPageLogo);
      }
    } else {
      console.log("TABLE platform_settings DOES NOT EXIST!");
    }

    const tenants = await pool.query('SELECT slug, "isBlocked" FROM tenants');
    console.log("Tenants:", tenants.rows.map(r => r.slug + "(blocked:" + r.isBlocked + ")").join(", "));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
