import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    await rateLimit(request, "beauty_view", 20, 60_000);
  } catch {
    return errorResponse(429, "RATE_LIMIT_EXCEEDED", requestId);
  }

  const { reportId } = await params;
  log("info", "request", {
    requestId,
    route: "/api/beauty/[reportId]",
    reportId: reportId ?? "",
  });

  if (!reportId) {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }

  try {
    const profile = await loadBeautyProfileV1(reportId, requestId);
    return successResponse(200, profile, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "BEAUTY_PROFILE_NOT_FOUND") {
      return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
    }
    if (message === "BEAUTY_PROFILE_PARSE_FAILED" || message === "BEAUTY_PROFILE_SCHEMA_MISMATCH") {
      return errorResponse(500, message, requestId);
    }
    return errorResponse(500, "BEAUTY_PROFILE_READ_FAILED", requestId);
  }
}
