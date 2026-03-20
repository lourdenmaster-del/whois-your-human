import Stripe from "stripe";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { stripeTestModeRequired } from "@/lib/runtime-mode";
import { getAgentEntitlementByReportId } from "@/lib/agent-entitlement-store";
import {
  WYH_CONTENT_GATE_COOKIE,
  wyhContentGateCookieOptions,
} from "@/lib/wyh-content-gate";
import { createEngineExecutionGrant } from "@/lib/engine-execution-grant";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/stripe/verify-session" });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id")?.trim();

  if (!sessionId) {
    return errorResponse(400, "MISSING_SESSION_ID", requestId);
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return errorResponse(500, "STRIPE_NOT_CONFIGURED", requestId);
  }

  if (stripeTestModeRequired && secretKey.startsWith("sk_live_")) {
    log("error", "stripe_live_key_in_non_prod", { requestId });
    return errorResponse(500, "STRIPE_LIVE_KEY_NOT_ALLOWED_IN_DEV", requestId);
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      log("info", "verify_session", { requestId, sessionId, payment_status: session.payment_status });
      return successResponse(200, { paid: false }, requestId);
    }
    const reportId = typeof session.metadata?.reportId === "string" ? session.metadata.reportId.trim() : "";
    const prePurchase = session.metadata?.prePurchase === "1";
    let entitlementToken: string | undefined;
    if (reportId) {
      const entitlement = await getAgentEntitlementByReportId(reportId);
      if (entitlement?.status === "active") {
        entitlementToken = entitlement.token;
      }
    }
    let executionKey: string | undefined;
    try {
      executionKey = await createEngineExecutionGrant({
        stripeSessionId: sessionId,
        ...(reportId ? { reportId } : {}),
        prePurchase,
      });
    } catch (e) {
      log("error", "verify_session_execution_grant", {
        requestId,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    log("info", "verify_session", { requestId, sessionId, paid: true, prePurchase: !!prePurchase });
    const res = successResponse(
      200,
      {
        paid: true,
        reportId: reportId || undefined,
        prePurchase,
        entitlementToken,
        ...(executionKey ? { executionKey } : {}),
      },
      requestId
    );
    res.cookies.set(WYH_CONTENT_GATE_COOKIE, "1", wyhContentGateCookieOptions());
    return res;
  } catch (e) {
    log("error", "verify_session", { requestId, sessionId, error: e instanceof Error ? e.message : String(e) });
    return errorResponse(400, "INVALID_SESSION", requestId);
  }
}
