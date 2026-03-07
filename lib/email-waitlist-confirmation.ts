/**
 * LIGS early registry confirmation email.
 * Subject: "Your identity query has been logged"
 * Body: LIGS system voice.
 */

const DEFAULT_FROM = "LIGS <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://ligs.io";

export function buildWaitlistConfirmationHtml(): string {
  const body = `
Your contact node has been recorded.

You are now part of the LIGS early registry.

Early registry entries advance through identity tiers at a higher rate than later participants.

Your full identity resolution will become available soon.

Run another query anytime:
${escapeHtml(SITE_URL)}
`.trim();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your identity query has been logged</title></head>
<body style="font-family:Georgia,serif;line-height:1.6;color:#1a1a1a;max-width:480px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 1em 0;">Your contact node has been recorded.</p>
  <p style="margin:0 0 1em 0;">You are now part of the LIGS early registry.</p>
  <p style="margin:0 0 1em 0;">Early registry entries advance through identity tiers at a higher rate than later participants.</p>
  <p style="margin:0 0 1em 0;">Your full identity resolution will become available soon.</p>
  <p style="margin:0 0 1em 0;">Run another query anytime:<br><a href="${escapeHtml(SITE_URL)}" style="color:#7A4FFF;">${escapeHtml(SITE_URL)}</a></p>
</body>
</html>`.trim();
}

export async function sendWaitlistConfirmation(email: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  if (!resendKey && !sendgridKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[waitlist] RESEND_API_KEY and SENDGRID_API_KEY not set — skipping confirmation email");
    }
    return false;
  }

  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const subject = "Your identity query has been logged";
  const html = buildWaitlistConfirmationHtml();

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from.includes("<") ? from : `LIGS <${from}>`,
        to: [email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[waitlist] Resend confirmation failed:", res.status, err);
      return false;
    }
    return true;
  }

  const fromEmail = from.includes("<") ? from.replace(/^[^<]*<([^>]+)>$/, "$1").trim() : from;
  const fromName = from.includes("<") ? from.replace(/\s*<[^>]+>$/, "").trim() : "LIGS";
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }], subject }],
      from: { email: fromEmail, name: fromName },
      content: [{ type: "text/html", value: html }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[waitlist] SendGrid confirmation failed:", res.status, err);
    return false;
  }
  return true;
}
