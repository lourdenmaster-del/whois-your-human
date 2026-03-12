/**
 * POST /api/waitlist/reset — Internal operator only.
 * Deletes the waitlist blob entry for the given email (exact normalized match).
 * Same protection as GET /api/waitlist/list: cookie when LIGS_STUDIO_TOKEN set.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isStudioProtected, verifyStudioAccess, COOKIE_NAME } from "@/lib/studio-auth";
import { deleteWaitlistEntryByEmail } from "@/lib/waitlist-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = typeof body.email === "string" ? body.email : "";
  const email = raw.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    const { deleted, email: normalized } = await deleteWaitlistEntryByEmail(email);
    console.log(
      "[waitlist/reset] operator deleted=" + deleted + " to=" + (normalized.length > 4 ? normalized.charAt(0) + "***@" + normalized.split("@")[1] : "***")
    );
    return NextResponse.json({ ok: true, deleted, email: normalized });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[waitlist/reset]", msg.slice(0, 120));
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
