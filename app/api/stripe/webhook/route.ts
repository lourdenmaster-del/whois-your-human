import Stripe from "stripe";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import { stripeTestModeRequired } from "@/lib/runtime-mode";
import {
  getAgentEntitlementByReportId,
  mintAgentEntitlementToken,
  saveAgentEntitlement,
} from "@/lib/agent-entitlement-store";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/stripe/webhook" });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!webhookSecret || !secretKey) {
    return errorResponse(500, "STRIPE_NOT_CONFIGURED", requestId);
  }

  if (stripeTestModeRequired && secretKey.startsWith("sk_live_")) {
    log("error", "stripe_live_key_in_non_prod", { requestId });
    return errorResponse(500, "STRIPE_LIVE_KEY_NOT_ALLOWED_IN_DEV", requestId);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return errorResponse(400, "INVALID_STRIPE_SIGNATURE", requestId);
  }

  if (event.type !== "checkout.session.completed") {
    return successResponse(200, { received: true }, requestId);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const reportId = typeof session.metadata?.reportId === "string" ? session.metadata.reportId.trim() : "";
  const prePurchase = session.metadata?.prePurchase === "1";

  if (prePurchase) {
    log("info", "purchase_complete", { requestId, type: "pre_purchase" });
    return successResponse(200, { received: true }, requestId);
  }

  const email =
    typeof session.customer_details?.email === "string"
      ? session.customer_details.email.trim()
      : "";

  if (!reportId) {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }

  const checkoutSessionId = session.id;
  log("info", "webhook_checkout_start", {
    requestId,
    trace_marker: "webhook_checkout_start",
    trace_step: 1,
    checkoutSessionId,
    reportId,
    payment_status: session.payment_status,
  });

  try {
    try {
      await loadBeautyProfileV1(reportId, requestId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message === "BEAUTY_PROFILE_NOT_FOUND") {
        return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
      }
      log("error", "webhook_checkout_profile_error", {
        requestId,
        checkoutSessionId,
        reportId,
        message,
      });
      throw e;
    }
    log("info", "webhook_checkout_stage", {
      requestId,
      trace_marker: "after_load_beauty_profile",
      trace_step: 2,
      stage: "after_load_beauty_profile",
      checkoutSessionId,
    });

    const existingEntitlement = await getAgentEntitlementByReportId(reportId);
    if (!existingEntitlement) {
      const token = mintAgentEntitlementToken();
      await saveAgentEntitlement({
        token,
        reportId,
        status: "active",
        createdAt: Date.now(),
        stripeSessionId: session.id,
        ...(email ? { purchaserRef: email } : {}),
      });
      log("info", "agent_entitlement_minted", {
        requestId,
        reportId,
        stripeSessionId: session.id,
        tokenPrefix: token.slice(0, 12),
      });
    }
    log("info", "webhook_checkout_stage", {
      requestId,
      trace_marker: "after_entitlement",
      trace_step: 3,
      stage: "after_entitlement",
      checkoutSessionId,
      hadExistingEntitlement: !!existingEntitlement,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    log("error", "webhook_checkout_unhandled", {
      requestId,
      trace_marker: "webhook_checkout_unhandled",
      checkoutSessionId,
      reportId,
      message,
      stack: stack?.slice(0, 800),
    });
    throw e;
  }

  if (email) {
    const origin =
      process.env.VERCEL_URL != null
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin;
    const emailUrl = `${origin}/api/email/send-beauty-profile`;
    try {
      const emailRes = await fetch(emailUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, email }),
      });
      if (!emailRes.ok) {
        const errText = await emailRes.text();
        log("error", "webhook_post_purchase_email_failed", {
          requestId,
          reportId,
          status: emailRes.status,
          error: errText?.slice(0, 500),
        });
      } else {
        log("info", "webhook_post_purchase_email_sent", { requestId, reportId });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log("error", "webhook_post_purchase_email_error", {
        requestId,
        reportId,
        message,
      });
    }
  }

  log("info", "purchase_complete", { requestId, reportId });

  return successResponse(200, { received: true }, requestId);
}
