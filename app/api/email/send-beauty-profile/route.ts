import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";

const DEFAULT_FROM = "Beauty <onboarding@resend.dev>";

function buildEmailHtml(profile: {
  subjectName?: string;
  emotionalSnippet?: string;
  imageUrls?: string[];
}, viewUrl: string): string {
  const name = profile.subjectName ? `<p><strong>${escapeHtml(profile.subjectName)}</strong></p>` : "";
  const snippet = profile.emotionalSnippet
    ? `<p>${escapeHtml(profile.emotionalSnippet)}</p>`
    : "";
  const link = `<p><a href="${escapeHtml(viewUrl)}">View your full Beauty Profile</a></p>`;
  const img =
    profile.imageUrls?.[0]
      ? `<p><img src="${escapeHtml(profile.imageUrls[0])}" alt="Beauty Profile" width="400" style="max-width:100%;height:auto;" /></p>`
      : "";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Light Identity Report</title></head>
<body style="font-family:sans-serif;line-height:1.5;color:#333;">
  <h1>Your Light Identity Report</h1>
  ${name}
  ${snippet}
  ${link}
  ${img}
</body>
</html>`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/email/send-beauty-profile" });

  let body: { reportId?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }

  const reportId = typeof body?.reportId === "string" ? body.reportId.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!reportId) {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }
  if (!email) {
    return errorResponse(400, "MISSING_EMAIL", requestId);
  }

  let profile;
  try {
    profile = await loadBeautyProfileV1(reportId, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "BEAUTY_PROFILE_NOT_FOUND") {
      return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
    }
    throw e;
  }

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const viewUrl = `${origin}/beauty/view?reportId=${encodeURIComponent(reportId)}`;
  const subject = "Your Light Identity Report";
  const html = buildEmailHtml(
    {
      subjectName: profile.subjectName,
      emotionalSnippet: profile.emotionalSnippet,
      imageUrls: profile.imageUrls,
    },
    viewUrl
  );

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;

  if (!resendKey && !sendgridKey) {
    return errorResponse(500, "EMAIL_NOT_CONFIGURED", requestId);
  }

  log("info", "stage", { requestId, stage: "email_send_start" });

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from.includes("<") ? from : `Beauty <${from}>`,
        to: [email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      log("error", "Resend send failed", { requestId, status: res.status, error: err });
      return errorResponse(500, "EMAIL_SEND_FAILED", requestId);
    }
  } else if (sendgridKey) {
    const fromEmail = from.includes("<") ? from.replace(/^[^<]*<([^>]+)>$/, "$1").trim() : from;
    const fromName = from.includes("<") ? from.replace(/\s*<[^>]+>$/, "").trim() : "Beauty";
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
      log("error", "SendGrid send failed", { requestId, status: res.status, error: err });
      return errorResponse(500, "EMAIL_SEND_FAILED", requestId);
    }
  }

  log("info", "stage", { requestId, stage: "email_send_end" });

  return successResponse(200, { delivered: true }, requestId);
}
