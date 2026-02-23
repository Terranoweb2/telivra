import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pg from "pg";
import { withTenant } from "@/lib/with-tenant";

export const dynamic = "force-dynamic";
export const GET = withTenant(async function GET(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role))
    return NextResponse.json([]);

  const masterUrl = process.env.MASTER_DATABASE_URL;
  if (!masterUrl) return NextResponse.json([]);

  const host = request.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "";
  let slug = "";
  if (baseDomain) {
    const hostname = host.split(":")[0];
    if (hostname.endsWith("." + baseDomain)) {
      slug = hostname.replace("." + baseDomain, "");
    }
  }
  if (!slug) return NextResponse.json([]);

  try {
    const pool = new pg.Pool({ connectionString: masterUrl, max: 1, connectionTimeoutMillis: 10000 });
    const result = await pool.query(
      `SELECT id, title, message, type, "createdAt"
       FROM update_notifications
       WHERE ("tenantId" IS NULL OR "tenantId" = (SELECT id FROM tenants WHERE slug = $1))
       AND NOT ($1 = ANY("readBy"))
       ORDER BY "createdAt" DESC LIMIT 10`,
      [slug]
    );
    await pool.end();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[PlatformNotifs] Error:", err);
    return NextResponse.json([]);
  }
});

export const POST = withTenant(async function POST(request: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role))
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const masterUrl = process.env.MASTER_DATABASE_URL;
  if (!masterUrl) return NextResponse.json({ error: "Master DB not configured" }, { status: 500 });

  const { notificationId } = await request.json();
  const host = request.headers.get("host") || "";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "";
  let slug = "";
  if (baseDomain) {
    const hostname = host.split(":")[0];
    if (hostname.endsWith("." + baseDomain)) {
      slug = hostname.replace("." + baseDomain, "");
    }
  }
  if (!slug || !notificationId) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  try {
    const pool = new pg.Pool({ connectionString: masterUrl, max: 1, connectionTimeoutMillis: 10000 });
    await pool.query(
      `UPDATE update_notifications SET "readBy" = array_append("readBy", $1) WHERE id = $2`,
      [slug, notificationId]
    );
    await pool.end();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PlatformNotifs] Mark read error:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
});
