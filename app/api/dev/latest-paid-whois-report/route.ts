/**
 * GET /api/dev/latest-paid-whois-report
 * Dev-only: finds the most recent reportId from Blob beauty profiles (Studio Test Paid Report),
 * loads BeautyProfileV1, runs buildPaidWhoisReport, returns profile fields + plain-text paid WHOIS.
 * Query: ?reportId=xxx to use a specific reportId instead of "most recent".
 */

import { NextResponse } from "next/server";
import {
  listBlobBeautyProfilesSorted,
  BLOB_BEAUTY_PREFIX,
} from "@/lib/report-store";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import {
  buildPaidWhoisReport,
  renderFreeWhoisReportText,
} from "@/lib/free-whois-report";

function reportIdFromPathname(pathname: string): string {
  if (pathname.startsWith(BLOB_BEAUTY_PREFIX)) {
    const suffix = pathname.slice(BLOB_BEAUTY_PREFIX.length);
    return suffix.replace(/\.json$/i, "");
  }
  return pathname.replace(/\.json$/i, "");
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "latest-paid-whois-report is dev-only" },
      { status: 403 }
    );
  }

  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const reportIdParam = url.searchParams.get("reportId");

  let reportId: string;

  if (reportIdParam?.trim()) {
    reportId = reportIdParam.trim();
  } else {
    const sorted = await listBlobBeautyProfilesSorted(1);
    if (sorted.length === 0) {
      return NextResponse.json(
        {
          error: "NO_BEAUTY_PROFILES",
          message:
            "No beauty profiles in Blob. Run Studio 'Test Paid Report (safe / no image cost)' first.",
        },
        { status: 404 }
      );
    }
    reportId = reportIdFromPathname(sorted[0].pathname);
  }

  try {
    const profile = await loadBeautyProfileV1(reportId, requestId);
    const report = await buildPaidWhoisReport({ reportId, requestId });
    const paidWhoisText = renderFreeWhoisReportText(report);

    const profileFields = {
      subjectName: profile.subjectName ?? null,
      birthDate: report.birthDate ?? null,
      birthTime: report.birthTime ?? null,
      birthLocation: report.birthLocation ?? null,
    };

    return NextResponse.json({
      reportId,
      profileFields,
      paidWhoisText,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      message === "BEAUTY_PROFILE_NOT_FOUND" ||
      message === "PAID_WHOIS_REPORT_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: message, reportId, message: "Profile or report not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "BUILD_FAILED", reportId, message },
      { status: 500 }
    );
  }
}
