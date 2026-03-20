/**
 * GET /api/status
 * Returns whether the production API kill-switch is enabled.
 * Used by the frontend to hide/disable sensitive actions (no broken UX).
 * In development, always returns disabled: false so Studio and forms stay usable.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const isDev = process.env.NODE_ENV === "development";
  const disabled =
    !isDev &&
    (process.env.LIGS_API_OFF === "1" || process.env.LIGS_API_OFF === "true");
  return NextResponse.json({ disabled });
}
