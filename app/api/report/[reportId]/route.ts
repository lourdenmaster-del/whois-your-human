import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { getReport, getStorageInfo } from "@/lib/report-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { reportId } = await params;
  log("info", "request", { requestId, method: "GET", path: `/api/report/${reportId ?? ""}` });
  if (!reportId) {
    log("warn", "validation failed", { requestId, error: "Missing reportId" });
    return errorResponse(400, "Missing reportId", requestId);
  }

  const report = await getReport(reportId);
  if (!report) {
    const url = new URL(request.url);
    const withDebug = url.searchParams.get("debug") === "1" || process.env.NODE_ENV === "development";
    const body: { error: string; _debug?: object } = { error: "Report not found" };
    if (withDebug) {
      body._debug = {
        requestedReportId: reportId,
        ...getStorageInfo(),
        hint: "Check GET /api/report/debug for where reports are stored. Use the reportId returned from POST /api/engine.",
      };
    }
    log("info", "response", { requestId, status: 404 });
    return NextResponse.json(body, { status: 404 });
  }

  return successResponse(
    200,
    {
      full_report: report.full_report,
      emotional_snippet: report.emotional_snippet,
      image_prompts: report.image_prompts,
      ...(report.vector_zero != null && { vector_zero: report.vector_zero }),
    },
    requestId
  );
}
