/**
 * POST /api/dev/verify-saved
 * Dev-only: verifies that a report was saved to Blob (or memory).
 * Used by LIGS Studio "Verify saved to Blob" button.
 */

import { NextResponse } from "next/server";
import { getReport, getStorageInfo, reportBlobPathname } from "@/lib/report-store";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, reason: "verify-saved is dev-only; not available in production" },
      { status: 403 }
    );
  }

  let body: { reportId?: string };
  try {
    body = (await request.json()) as { reportId?: string };
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const reportId = body?.reportId;
  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json(
      { ok: false, reason: "Missing reportId" },
      { status: 400 }
    );
  }

  if (reportId.startsWith("UNSAVED:")) {
    return NextResponse.json({
      ok: false,
      reason: "unsaved",
      reportId,
      message: "Report was never saved to storage (Blob write failed).",
    });
  }

  const storageInfo = getStorageInfo();
  const report = await getReport(reportId);
  const reportKey = report ? reportBlobPathname(reportId) : undefined;

  if (!report) {
    return NextResponse.json({
      ok: false,
      reason: "not_found",
      reportId,
      storage: storageInfo.storage,
      message: "Report not found in storage.",
    });
  }

  const fullReportLen =
    report.full_report != null ? String(report.full_report).length : 0;

  return NextResponse.json({
    ok: true,
    reportFound: true,
    reportId,
    storage: storageInfo.storage,
    keys: reportKey ? [reportKey] : [],
    full_report_length: fullReportLen,
    blobKey: storageInfo.storage === "blob" ? reportKey : undefined,
  });
}
