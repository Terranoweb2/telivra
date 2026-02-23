import { NextResponse } from "next/server";
import pg from "pg";
import { Resend } from "resend";
import { getAllTenants } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "Terrano <onboarding@resend.dev>";

function wrapHtml(body: string, restaurantName: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#1f2937;border-radius:16px;overflow:hidden">
  <tr><td style="background:#ea580c;padding:20px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">${restaurantName}</h1>
  </td></tr>
  <tr><td style="padding:28px 24px;color:#e5e7eb;font-size:15px;line-height:1.6">
    ${body}
  </td></tr>
  <tr><td style="padding:16px 24px;border-top:1px solid #374151">
    <p style="margin:0;color:#4b5563;font-size:11px;text-align:center">${restaurantName} — Livraison de repas</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function POST() {
  const tenants = getAllTenants();
  let totalSent = 0;

  for (const tenant of tenants) {
    if (tenant.isBlocked) continue;
    let pool: pg.Pool | null = null;
    try {
      pool = new pg.Pool({ connectionString: tenant.databaseUrl, max: 1, connectionTimeoutMillis: 10000, ssl: { rejectUnauthorized: false } });

      // Find scheduled newsletters that are due
      const nlRes = await pool.query(
        `SELECT id, subject, "htmlContent", recipient_type, recipient_emails
         FROM newsletters
         WHERE status = 'scheduled' AND scheduled_for <= NOW()`
      );

      if (nlRes.rows.length === 0) { await pool.end(); continue; }

      // Get restaurant name
      let restaurantName = tenant.name || "Terrano";
      try {
        const sRes = await pool.query('SELECT "restaurantName" FROM site_settings LIMIT 1');
        if (sRes.rows[0]?.restaurantName) restaurantName = sRes.rows[0].restaurantName;
      } catch {}

      for (const nl of nlRes.rows) {
        let emails: string[] = [];

        if (nl.recipient_type === "selected" && Array.isArray(nl.recipient_emails) && nl.recipient_emails.length > 0) {
          emails = nl.recipient_emails;
        } else {
          const clientRes = await pool.query(
            `SELECT email FROM users WHERE role = 'CLIENT' AND "isActive" = true`
          );
          emails = clientRes.rows.map((r: any) => r.email);
        }

        if (emails.length === 0) {
          await pool.query(
            `UPDATE newsletters SET status = 'sent', "sentAt" = NOW(), "sentCount" = 0 WHERE id = $1`,
            [nl.id]
          );
          continue;
        }

        // Send in batches
        let sent = 0;
        const BATCH = 50;
        for (let i = 0; i < emails.length; i += BATCH) {
          const batch = emails.slice(i, i + BATCH);
          try {
            await resend.batch.send(batch.map(to => ({
              from: FROM, to, subject: nl.subject, html: wrapHtml(nl.htmlContent, restaurantName),
            })));
            sent += batch.length;
          } catch (err) {
            console.error(`[Cron-NL] Batch error tenant=${tenant.slug}:`, err);
          }
        }

        await pool.query(
          `UPDATE newsletters SET status = 'sent', "sentAt" = NOW(), "sentCount" = $1 WHERE id = $2`,
          [sent, nl.id]
        );
        totalSent += sent;
        console.log(`[Cron-NL] ${tenant.slug}: newsletter "${nl.subject}" sent to ${sent}/${emails.length}`);
      }

      await pool.end();
    } catch (err) {
      console.error(`[Cron-NL] Error tenant=${tenant.slug}:`, err);
      if (pool) try { await pool.end(); } catch {}
    }
  }

  return NextResponse.json({ ok: true, totalSent });
}
