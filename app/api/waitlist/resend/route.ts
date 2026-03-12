/**
 * POST /api/waitlist/resend — Internal operator only.
 * Resends waitlist confirmation email for an existing entry (same module as /api/waitlist).
 * Same protection as GET /api/waitlist/list.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isStudioProtected, verifyStudioAccess, COOKIE_NAME } from "@/lib/studio-auth";
import { getWaitlistEntryByEmail } from "@/lib/waitlist-store";
import { sendWaitlistConfirmation } from "@/lib/email-waitlist-confirmation";

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

  const entry = await getWaitlistEntryByEmail(email);
  if (!entry) {
    return NextResponse.json(
      { ok: false, error: "Entry not found", email },
      { status: 404 }
    );
  }

  try {
    const sendResult = await sendWaitlistConfirmation(entry.email, {
      created_at: entry.created_at,
      ...(entry.preview_archetype && { preview_archetype: entry.preview_archetype }),
      ...(entry.solar_season && { solar_season: entry.solar_season }),
    });
    return NextResponse.json({
      ok: true,
      confirmationSent: sendResult.sent,
      confirmationReason: sendResult.reason,
      email: entry.email,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[waitlist/resend]", msg.slice(0, 120));
    return NextResponse.json(
      {
        ok: true,
        confirmationSent: false,
        confirmationReason: "provider_error",
        email: entry.email,
      },
      { status: 200 }
    );
  }
}
