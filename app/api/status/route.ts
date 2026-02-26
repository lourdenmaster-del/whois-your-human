/**
 * GET /api/status
 * Returns whether the production API kill-switch is enabled.
 * Used by the frontend to hide/disable sensitive actions (no broken UX).
 */

import { NextResponse } from "next/server";

export async function GET() {
  const disabled =
    process.env.LIGS_API_OFF === "1" || process.env.LIGS_API_OFF === "true";
  return NextResponse.json({ disabled });
}
