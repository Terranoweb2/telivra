import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "Terrano <onboarding@resend.dev>";

export async function sendResetCode(to: string, code: string, restaurantName: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${code} — Code de réinitialisation`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:460px;background:#1f2937;border-radius:16px;overflow:hidden">
  <tr><td style="background:#ea580c;padding:24px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${restaurantName}</h1>
  </td></tr>
  <tr><td style="padding:32px 28px">
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">Réinitialisation du mot de passe</p>
    <p style="margin:0 0 24px;color:#e5e7eb;font-size:15px">
      Utilisez ce code pour réinitialiser votre mot de passe. Il expire dans <strong>15 minutes</strong>.
    </p>
    <div style="background:#111827;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px">
      <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#f97316;font-family:monospace">${code}</span>
    </div>
    <p style="margin:0;color:#6b7280;font-size:12px">
      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    </p>
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #374151">
    <p style="margin:0;color:#4b5563;font-size:11px;text-align:center">${restaurantName} — Livraison de repas</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
    });
    console.log(`[Email] Code de reset envoyé à ${to}`);
  } catch (err) {
    console.error(`[Email] Échec envoi reset à ${to}:`, err);
  }
}

export async function sendVerificationCode(to: string, code: string, restaurantName: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${code} — Vérification de votre email`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:460px;background:#1f2937;border-radius:16px;overflow:hidden">
  <tr><td style="background:#ea580c;padding:24px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${restaurantName}</h1>
  </td></tr>
  <tr><td style="padding:32px 28px">
    <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">Bienvenue !</p>
    <p style="margin:0 0 24px;color:#e5e7eb;font-size:15px">
      Merci pour votre inscription. Entrez ce code pour confirmer votre adresse email.
    </p>
    <div style="background:#111827;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px">
      <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#f97316;font-family:monospace">${code}</span>
    </div>
    <p style="margin:0;color:#6b7280;font-size:12px">
      Ce code expire dans 15 minutes.
    </p>
  </td></tr>
  <tr><td style="padding:16px 28px;border-top:1px solid #374151">
    <p style="margin:0;color:#4b5563;font-size:11px;text-align:center">${restaurantName} — Livraison de repas</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
    });
    console.log(`[Email] Code de vérification envoyé à ${to}`);
  } catch (err) {
    console.error(`[Email] Échec envoi vérification à ${to}:`, err);
  }
}

export async function sendNewsletter(
  recipients: string[],
  subject: string,
  htmlContent: string,
  restaurantName: string
): Promise<number> {
  let sent = 0;
  const BATCH_SIZE = 50;

  const wrapHtml = (body: string) => `
<!DOCTYPE html>
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

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    try {
      const emails = batch.map((to) => ({
        from: FROM,
        to,
        subject,
        html: wrapHtml(htmlContent),
      }));
      await resend.batch.send(emails);
      sent += batch.length;
    } catch (err) {
      console.error(`[Email] Échec batch newsletter (index ${i}):`, err);
    }
  }

  console.log(`[Email] Newsletter envoyée: ${sent}/${recipients.length}`);
  return sent;
}

export async function sendTip(to: string, subject: string, bodyHtml: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `💡 ${subject} — Astuce Terrano`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:40px 20px">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#1f2937;border-radius:16px;overflow:hidden">
  <tr><td style="background:#7c3aed;padding:20px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">💡 Astuce Terrano</h1>
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
</body></html>`,
    });
    console.log(`[Email] Astuce envoyée à ${to}`);
  } catch (err) {
    console.error(`[Email] Échec envoi astuce à ${to}:`, err);
  }
}
