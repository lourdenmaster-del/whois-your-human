/**
 * Waitlist signup — Blob-backed with duplicate check and confirmation email.
 * Path: ligs-waitlist/entries/{sha256(email).slice(0,32)}.json
 *
 * POST /api/waitlist
 * Body: { email: string, source?: string, birthDate?: string, preview_archetype?: string, solar_season?: string }
 *
 * When birthDate (YYYY-MM-DD) is provided, preview_archetype and solar_season are computed server-side.
 * Duplicate emails return 200 { ok, alreadyRegistered, confirmationSent, confirmationReason, report } — report is authoritative for landing Solar Segment display.
 * New signups: insert then send; confirmationSent/confirmationReason reflect email outcome only — registration already persisted.
 *
 * Response shape (success paths):
 * - ok: boolean
 * - alreadyRegistered: boolean (true = duplicate, no insert)
 * - confirmationSent: boolean
 * - confirmationReason: sent | duplicate_skipped | provider_key_missing | blob_not_configured | provider_rejected | provider_error
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitKey } from "@/lib/waitlist-rate-limit";
import { insertWaitlistEntry, getWaitlistEntryByEmail, recordConfirmationSent } from "@/lib/waitlist-store";
import { getWaitlistCount } from "@/lib/waitlist-list";
import { sendWaitlistConfirmation, getRegistryArtifactImageUrl } from "@/lib/email-waitlist-confirmation";
import { buildFreeWhoisReport, enrichReportChrono } from "@/lib/free-whois-report";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { SOLAR_SEASONS } from "@/src/ligs/astronomy/solarSeason";

/** Resend cooldown for duplicate-path: allow resend after this many ms since last send. */
const RESEND_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Machine-readable why confirmation was or was not sent. */
export type WaitlistConfirmationReason =
  | "sent"
  | "duplicate_skipped"
  | "duplicate_resent"
  | "duplicate_recently_sent"
  | "provider_key_missing"
  | "blob_not_configured"
  | "provider_rejected"
  | "provider_error";

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
    console.warn(
      "[waitlist] structured reason=blob_not_configured blob_insert=n/a duplicate=n/a to=n/a"
    );
    return NextResponse.json(
      {
        error: "Waitlist not configured",
        ok: false,
        alreadyRegistered: false,
        confirmationSent: false,
        confirmationReason: "blob_not_configured" satisfies WaitlistConfirmationReason,
      },
      { status: 503 }
    );
  }

  let body: {
    email?: string;
    source?: string;
    birthDate?: string;
    preview_archetype?: string;
    solar_season?: string;
    name?: string;
    birthPlace?: string;
    birthTime?: string;
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

  /** Optional intake fields — persisted when provided; omitted when empty. */
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 128)
      : undefined;
  const birthDateRaw =
    typeof body.birthDate === "string" && body.birthDate.trim()
      ? body.birthDate.trim().slice(0, 64)
      : undefined;
  const birthPlace =
    typeof body.birthPlace === "string" && body.birthPlace.trim()
      ? body.birthPlace.trim().slice(0, 256)
      : undefined;
  const birthTime =
    typeof body.birthTime === "string" && body.birthTime.trim()
      ? body.birthTime.trim().slice(0, 64)
      : undefined;

  if (birthDateRaw) {
    const lon = approximateSunLongitudeFromDate(birthDateRaw);
    if (lon != null) {
      const archetype = getPrimaryArchetypeFromSolarLongitude(lon);
      preview_archetype = archetype;
      const seasonIndex = Math.min(Math.floor(lon / 30), 11);
      const entry = SOLAR_SEASONS[seasonIndex];
      // Use archetype name only for email (e.g. "Fluxionis") so template never shows "(none)" when anchorType is "none".
      solar_season = entry ? entry.archetype : archetype;
    }
  }
  // When client sent preview_archetype but no birthDate (or solar_season not computed), pass archetype as solar segment for email.
  if (preview_archetype && !solar_season) {
    solar_season = preview_archetype;
  }

  try {
    const result = await insertWaitlistEntry({
      email,
      source,
      ...(preview_archetype && { preview_archetype }),
      ...(solar_season && { solar_season }),
      ...(name && { name }),
      ...(birthDateRaw && { birthDate: birthDateRaw }),
      ...(birthPlace && { birthPlace }),
      ...(birthTime && { birthTime }),
    });

    if (result.alreadyRegistered) {
      const entry = await getWaitlistEntryByEmail(email);
      if (!entry) {
        console.log(
          "[waitlist] structured reason=duplicate_skipped blob_insert=skipped duplicate=true to=" +
            maskEmail(email)
        );
        const report = buildFreeWhoisReport({
          email,
          created_at: new Date().toISOString(),
          source,
          ...(preview_archetype && { preview_archetype }),
          ...(solar_season && { solar_season }),
          ...(name && { name }),
          ...(birthDateRaw && { birthDate: birthDateRaw }),
          ...(birthPlace && { birthPlace }),
          ...(birthTime && { birthTime }),
        });
        report.vectorZeroRotationIndex = ((await getWaitlistCount()) - 1) % 4;
        await enrichReportChrono(report);
        return NextResponse.json({
          ok: true,
          alreadyRegistered: true,
          confirmationSent: false,
          confirmationReason: "duplicate_skipped" satisfies WaitlistConfirmationReason,
          report,
        });
      }
      const lastSentAt = entry.last_confirmation_sent_at;
      const withinCooldown =
        lastSentAt &&
        (Date.now() - new Date(lastSentAt).getTime() < RESEND_COOLDOWN_MS);
      if (withinCooldown) {
        console.log(
          "[waitlist] structured reason=duplicate_recently_sent duplicate=true to=" + maskEmail(email)
        );
        const payloadSolarSeasonCooldown =
          (entry.solar_season?.trim().replace(/\s*\(none\)$/i, "")?.trim()) ||
          entry.preview_archetype ||
          undefined;
        const report = buildFreeWhoisReport({
          email: entry.email,
          created_at: entry.created_at,
          source: entry.source,
          ...(entry.preview_archetype && { preview_archetype: entry.preview_archetype }),
          ...(payloadSolarSeasonCooldown && { solar_season: payloadSolarSeasonCooldown }),
          ...(entry.name && { name: entry.name }),
          ...((entry.birthDate || birthDateRaw) && { birthDate: entry.birthDate || birthDateRaw }),
          ...(entry.birthPlace && { birthPlace: entry.birthPlace }),
          ...(entry.birthTime && { birthTime: entry.birthTime }),
        });
        report.vectorZeroRotationIndex = ((await getWaitlistCount()) - 1) % 4;
        await enrichReportChrono(report);
        return NextResponse.json({
          ok: true,
          alreadyRegistered: true,
          confirmationSent: false,
          confirmationReason: "duplicate_recently_sent" satisfies WaitlistConfirmationReason,
          report,
        });
      }
      let dupConfirmationSent = false;
      let dupConfirmationReason: WaitlistConfirmationReason = "duplicate_skipped";
      const payloadSolarSeason =
        (entry.solar_season?.trim().replace(/\s*\(none\)$/i, "")?.trim()) ||
        entry.preview_archetype ||
        undefined;
      const report = buildFreeWhoisReport({
        email: entry.email,
        created_at: entry.created_at,
        source: entry.source,
        ...(entry.preview_archetype && { preview_archetype: entry.preview_archetype }),
        ...(payloadSolarSeason && { solar_season: payloadSolarSeason }),
        ...(entry.name && { name: entry.name }),
        ...((entry.birthDate || birthDateRaw) && { birthDate: entry.birthDate || birthDateRaw }),
        ...(entry.birthPlace && { birthPlace: entry.birthPlace }),
        ...(entry.birthTime && { birthTime: entry.birthTime }),
      });
      report.artifactImageUrl = getRegistryArtifactImageUrl(report.archetypeClassification, entry.email);
      report.vectorZeroRotationIndex = ((await getWaitlistCount()) - 1) % 4;
      await enrichReportChrono(report);
      try {
        const sendResult = await sendWaitlistConfirmation(entry.email, report);
        dupConfirmationSent = sendResult.sent;
        dupConfirmationReason = sendResult.sent
          ? ("duplicate_resent" satisfies WaitlistConfirmationReason)
          : (sendResult.reason as WaitlistConfirmationReason);
        if (sendResult.sent) await recordConfirmationSent(email);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        dupConfirmationSent = false;
        dupConfirmationReason = "provider_error";
        console.error(
          "[waitlist] structured reason=provider_error duplicate_resend to=" +
            maskEmail(email) +
            " error=" +
            msg.slice(0, 120)
        );
      }
      console.log(
        "[waitlist] structured reason=" +
          dupConfirmationReason +
          " duplicate=true confirmationSent=" +
          dupConfirmationSent +
          " to=" +
          maskEmail(email)
      );
      return NextResponse.json({
        ok: true,
        alreadyRegistered: true,
        confirmationSent: dupConfirmationSent,
        confirmationReason: dupConfirmationReason,
        report,
      });
    }

    const createdAt = new Date().toISOString();
    console.log("[waitlist] entry_received to=" + maskEmail(email));

    const report = buildFreeWhoisReport({
      email,
      created_at: createdAt,
      source,
      ...(preview_archetype && { preview_archetype }),
      ...(solar_season && { solar_season }),
      ...(name && { name }),
      ...(birthDateRaw && { birthDate: birthDateRaw }),
      ...(birthPlace && { birthPlace }),
      ...(birthTime && { birthTime }),
    });
    report.artifactImageUrl = getRegistryArtifactImageUrl(report.archetypeClassification, email);
    report.vectorZeroRotationIndex = ((await getWaitlistCount()) - 1) % 4;
    await enrichReportChrono(report);

    let confirmationSent = false;
    let confirmationReason: WaitlistConfirmationReason = "provider_key_missing";

    try {
      const sendResult = await sendWaitlistConfirmation(email, report);
      confirmationSent = sendResult.sent;
      confirmationReason = sendResult.reason as WaitlistConfirmationReason;
      if (sendResult.sent) await recordConfirmationSent(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      confirmationSent = false;
      confirmationReason = "provider_error";
      console.error(
        "[waitlist] structured reason=provider_error blob_insert=ok duplicate=false to=" +
          maskEmail(email) +
          " error=" +
          msg.slice(0, 120)
      );
    }

    console.log(
      "[waitlist] structured reason=" +
        confirmationReason +
        " blob_insert=ok duplicate=false confirmationSent=" +
        confirmationSent +
        " to=" +
        maskEmail(email)
    );

    return NextResponse.json({
      ok: true,
      alreadyRegistered: false,
      confirmationSent,
      confirmationReason,
      report,
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
}
