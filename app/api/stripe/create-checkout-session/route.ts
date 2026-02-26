import Stripe from "stripe";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { stripeTestModeRequired } from "@/lib/runtime-mode";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/stripe/create-checkout-session" });

  let body: { reportId?: string; prePurchase?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_BODY", requestId);
  }

  const reportId = typeof body?.reportId === "string" ? body.reportId.trim() : "";
  const prePurchase = body?.prePurchase === true || (!reportId && body?.reportId === undefined);

  if (!prePurchase && !reportId) {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }

  if (!prePurchase) {
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

  const successUrl = `${origin}/beauty/success?session_id={CHECKOUT_SESSION_ID}`;
  const metadata: Record<string, string> = prePurchase
    ? { prePurchase: "1" }
    : { reportId };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Light Signature",
            description: "Shareable Light Signature card, 3 signature images, full narrative report.",
          },
          unit_amount: 3999, // $39.99 in cents
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: `${origin}/beauty/cancel`,
    metadata,
  });

  log("info", "stage", {
    requestId,
    reportId: reportId || "(pre-purchase)",
    stage: "stripe_session_created",
    testMode: secretKey.startsWith("sk_test_"),
  });

  return successResponse(200, { url: session.url }, requestId);
}
