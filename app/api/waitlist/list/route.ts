/**
 * GET /api/waitlist/list — Internal admin only.
 * Returns waitlist entries, metrics, source breakdown.
 * When LIGS_STUDIO_TOKEN is set, requires cookie (set via POST /api/studio-auth) or 403.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isStudioProtected, verifyStudioAccess, COOKIE_NAME } from "@/lib/studio-auth";
import { listWaitlistEntries } from "@/lib/waitlist-list";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isStudioProtected()) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? null;
    if (!verifyStudioAccess(cookieValue)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const hasToken =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;

  if (!hasToken) {
    return NextResponse.json(
      { error: "Waitlist storage not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await listWaitlistEntries();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[waitlist/list]", msg);
    return NextResponse.json(
      { error: "Failed to list waitlist entries" },
      { status: 500 }
    );
  }
}
