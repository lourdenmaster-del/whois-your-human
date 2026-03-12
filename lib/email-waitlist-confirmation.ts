/**
 * LIGS waitlist confirmation email — white-paper registry notice.
 * Subject: "Your identity query has been logged"
 * Body: Document-style notice, one artifact image, minimal CTA.
 * Image: recipient's resolved archetype (deterministic from email + preview_archetype); fallback Ignis.
 *
 * Sender verification:
 * - Resend: Default FROM (onboarding@resend.dev) is allowed without verification. Custom domain/address must be verified in Resend dashboard.
 * - SendGrid: The FROM address (or domain) must be a verified sender identity in SendGrid. Unverified sender causes reject or non-delivery.
 *
 * PRODUCTION CHECKLIST (confirmation email sends):
 * - BLOB_READ_WRITE_TOKEN — required in /api/waitlist before insert (not in this module).
 * - RESEND_API_KEY or SENDGRID_API_KEY — required; otherwise send skipped with reason provider_key_missing.
 * - EMAIL_FROM — optional; unverified sender causes provider_rejected.
 * - NEXT_PUBLIC_SITE_URL or VERCEL_URL — optional; fallback https://ligs.io for absolute artifact URLs in HTML.
 */

/** Result of sendWaitlistConfirmation — machine-readable reason for API/client observability. */
export type WaitlistConfirmationResult = {
  sent: boolean;
  reason: "sent" | "provider_key_missing" | "provider_rejected" | "provider_error";
};

import { IGNIS_V1_ARTIFACTS } from "@/lib/exemplar-store";
import {
  getArchetypePublicAssetUrlWithRotation,
  getArchetypePublicAssetUrls,
} from "@/lib/archetype-public-assets";

const DEFAULT_FROM = "LIGS <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SITE_URL =
  (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL.trim()) ||
  (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL.trim()
    ? `https://${process.env.VERCEL_URL}`
    : "") ||
  "https://ligs.io";

export interface WaitlistConfirmationPayload {
  created_at?: string;
  preview_archetype?: string;
  solar_season?: string;
}

/** Deterministic seed for registry email artifact selection. Same person + archetype → same image. */
const REGISTRY_EMAIL_ARTIFACT_SEED_SUFFIX = ":registry-email";

/**
 * Resolve the best registry artifact image URL for the recipient.
 * Order: (1) Ignis uses v1 share card; (2) other archetypes use public shareCard with rotation; (3) exemplarCard if no shareCard; (4) fallback Ignis v1 share card.
 */
export function getRegistryArtifactImageUrl(
  preview_archetype: string | undefined,
  email: string
): string {
  const fallback = IGNIS_V1_ARTIFACTS.finalBeautyField;

  const raw = preview_archetype?.trim();
  if (!raw) return fallback;

  const archetype = normalizeArchetypeKey(raw);
  if (!archetype) return fallback;

  if (archetype === "Ignispectrum") return IGNIS_V1_ARTIFACTS.finalBeautyField;

  const seed = `${email}:${archetype}${REGISTRY_EMAIL_ARTIFACT_SEED_SUFFIX}`;
  const shareCard = getArchetypePublicAssetUrlWithRotation(archetype, "shareCard", seed);
  if (shareCard) return toAbsoluteUrl(shareCard);
  const urls = getArchetypePublicAssetUrls(archetype);
  if (urls?.shareCard) return toAbsoluteUrl(urls.shareCard);
  if (urls?.exemplarCard) return toAbsoluteUrl(urls.exemplarCard);
  return fallback;
}

function normalizeArchetypeKey(raw: string): string | null {
  if (ARCHETYPE_KEYS[raw as keyof typeof ARCHETYPE_KEYS]) return raw;
  const lower = raw.toLowerCase();
  const found = Object.keys(ARCHETYPE_KEYS).find((k) => k.toLowerCase() === lower);
  return found ?? null;
}

const ARCHETYPE_KEYS: Record<string, true> = {
  Aequilibris: true,
  Duplicaris: true,
  Fluxionis: true,
  Ignispectrum: true,
  Innovaris: true,
  Obscurion: true,
  Precisura: true,
  Radiantis: true,
  Stabiliora: true,
  Structoris: true,
  Tenebris: true,
  Vectoris: true,
};

function toAbsoluteUrl(path: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function buildWaitlistConfirmationHtml(
  payload?: WaitlistConfirmationPayload | null,
  artifactImageUrl?: string
): string {
  const created_at = payload?.created_at ?? new Date().toISOString();
  const preview_archetype = payload?.preview_archetype?.trim();
  const solar_season = payload?.solar_season?.trim();

  const facts: string[] = [
    "Registry Status: Confirmed",
    "Contact Node: Active",
    "Record Type: Human Identity Query",
    `Timestamp: ${escapeHtml(created_at)}`,
  ];
  if (preview_archetype) facts.push(`Preview Archetype: ${escapeHtml(preview_archetype)}`);
  if (solar_season) facts.push(`Solar Segment: ${escapeHtml(solar_season)}`);

  const factsHtml = facts
    .map((line) => {
      const idx = line.indexOf(": ");
      const label = idx >= 0 ? line.slice(0, idx) + ":" : line;
      const value = idx >= 0 ? line.slice(idx + 2) : "";
      return `    <tr><td style="padding:4px 12px 4px 0;vertical-align:top;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:#1a1a1a;">${escapeHtml(label)}</td><td style="padding:4px 0;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:#333;">${escapeHtml(value)}</td></tr>`;
    })
    .join("\n");

  const imgUrl =
    artifactImageUrl && artifactImageUrl.length > 0
      ? artifactImageUrl
      : IGNIS_V1_ARTIFACTS.finalBeautyField;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your identity query has been logged</title>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:Georgia,serif;color:#1a1a1a;line-height:1.5;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <header style="border-bottom:1px solid #e0e0e0;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:14px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1a1a1a;">LIGS HUMAN WHOIS REGISTRY</h1>
      <p style="margin:6px 0 0 0;font-size:12px;color:#444;">Registry confirmation notice</p>
    </header>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
${factsHtml}
    </table>

    <p style="margin:0 0 24px 0;font-size:14px;color:#333;">Your contact node has been recorded in the LIGS Human WHOIS Registry. Full identity reports will be released to registry members first.</p>

    <div style="margin:28px 0;text-align:center;">
      <img src="${escapeHtml(imgUrl)}" alt="Registry artifact" width="400" height="400" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
    </div>

    <p style="margin:24px 0 0 0;font-size:13px;">
      <a href="${escapeHtml(SITE_URL)}" style="color:#1a1a1a;text-decoration:underline;">Return to the registry</a>
    </p>

    <footer style="margin-top:40px;padding-top:16px;border-top:1px solid #e8e8e8;font-size:11px;color:#666;">
      <p style="margin:0;">LIGS Systems</p>
      <p style="margin:4px 0 0 0;">This message was generated automatically by the registry.</p>
    </footer>
  </div>
</body>
</html>`.trim();
}

export function buildWaitlistConfirmationText(payload?: WaitlistConfirmationPayload | null): string {
  const created_at = payload?.created_at ?? new Date().toISOString();
  const preview_archetype = payload?.preview_archetype?.trim();
  const solar_season = payload?.solar_season?.trim();

  const lines: string[] = [
    "LIGS HUMAN WHOIS REGISTRY",
    "Registry confirmation notice",
    "",
    "Registry Status: Confirmed",
    "Contact Node: Active",
    "Record Type: Human Identity Query",
    `Timestamp: ${created_at}`,
  ];
  if (preview_archetype) lines.push(`Preview Archetype: ${preview_archetype}`);
  if (solar_season) lines.push(`Solar Segment: ${solar_season}`);
  lines.push(
    "",
    "Your contact node has been recorded in the LIGS Human WHOIS Registry. Full identity reports will be released to registry members first.",
    "",
    `Return to the registry: ${SITE_URL}`,
    "",
    "LIGS Systems",
    "This message was generated automatically by the registry."
  );
  return lines.join("\n");
}

export async function sendWaitlistConfirmation(
  email: string,
  payload?: WaitlistConfirmationPayload | null
): Promise<WaitlistConfirmationResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();

  /** Mask for logs only — never log API keys. */
  const maskedTo =
    email.length > 4 ? email.charAt(0) + "***@" + (email.split("@")[1] ?? "") : "***";

  if (!resendKey && !sendgridKey) {
    console.warn(
      "[waitlist] confirmation provider=none reason=provider_key_missing to=" +
        maskedTo +
        " from_attempt=n/a"
    );
    return { sent: false, reason: "provider_key_missing" };
  }

  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const subject = "Your identity query has been logged";
  const artifactImageUrl = getRegistryArtifactImageUrl(payload?.preview_archetype, email);
  const html = buildWaitlistConfirmationHtml(payload, artifactImageUrl);
  const text = buildWaitlistConfirmationText(payload);

  if (resendKey) {
    const fromValue = from.includes("<") ? from : `LIGS <${from}>`;
    const fromForLog = fromValue.replace(/</g, "").replace(/>/g, "");
    console.log(
      "[waitlist] confirmation provider_selected=resend to=" +
        maskedTo +
        " from_attempt=" +
        fromForLog
    );
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromValue,
        to: [email],
        subject,
        html,
        text,
      }),
    });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        "[waitlist] confirmation provider=resend reason=provider_error to=" +
          maskedTo +
          " from_attempt=" +
          fromForLog +
          " error=" +
          msg.slice(0, 120)
      );
      return { sent: false, reason: "provider_error" };
    }
    const bodyText = await res.text();
    let bodyJson: { id?: string } | null = null;
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      // ignore
    }
    if (res.ok) {
      console.log(
        "[waitlist] confirmation reason=sent provider=resend to=" +
          maskedTo +
          " from=" +
          fromForLog +
          " status=" +
          res.status +
          (bodyJson?.id ? " id=" + bodyJson.id : "")
      );
      return { sent: true, reason: "sent" };
    }
    console.error(
      "[waitlist] confirmation reason=provider_rejected provider=resend to=" +
        maskedTo +
        " from=" +
        fromForLog +
        " status=" +
        res.status +
        " body=" +
        bodyText.slice(0, 200)
    );
    return { sent: false, reason: "provider_rejected" };
  }

  console.log(
    "[waitlist] confirmation provider_selected=sendgrid to=" +
      maskedTo +
      " from_attempt=" +
      (from.includes("<") ? from.replace(/^[^<]*<([^>]+)>$/, "$1").trim() : from)
  );

  const fromEmail = from.includes("<") ? from.replace(/^[^<]*<([^>]+)>$/, "$1").trim() : from;
  const fromName = from.includes("<") ? from.replace(/\s*<[^>]+>$/, "").trim() : "LIGS";
  let res: Response;
  try {
    res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }], subject }],
      from: { email: fromEmail, name: fromName },
      content: [
        { type: "text/html", value: html },
        { type: "text/plain", value: text },
      ],
    }),
  });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(
      "[waitlist] confirmation reason=provider_error provider=sendgrid to=" +
        maskedTo +
        " from=" +
        fromEmail +
        " error=" +
        msg.slice(0, 120)
    );
    return { sent: false, reason: "provider_error" };
  }
  const bodyText = await res.text();
  if (res.ok) {
    console.log(
      "[waitlist] confirmation reason=sent provider=sendgrid to=" +
        maskedTo +
        " from=" +
        fromEmail +
        " status=" +
        res.status
    );
    return { sent: true, reason: "sent" };
  }
  console.error(
    "[waitlist] confirmation reason=provider_rejected provider=sendgrid to=" +
      maskedTo +
      " from=" +
      fromEmail +
      " status=" +
      res.status +
      " body=" +
      bodyText.slice(0, 200)
  );
  return { sent: false, reason: "provider_rejected" };
}
