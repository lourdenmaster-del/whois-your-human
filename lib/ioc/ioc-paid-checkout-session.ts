import Stripe from "stripe";
import { isIocArchetypeKey } from "@/lib/ioc/archetype-from-birthdate";
import { getIocTextForArchetype } from "@/lib/ioc/ioc-map";
import { normalizeIocBlockForClipboard } from "@/lib/ioc/ioc-split";
import { stripeTestModeRequired } from "@/lib/runtime-mode";

/** Merge IOC checkout metadata from Session and expanded PaymentIntent. */
export function mergeIocCheckoutMeta(session: Stripe.Checkout.Session): {
  ioc_unlock?: string;
  archetype?: string;
} {
  const fromSession = session.metadata ?? {};
  let fromPi: Record<string, string> = {};
  const pi = session.payment_intent;
  if (pi && typeof pi === "object" && !("deleted" in pi)) {
    fromPi = (pi as Stripe.PaymentIntent).metadata ?? {};
  }
  return {
    ioc_unlock: fromSession.ioc_unlock ?? fromPi.ioc_unlock,
    archetype: fromSession.archetype ?? fromPi.archetype,
  };
}

export type PaidIocCheckoutFailureReason =
  | "MISSING_SESSION_ID"
  | "STRIPE_NOT_CONFIGURED"
  | "STRIPE_LIVE_KEY_NOT_ALLOWED_IN_DEV"
  | "NOT_PAID"
  | "NOT_IOC_UNLOCK"
  | "INVALID_ARCHETYPE_METADATA"
  | "RETRIEVE_FAILED";

export type PaidIocCheckoutResult =
  | { ok: true; archetype: string; iocFull: string }
  | { ok: false; reason: PaidIocCheckoutFailureReason; message?: string };

/**
 * Shared Stripe Checkout verification for IOC unlock (paid full block).
 * Same rules as GET /api/ioc/verify-session.
 */
export async function resolvePaidIocUnlockFromCheckoutSession(
  sessionId: string | null | undefined
): Promise<PaidIocCheckoutResult> {
  const trimmed = sessionId?.trim();
  if (!trimmed) {
    return { ok: false, reason: "MISSING_SESSION_ID" };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return { ok: false, reason: "STRIPE_NOT_CONFIGURED" };
  }

  if (stripeTestModeRequired && secretKey.startsWith("sk_live_")) {
    return { ok: false, reason: "STRIPE_LIVE_KEY_NOT_ALLOWED_IN_DEV" };
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(trimmed, {
      expand: ["payment_intent"],
    });

    const paid =
      session.status === "complete" ||
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";

    if (!paid) {
      return { ok: false, reason: "NOT_PAID" };
    }

    const meta = mergeIocCheckoutMeta(session);
    if (meta.ioc_unlock !== "1") {
      return { ok: false, reason: "NOT_IOC_UNLOCK" };
    }

    const arch = typeof meta.archetype === "string" ? meta.archetype.trim() : "";
    if (!arch || !isIocArchetypeKey(arch)) {
      return { ok: false, reason: "INVALID_ARCHETYPE_METADATA" };
    }

    const iocFull = normalizeIocBlockForClipboard(getIocTextForArchetype(arch));
    return { ok: true, archetype: arch, iocFull };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "RETRIEVE_FAILED", message };
  }
}
