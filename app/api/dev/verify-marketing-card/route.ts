/**
 * GET /api/dev/verify-marketing-card?reportId=X
 * Dev-only: verifies marketing_card blob exists for a report.
 */

import { NextResponse } from "next/server";
import { getImageUrlFromBlob } from "@/lib/report-store";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Verify-marketing-card is dev-only" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId")?.trim();
  if (!reportId) {
    return NextResponse.json(
      { error: "Missing reportId query param" },
      { status: 400 }
    );
  }

  let urlFromBlob: string | null = null;
  try {
    urlFromBlob = await getImageUrlFromBlob(reportId, "marketing_card");
  } catch {
    // ignore
  }

  const exists = !!urlFromBlob;

  return NextResponse.json({
    reportId,
    ok: exists,
    marketingCardUrl: urlFromBlob,
    summary: exists ? "PASS — Marketing card in Blob." : "FAIL — No marketing_card blob for reportId.",
  });
}
