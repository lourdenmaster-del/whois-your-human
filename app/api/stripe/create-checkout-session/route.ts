import { NextResponse } from "next/server";
import Stripe from "stripe";
import { errorResponse } from "@/lib/api-response";
import { log } from "@/lib/log";
import { successResponse } from "@/lib/success-response";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  log("info", "request", { requestId, route: "/api/stripe/create-checkout-session" });

  let body: { reportId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }

  const reportId = typeof body?.reportId === "string" ? body.reportId.trim() : "";
  if (!reportId) {
    return errorResponse(400, "MISSING_REPORT_ID", requestId);
  }

  try {
    await loadBeautyProfileV1(reportId, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === "BEAUTY_PROFILE_NOT_FOUND") {
      return errorResponse(404, "BEAUTY_PROFILE_NOT_FOUND", requestId);
    }
    return errorResponse(500, "BEAUTY_PROFILE_READ_FAILED", requestId);
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    return errorResponse(500, "STRIPE_NOT_CONFIGURED", requestId);
  }

  const origin =
    process.env.VERCEL_URL != null
      ? `https://${process.env.VERCEL_URL}`
      : new URL(request.url).origin;

  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Beauty Profile",
            description: "Your E.V.E. Beauty Signature — full report and imagery.",
          },
          unit_amount: 999, // $9.99 in cents
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/beauty/success?reportId=${encodeURIComponent(reportId)}`,
    cancel_url: `${origin}/beauty/cancel`,
    metadata: { reportId },
  });

  log("info", "stage", { requestId, stage: "stripe_session_created" });

  return successResponse(200, { url: session.url }, requestId);
}
