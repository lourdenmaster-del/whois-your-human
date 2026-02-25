/**
 * GET /api/report/[reportId]
 * Reads from the same storage and key format the engine uses when persisting:
 * - Blob: ligs-reports/{reportId}.json (see reportBlobPathname in report-store)
 * - Memory: memoryStore[reportId]
 * The returned reportId in the URL matches the stored record key.
 *
 * Reserved segments "previews" and "debug" are handled by sibling routes;
 * if the dynamic route catches them (e.g. in some deployments), delegate.
 */

import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { getReport, getStorageInfo } from "@/lib/report-store";
import { GET as previewsGet } from "../previews/route";
import { GET as debugGet } from "../debug/route";

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

  if (reportId === "previews") return previewsGet(request);
  if (reportId === "debug") return debugGet(request);

  const report = await getReport(reportId);
  const reportKeys = report ? Object.keys(report) : [];
  const fullReportLen = report?.full_report != null ? String(report.full_report).length : undefined;
  log("info", "report_get_diag", {
    requestId,
    reportId,
    keys: reportKeys,
    full_report_length: fullReportLen,
  });
  if (!report) {
    const url = new URL(request.url);
    const withDebug = url.searchParams.get("debug") === "1" || process.env.NODE_ENV === "development";
    const body: { error: string; code?: string; _debug?: object } = {
      error: "Report not found",
      code: "REPORT_NOT_FOUND",
    };
    if (withDebug) {
      body._debug = {
        requestedReportId: reportId,
        ...getStorageInfo(),
        hint: "Check GET /api/report/debug for where reports are stored. Use the reportId returned from POST /api/engine.",
      };
    }
    log("warn", "REPORT_NOT_FOUND", {
      requestId,
      reportId,
      status: 404,
      path: `/api/report/${reportId}`,
    });
    return NextResponse.json(body, { status: 404 });
  }

  const responsePayload = {
    full_report: report.full_report,
    emotional_snippet: report.emotional_snippet,
    image_prompts: report.image_prompts,
    ...(report.vector_zero != null && { vector_zero: report.vector_zero }),
  };
  if (responsePayload.full_report == null || String(responsePayload.full_report).length < 500) {
    log("warn", "report_response_empty_full_report", {
      requestId,
      reportId,
      responseKeys: Object.keys(responsePayload),
      full_report_length: responsePayload.full_report != null ? String(responsePayload.full_report).length : undefined,
    });
  }
  return successResponse(200, responsePayload, requestId);
}
