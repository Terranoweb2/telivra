import { NextResponse } from "next/server";
import pg from "pg";
import { Resend } from "resend";
import { getAllTenants } from "@/lib/tenant";
import { ADMIN_TIPS } from "@/lib/tips-content";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "Terrano <onboarding@resend.dev>";

// Calculate tip index from date (rotates every 60 tips = 180 days = 6 months)
function getTipIndex(): number {
  const startDate = new Date("2026-02-23"); // Start date
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const tipIndex = Math.floor(daysDiff / 3) % ADMIN_TIPS.length;
  return tipIndex;
}

function wrapTipHtml(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#1f2937;border-radius:16px;overflow:hidden">
  <tr><td style="background:#7c3aed;padding:20px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">Astuce Terrano</h1>
    <p style="margin:6px 0 0;color:#e9d5ff;font-size:12px">Astuce pour bien utiliser votre plateforme</p>
  </td></tr>
  <tr><td style="padding:28px 24px">
    <h2 style="margin:0 0 16px;color:#f3f4f6;font-size:17px;font-weight:700">${subject}</h2>
    <div style="color:#d1d5db;font-size:14px;line-height:1.7">
      ${bodyHtml}
    </div>
  </td></tr>
  <tr><td style="padding:16px 24px;border-top:1px solid #374151">
    <p style="margin:0;color:#4b5563;font-size:11px;text-align:center">Terrano — Plateforme de livraison de repas</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function POST() {
  const tipIndex = getTipIndex();
  const tip = ADMIN_TIPS[tipIndex];
  if (!tip) return NextResponse.json({ error: "No tip found" }, { status: 500 });

  const tenants = getAllTenants();
  let totalSent = 0;

  for (const tenant of tenants) {
    if (tenant.isBlocked) continue;
    let pool: pg.Pool | null = null;
    try {
      pool = new pg.Pool({ connectionString: tenant.databaseUrl, max: 1, connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: false } });

      // Get admin and manager emails
      const res = await pool.query(
        `SELECT email FROM users WHERE role IN ('ADMIN', 'MANAGER') AND "isActive" = true`
      );
      const emails = res.rows.map((r: any) => r.email);
      await pool.end();

      if (emails.length === 0) continue;

      // Send tip to all admins/managers of this tenant
      try {
        await resend.batch.send(emails.map(to => ({
          from: FROM,
          to,
          subject: `💡 ${tip.subject} — Astuce Terrano`,
          html: wrapTipHtml(tip.subject, tip.body),
        })));
        totalSent += emails.length;
        console.log(`[Tips] Sent tip #${tipIndex + 1} to ${emails.length} admin(s) of ${tenant.slug}`);
      } catch (err) {
        console.error(`[Tips] Send error tenant=${tenant.slug}:`, err);
      }
    } catch (err) {
      console.error(`[Tips] DB error tenant=${tenant.slug}:`, err);
      if (pool) try { await pool.end(); } catch {}
    }
  }

  return NextResponse.json({ ok: true, tipIndex: tipIndex + 1, totalSent });
}
