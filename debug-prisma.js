// Debug: test le PrismaClient directement
const pg = require('pg');

const DB_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_FOyc4Bjq8lhk@ep-hidden-sunset-ai9tujv3-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);
console.log("URL (first 50):", DB_URL.substring(0, 50));

const pool = new pg.Pool({
  connectionString: DB_URL,
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  max: 5,
});

pool.query("SELECT 1 as test")
  .then(r => {
    console.log("OK: Connexion réussie", r.rows);
    pool.end();
  })
  .catch(e => {
    console.error("ERREUR:", e.message);
    pool.end();
  });
