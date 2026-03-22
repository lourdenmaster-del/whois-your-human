import Stripe from "stripe";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { stripeTestModeRequired } from "@/lib/runtime-mode";
import { killSwitchResponse } from "@/lib/api-kill-switch";

export async function POST(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/stripe/create-checkout-session" });

  try {
    let body: { reportId?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "INVALID_BODY", requestId);
    }

    const reportId = typeof body?.reportId === "string" ? body.reportId.trim() : "";

    if (!reportId) {
      log("warn", "checkout_missing_report_id", { requestId });
      return errorResponse(400, "MISSING_REPORT_ID", requestId);
    }
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId);
    if (!uuidLike) {
      log("warn", "checkout_invalid_report_id_format", { requestId, reportIdPrefix: reportId.slice(0, 12) });
      return errorResponse(400, "INVALID_REPORT_ID", requestId);
    }

    if (process.env.NODE_ENV !== "production") {
      log("info", "checkout_report_id_received", { requestId, reportId });
    }

    try {
      await loadBeautyProfileV1(reportId, requestId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message === "BEAUTY_PROFILE_NOT_FOUND") {
        log("info", "checkout_attempt", { requestId, reportId, result: "BEAUTY_PROFILE_NOT_FOUND" });
        return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
      }
      log("error", "checkout_attempt", { requestId, reportId, result: "BEAUTY_PROFILE_READ_FAILED" });
      return errorResponse(500, "BEAUTY_PROFILE_READ_FAILED", requestId);
    }

    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      return errorResponse(500, "STRIPE_NOT_CONFIGURED", requestId);
    }

    if (stripeTestModeRequired && secretKey.startsWith("sk_live_")) {
      log("error", "stripe_live_key_in_non_prod", { requestId });
      return errorResponse(500, "STRIPE_LIVE_KEY_NOT_ALLOWED_IN_DEV", requestId);
    }

    const origin =
      process.env.VERCEL_URL != null
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin;

    const stripe = new Stripe(secretKey);

    const successUrl = `${origin}/whois/success?session_id={CHECKOUT_SESSION_ID}`;
    const metadata: Record<string, string> = { reportId };

    if (process.env.NODE_ENV !== "production") {
      log("info", "checkout_stripe_metadata", { requestId, reportId, metadataKeys: Object.keys(metadata) });
    }

    const productData = {
      name: "Mint registry record",
      description:
        "Mints your WHOIS record and provides an entitlement token for agent-readable calibration via API. One-time.",
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: productData,
              unit_amount: 99, // $0.99 — temporary live test; revert to 3999 for production
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: `${origin}/whois/cancel`,
        metadata,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log("error", "stripe_checkout_session_failed", { requestId, message });
      return NextResponse.json(
        { error: "STRIPE_ERROR", message },
        { status: 500 }
      );
    }

    log("info", "stage", {
      requestId,
      reportId,
      stage: "stripe_session_created",
      testMode: secretKey.startsWith("sk_test_"),
    });
    if (process.env.NODE_ENV !== "production") {
      log("info", "checkout_session_metadata_written", { requestId, reportId, sessionId: session.id });
    }

    return successResponse(200, { url: session.url }, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("error", "create_checkout_session_internal", { requestId, message });
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 }
    );
  }
}
