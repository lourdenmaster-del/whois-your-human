/**
 * GET /api/registry/count — Public-safe.
 * Returns { total } — count of reports in ligs-reports/ (humans registered).
 * No auth. No seed.
 */

import { NextResponse } from "next/server";
import { getReportCount } from "@/lib/report-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const total = await getReportCount();
    return NextResponse.json({ total });
  } catch (err) {
    console.error("[registry/count] getReportCount failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ total: 0 });
  }
}
