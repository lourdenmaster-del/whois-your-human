import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import { log } from "@/lib/log";
import { resolvePaidIocUnlockFromCheckoutSession } from "@/lib/ioc/ioc-paid-checkout-session";

export async function GET(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;

  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/ioc/verify-session" });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("ioc_checkout_session")?.trim();
  if (!sessionId) {
    return errorResponse(400, "MISSING_SESSION_ID", requestId);
  }

  const resolved = await resolvePaidIocUnlockFromCheckoutSession(sessionId);

  if (!resolved.ok) {
    switch (resolved.reason) {
      case "STRIPE_NOT_CONFIGURED":
        return errorResponse(500, "STRIPE_NOT_CONFIGURED", requestId);
      case "STRIPE_LIVE_KEY_NOT_ALLOWED_IN_DEV":
        log("error", "stripe_live_key_in_non_prod", { requestId });
        return errorResponse(500, "STRIPE_LIVE_KEY_NOT_ALLOWED_IN_DEV", requestId);
      case "INVALID_ARCHETYPE_METADATA":
        log("warn", "ioc_verify_bad_archetype", { requestId, sessionId });
        return NextResponse.json(
          { ok: false, paid: false, error: "INVALID_SESSION_METADATA" },
          { status: 200 }
        );
      case "RETRIEVE_FAILED":
        log("error", "ioc_verify_failed", {
          requestId,
          sessionId,
          message: resolved.message,
        });
        return NextResponse.json({ ok: false, error: "VERIFY_FAILED" }, { status: 200 });
      case "NOT_PAID":
      case "NOT_IOC_UNLOCK":
      default:
        return NextResponse.json({ ok: false, paid: false }, { status: 200 });
    }
  }

  log("info", "ioc_verify_ok", { requestId, sessionId });
  log("info", "ioc_generate_full", {
    endpoint: "/api/ioc/verify-session",
    path: "human",
    success: true,
    archetype: resolved.archetype,
  });
  return NextResponse.json(
    { ok: true, paid: true, archetype: resolved.archetype, iocFull: resolved.iocFull },
    { status: 200 }
  );
}
