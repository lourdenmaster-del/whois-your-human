import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { buildPaidWhoisReport } from "@/lib/free-whois-report";
import { getRegistryArtifactImageUrl, sendPaidWhoisEmail } from "@/lib/email-waitlist-confirmation";
import { killSwitchResponse } from "@/lib/api-kill-switch";

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

  const result = await sendPaidWhoisEmail(email, report);

  if (result.sent) {
    log("info", "beauty_profile_email_sent", { requestId, reportId });
    return successResponse(200, { delivered: true }, requestId);
  }

  if (result.reason === "provider_key_missing") {
    return errorResponse(500, "EMAIL_NOT_CONFIGURED", requestId);
  }

  return errorResponse(500, "EMAIL_SEND_FAILED", requestId);
}
