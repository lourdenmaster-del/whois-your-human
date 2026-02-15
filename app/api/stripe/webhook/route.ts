import { NextResponse } from "next/server";
import Stripe from "stripe";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/stripe/webhook" });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return errorResponse(500, "STRIPE_NOT_CONFIGURED", requestId);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return errorResponse(400, "INVALID_STRIPE_SIGNATURE", requestId);
  }

  if (event.type !== "checkout.session.completed") {
    return successResponse(200, { received: true }, requestId);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const reportId = typeof session.metadata?.reportId === "string" ? session.metadata.reportId.trim() : "";
  const email = typeof session.customer_details?.email === "string" ? session.customer_details.email.trim() : "";

  if (!reportId) {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }
  if (!email) {
    return errorResponse(400, "MISSING_EMAIL", requestId);
  }

  try {
    await loadBeautyProfileV1(reportId, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "BEAUTY_PROFILE_NOT_FOUND") {
      return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
    }
    throw e;
  }

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;
  const emailUrl = `${origin}/api/email/send-beauty-profile`;

  log("info", "stage", { requestId, stage: "email_delivery_start" });
  const res = await fetch(emailUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId, email }),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
  if (res.status !== 200 || json?.status !== "ok") {
    return errorResponse(res.status >= 400 ? res.status : 500, json?.error ?? "EMAIL_SEND_FAILED", requestId);
  }
  log("info", "stage", { requestId, stage: "email_delivery_end" });

  log("info", "purchase_complete", { requestId, reportId });

  return successResponse(200, { received: true }, requestId);
}
