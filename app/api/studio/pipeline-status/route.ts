/**
 * GET /api/studio/pipeline-status — Auth-protected paid-flow / delivery signals for Studio.
 * Same gate as /api/waitlist/list: when LIGS_STUDIO_TOKEN is set, requires ligs_studio cookie.
 * Returns env-derived flags only (no secrets).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isStudioProtected, verifyStudioAccess, COOKIE_NAME } from "@/lib/studio-auth";
import { stripeTestModeRequired } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";

function stripeMode(): "test" | "live" | "missing" {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return "missing";
}

export async function GET() {
  if (isStudioProtected()) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? null;
    if (!verifyStudioAccess(cookieValue)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const resend = process.env.RESEND_API_KEY?.trim();
  const sendgrid = process.env.SENDGRID_API_KEY?.trim();
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  return NextResponse.json({
    stripeConfigured: Boolean(stripeSecret),
    stripeMode: stripeMode(),
    stripeWebhookSecretConfigured: Boolean(stripeWebhookSecret),
    stripeTestModeRequired,
    emailConfigured: Boolean(resend || sendgrid),
    blobConfigured: Boolean(blobToken),
    ligsApiOff:
      process.env.LIGS_API_OFF === "1" || process.env.LIGS_API_OFF === "true",
    waitlistOnly: process.env.NEXT_PUBLIC_WAITLIST_ONLY !== "0",
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
}
