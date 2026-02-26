/**
 * GET /api/dev/preflight
 * Dev-only: runs preflight checks for live Beauty pipeline.
 * Returns PASS/FAIL with reasons.
 */

import { NextResponse } from "next/server";
import { runPreflight } from "@/lib/preflight";

export async function GET() {
  const allowPreview = process.env.ALLOW_PREVIEW_LIVE_TEST === "1" || process.env.ALLOW_PREVIEW_LIVE_TEST === "true";
  if (process.env.NODE_ENV === "production" && !allowPreview) {
    return NextResponse.json(
      { error: "Preflight is dev-only" },
      { status: 403 }
    );
  }

  const result = runPreflight();
  return NextResponse.json(result);
}
