/**
 * Waitlist signup — Blob-backed with duplicate check and confirmation email.
 * Path: ligs-waitlist/entries/{sha256(email).slice(0,32)}.json
 *
 * POST /api/waitlist
 * Body: { email: string, source?: string, birthDate?: string, preview_archetype?: string, solar_season?: string }
 *
 * When birthDate (YYYY-MM-DD) is provided, preview_archetype and solar_season are computed server-side.
 * Duplicate emails return 200 { ok: true, alreadyRegistered: true } — no confirmation resend.
 * New signups receive confirmation email via Resend or SendGrid.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/waitlist-rate-limit";
import { insertWaitlistEntry } from "@/lib/waitlist-store";
import { sendWaitlistConfirmation } from "@/lib/email-waitlist-confirmation";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { SOLAR_SEASONS } from "@/src/ligs/astronomy/solarSeason";

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

  let body: {
    email?: string;
    source?: string;
    birthDate?: string;
    preview_archetype?: string;
    solar_season?: string;
  };
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

  let preview_archetype = typeof body.preview_archetype === "string" ? body.preview_archetype.slice(0, 64) : undefined;
  let solar_season = typeof body.solar_season === "string" ? body.solar_season.slice(0, 64) : undefined;

  if (typeof body.birthDate === "string" && body.birthDate.trim()) {
    const lon = approximateSunLongitudeFromDate(body.birthDate.trim());
    if (lon != null) {
      const archetype = getPrimaryArchetypeFromSolarLongitude(lon);
      preview_archetype = archetype;
      const seasonIndex = Math.min(Math.floor(lon / 30), 11);
      const entry = SOLAR_SEASONS[seasonIndex];
      solar_season = entry ? `${entry.archetype} (${entry.anchorType})` : archetype;
    }
  }

  try {
    const result = await insertWaitlistEntry({
      email,
      source,
      ...(preview_archetype && { preview_archetype }),
      ...(solar_season && { solar_season }),
    });

    if (result.alreadyRegistered) {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }

    const createdAt = new Date().toISOString();
    sendWaitlistConfirmation(email, {
      created_at: createdAt,
      ...(preview_archetype && { preview_archetype }),
      ...(solar_season && { solar_season }),
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "development") {
        console.error("[waitlist] Confirmation email failed:", msg);
      } else {
        console.error("[waitlist] Confirmation email failed:", maskEmail(email), msg.slice(0, 80));
      }
    });

    return NextResponse.json({ ok: true, confirmationSent: true });
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
}
