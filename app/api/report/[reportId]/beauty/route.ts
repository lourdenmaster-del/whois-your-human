import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { getBeautyProfile } from "@/lib/report-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { reportId } = await params;
  log("info", "request", { requestId, method: "GET", path: `/api/report/${reportId ?? ""}/beauty` });
  if (!reportId) {
    log("warn", "validation failed", { requestId, error: "Missing reportId" });
    return errorResponse(400, "Missing reportId", requestId);
  }

  const profile = await getBeautyProfile(reportId);
  if (!profile) {
    return errorResponse(404, "Beauty profile not found", requestId);
  }

  return successResponse(200, profile, requestId);
}
