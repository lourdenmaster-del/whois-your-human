/**
 * Waitlist signup — zero-dependency capture using Vercel Blob.
 * Persists each signup as a JSON file under ligs-waitlist/.
 * Does NOT trigger image generation, Stripe, or engine calls.
 *
 * POST /api/waitlist
 * Body: { email: string, source?: string, ref?: string }
 *
 * Test with curl:
 *   curl -X POST http://localhost:3000/api/waitlist \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"test@example.com","source":"beauty"}'
 */

import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { checkRateLimit, getRateLimitKey } from "@/lib/waitlist-rate-limit";

const BLOB_PREFIX = "ligs-waitlist/";

/** Simple email validation — basic regex, keep it minimal. */
function isValidEmail(email: string): boolean {
  if (typeof email !== "string" || email.length > 254) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/** Mask email for logging (e.g. "t***@example.com"). */
function maskEmail(email: string): string {
  if (!email || email.length < 5) return "***";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local!.charAt(0) + "***";
  return `${masked}@${domain}`;
}

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const rateKey = getRateLimitKey(req);
  const { allowed, retryAfter } = checkRateLimit(rateKey);
  if (!allowed) {
    const res = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
    if (typeof retryAfter === "number" && retryAfter > 0) {
      res.headers.set("Retry-After", String(retryAfter));
    }
    return res;
  }

  const hasBlobToken =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;

  if (!hasBlobToken) {
    return NextResponse.json(
      { error: "Waitlist not configured" },
      { status: 503 }
    );
  }

  let body: { email?: string; source?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const raw = typeof body.email === "string" ? body.email : "";
  const email = raw.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  const source = typeof body.source === "string" ? body.source.slice(0, 64) : "beauty";
  const ref = typeof body.ref === "string" ? body.ref.slice(0, 256) : undefined;

  const userAgent = req.headers.get("user-agent") ?? undefined;
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ipHint = (forwarded ?? realIp ?? "").split(",")[0]?.trim() || undefined;

  const iso = new Date().toISOString().replace(/:/g, "-");
  const random = randomBytes(6).toString("hex");
  const pathname = `${BLOB_PREFIX}${iso}_${random}.json`;

  const payload = {
    email,
    createdAt: new Date().toISOString(),
    source,
    ...(ref && { ref }),
    ...(userAgent && { userAgent }),
    ...(ipHint && { ipHint }),
  };

  try {
    await put(pathname, JSON.stringify(payload, null, 0), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("[waitlist] Blob write failed:", msg);
    } else {
      console.error("[waitlist] Blob write failed:", maskEmail(email), msg.slice(0, 80));
    }
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
