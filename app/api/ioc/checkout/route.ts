import Stripe from "stripe";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { killSwitchResponse } from "@/lib/api-kill-switch";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { isIocArchetypeKey } from "@/lib/ioc/archetype-from-birthdate";
import { stripeTestModeRequired } from "@/lib/runtime-mode";

export async function POST(request: Request) {
  const kill = killSwitchResponse();
  if (kill) return kill;

  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/ioc/checkout" });

  let body: { archetype?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_BODY", requestId);
  }

  const archetype = typeof body?.archetype === "string" ? body.archetype.trim() : "";
  if (!archetype || !isIocArchetypeKey(archetype)) {
    return errorResponse(400, "INVALID_ARCHETYPE", requestId);
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
    process.env.VERCEL_URL != null ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin;

  const stripe = new Stripe(secretKey);

  const productData = {
    name: "Full Initial Operating Conditions",
    description: "Unlock the complete IOC block for your archetype.",
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: productData,
            unit_amount: 99,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/ioc?ioc_checkout_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/ioc`,
      metadata: {
        ioc_unlock: "1",
        archetype,
      },
      payment_intent_data: {
        metadata: {
          ioc_unlock: "1",
          archetype,
        },
      },
    });

    if (!session.url) {
      return errorResponse(500, "STRIPE_NO_URL", requestId);
    }

    log("info", "ioc_checkout_created", { requestId, sessionId: session.id });
    return successResponse(200, { url: session.url }, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("error", "ioc_checkout_failed", { requestId, message });
    return NextResponse.json({ error: "STRIPE_ERROR", message }, { status: 500 });
  }
}
