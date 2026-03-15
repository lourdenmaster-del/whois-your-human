import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { buildPaidWhoisReport } from "@/lib/free-whois-report";
import { renderFreeWhoisReport, renderFreeWhoisReportText } from "@/lib/free-whois-report";
import { getRegistryArtifactImageUrl } from "@/lib/email-waitlist-confirmation";
import { killSwitchResponse } from "@/lib/api-kill-switch";

const DEFAULT_FROM = "LIGS Registry <onboarding@resend.dev>";

export async function POST(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
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

  let report;
  try {
    report = await buildPaidWhoisReport({ reportId, requestId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      message === "PAID_WHOIS_REPORT_NOT_FOUND" ||
      message === "BEAUTY_PROFILE_NOT_FOUND" ||
      message === "BEAUTY_PROFILE_PARSE_FAILED" ||
      message === "BEAUTY_PROFILE_SCHEMA_MISMATCH"
    ) {
      return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
    }
    throw e;
  }

  report.artifactImageUrl = getRegistryArtifactImageUrl(report.archetypeClassification, email);

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const siteUrl = origin.replace(/\/$/, "");
  const subject = "Your Light Identity Report";
  const html = renderFreeWhoisReport(report, { siteUrl });
  const text = renderFreeWhoisReportText(report, { siteUrl });

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
        from: from.includes("<") ? from : `LIGS Registry <${from}>`,
        to: [email],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      log("error", "Resend send failed", { requestId, status: res.status, error: err });
      return errorResponse(500, "EMAIL_SEND_FAILED", requestId);
    }
  } else if (sendgridKey) {
    const fromEmail = from.includes("<") ? from.replace(/^[^<]*<([^>]+)>$/, "$1").trim() : from;
    const fromName = from.includes("<") ? from.replace(/\s*<[^>]+>$/, "").trim() : "LIGS Registry";
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }], subject }],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: "text/html", value: html },
          { type: "text/plain", value: text },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      log("error", "SendGrid send failed", { requestId, status: res.status, error: err });
      return errorResponse(500, "EMAIL_SEND_FAILED", requestId);
    }
  }

  log("info", "stage", { requestId, stage: "email_send_end" });
  log("info", "beauty_profile_email_sent", { requestId, reportId });

  return successResponse(200, { delivered: true }, requestId);
}
