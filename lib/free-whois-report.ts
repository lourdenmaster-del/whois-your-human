/**
 * Shared free WHOIS report — single source of truth for the free registry record.
 * Used by: (1) waitlist confirmation email, (2) landing in-page report (same HTML).
 * Do NOT create a second template; email and free report render from renderFreeWhoisReport(report).
 *
 * Solar Segment = canonical 12-part solar-physics season (sun longitude → segment index).
 * Archetype Classification = archetype resolved from that segment. Cosmic analogue from that archetype.
 */

import { generateLirId } from "@/src/ligs/marketing/identity-spec";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { approximateSunLongitudeFromDate } from "@/lib/terminal-intake/approximateSunLongitude";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { getVectorZeroImageUrl } from "@/lib/vector-zero-assets";

/**
 * Solar Segment names: 12 equal 30° segments with boundaries shifted +15° so equinox/solstice names are centered on anchor points.
 * Index = floor(((lon % 360 + 360) % 360 + 15) % 360 / 30). Windows: 345°–15° March Equinox, 15°–45° Early-Spring, … 315°–345° Late-Winter.
 */
const CANONICAL_SOLAR_SEGMENT_NAMES: readonly string[] = [
  "March Equinox",     // 0
  "Early-Spring",      // 1
  "Mid-Spring",        // 2
  "June Solstice",     // 3
  "Early-Summer",      // 4
  "Mid-Summer",        // 5
  "September Equinox", // 6
  "Early-Autumn",      // 7
  "Mid-Autumn",        // 8
  "December Solstice", // 9
  "Early-Winter",      // 10
  "Late-Winter",       // 11
];

export interface FreeWhoisReportData {
  email: string;
  created_at: string;
  name?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  preview_archetype?: string;
  solar_season?: string;
  source?: string;
}

export interface FreeWhoisReport {
  registryId: string;
  registryStatus: string;
  created_at: string;
  recordAuthority: string;
  name: string;
  birthDate: string;
  birthLocation: string;
  birthTime: string;
  solarSignature: string;
  archetypeClassification: string;
  cosmicAnalogue: string;
  /** Set by caller (e.g. waitlist route) via getRegistryArtifactImageUrl(archetypeClassification, email). Rendered exactly once in renderFreeWhoisReport(). */
  artifactImageUrl?: string;
}

const DEFAULT_SITE_URL = "https://ligs.io";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the canonical free WHOIS report object from intake/waitlist data.
 * Solar Segment and Archetype Classification from canonical solar resolution (sun longitude → segment index → segment name + getPrimaryArchetypeFromSolarLongitude). Fallback to preview_archetype only when birthDate missing or unparseable. Cosmic analogue from getCosmicAnalogue(archetype).phenomenon.
 * Caller should set report.artifactImageUrl when sending email (e.g. getRegistryArtifactImageUrl).
 */
export function buildFreeWhoisReport(data: FreeWhoisReportData): FreeWhoisReport {
  const created_at = data.created_at?.trim() || new Date().toISOString();
  const seed = `wl-${created_at}-${(data.email || "").toLowerCase()}`;
  const registryId = generateLirId(seed);

  let solarSegmentName = "—";
  let archetypeClassification = data.preview_archetype?.trim() ?? "—";

  const rawBirthDate = data.birthDate?.trim().slice(0, 10);
  if (rawBirthDate) {
    const lon = approximateSunLongitudeFromDate(rawBirthDate);
    if (lon != null) {
      const normalized = ((lon % 360) + 360) % 360;
      const shifted = (normalized + 15) % 360;
      const seasonIndex = Math.floor(shifted / 30);
      const name = CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex];
      if (name) solarSegmentName = name;
      archetypeClassification = getPrimaryArchetypeFromSolarLongitude(lon);
    }
  }

  const archForCosmic: LigsArchetype =
    archetypeClassification && archetypeClassification !== "—"
      ? (archetypeClassification as LigsArchetype)
      : "Ignispectrum";
  const cosmicAnalogue = getCosmicAnalogue(archForCosmic).phenomenon;

  return {
    registryId,
    registryStatus: "Registered",
    created_at,
    recordAuthority: "LIGS Human Identity Registry",
    name: data.name?.trim() ?? "—",
    birthDate: data.birthDate?.trim() ?? "—",
    birthLocation: data.birthPlace?.trim() ?? "—",
    birthTime: data.birthTime?.trim() ?? "—",
    solarSignature: solarSegmentName,
    archetypeClassification,
    cosmicAnalogue,
  };
}

const MONO_STYLE =
  "font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:#1a1a1a;line-height:1.5;";

function row(label: string, value: string): string {
  return `    <tr><td style="padding:2px 10px 2px 0;vertical-align:top;${MONO_STYLE}">${escapeHtml(label)}</td><td style="padding:2px 0;${MONO_STYLE}color:#333;">${escapeHtml(value)}</td></tr>`;
}

/**
 * Render the free WHOIS report as HTML. Same artifact for email and landing.
 * Includes: LIGS logo, header (LIGS HUMAN WHOIS REGISTRY / Identity Registration Record),
 * REGISTRATION LOG table, identity record table, artifact image, footer.
 */
export function renderFreeWhoisReport(
  report: FreeWhoisReport,
  options?: { siteUrl?: string }
): string {
  const siteUrl = (options?.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  const logoUrl = `${siteUrl}/brand/logo.svg`;
  const imgUrl =
    report.artifactImageUrl && report.artifactImageUrl.length > 0
      ? report.artifactImageUrl
      : "";

  const createdDateDisplay = report.created_at.slice(0, 10);

  const registrationLogRows = [
    row("Registry Status", report.registryStatus),
    row("Created Date", createdDateDisplay),
    row("Record Authority", report.recordAuthority),
    row("Registry ID", report.registryId),
  ].join("\n");

  const recordRows = [
    row("Subject Name", report.name),
    row("Birth Date", report.birthDate),
    row("Birth Location", report.birthLocation),
    row("Birth Time", report.birthTime),
    row("Solar Segment", report.solarSignature),
    row("Archetype Classification", report.archetypeClassification),
    row("Cosmic analogue", report.cosmicAnalogue),
  ].join("\n");

  const artifactBlock =
    imgUrl &&
    `
    <div style="margin:28px 0;text-align:center;">
      <img src="${escapeHtml(imgUrl)}" alt="Registry artifact" width="400" height="400" style="max-width:100%;height:auto;display:block;margin:0 auto;" />
    </div>`;

  const vectorZeroImageUrl = getVectorZeroImageUrl(report.archetypeClassification, siteUrl);
  const vectorZeroImageBlock =
    vectorZeroImageUrl
      ? `<div style="margin:20px 0;text-align:center;"><img src="${escapeHtml(vectorZeroImageUrl)}" alt="Vector Zero" width="400" height="400" style="max-width:100%;height:auto;display:block;margin:0 auto;" /></div>`
      : "";

  const sectionHeading =
    "margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#1a1a1a;";
  const sectionBody = "margin:0 0 16px 0;font-size:13px;color:#333;line-height:1.5;";

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
      <div style="margin-bottom:12px;">
        <img src="${escapeHtml(logoUrl)}" alt="LIGS" width="80" height="40" style="display:block;height:40px;width:auto;" />
      </div>
      <h1 style="margin:0;font-size:14px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1a1a1a;">LIGS HUMAN WHOIS REGISTRY</h1>
      <p style="margin:6px 0 0 0;font-size:12px;color:#444;">Identity Registration Record</p>
    </header>

    <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#1a1a1a;">REGISTRATION LOG</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0">
${registrationLogRows}
    </table>

    <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#1a1a1a;">Human WHOIS Registry Record</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0">
${recordRows}
    </table>

    <p style="margin:0 0 24px 0;font-size:14px;color:#333;">You now have access to the Human WHOIS registry. Full node analytics will become available when the registry opens.</p>
${artifactBlock || ""}

    <p style="${sectionHeading}">IDENTITY ARCHITECTURE</p>
    <p style="${sectionBody}">The registry identifies a stable identity structure arising within the total field of forces present at birth.</p>

    <p style="${sectionHeading}">FIELD CONDITIONS</p>
    <p style="${sectionBody}">Classification emerges from field conditions and force structure at the birth event.</p>

    <p style="${sectionHeading}">ARCHETYPE EXPRESSION</p>
    <p style="${sectionBody}">Archetype Classification: ${escapeHtml(report.archetypeClassification)}</p>

    <p style="${sectionHeading}">COSMIC TWIN RELATION</p>
    <p style="${sectionBody}">Cosmic analogue: ${escapeHtml(report.cosmicAnalogue)}</p>

    <p style="${sectionHeading}">INTERPRETIVE NOTES</p>
    <p style="${sectionBody}">Expanded interpretive sections ship with the complete registration report.</p>

    <p style="${sectionHeading}">VECTOR ZERO</p>
    <p style="${sectionBody}">Vector Zero is the structural origin point of the archetype. It represents the directional bias the identity system takes when interacting with the world. In LIGS, Vector Zero marks the starting geometry from which behavior, coherence, and environmental interaction unfold.</p>
    ${vectorZeroImageBlock}

    <p style="margin:24px 0 0 0;font-size:13px;">
      <a href="${escapeHtml(siteUrl)}" style="color:#1a1a1a;text-decoration:underline;">Return to the registry</a>
    </p>

    <footer style="margin-top:40px;padding-top:16px;border-top:1px solid #e8e8e8;font-size:11px;color:#666;">
      <p style="margin:0;">LIGS Systems</p>
      <p style="margin:4px 0 0 0;">This message was generated automatically by the registry.</p>
    </footer>

    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e0e0e0;">
      <p style="${sectionHeading}">OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO</p>
      <p style="${sectionBody}">As an early registry participant, your record has been expanded with an additional identity layer now cleared for release: Vector Zero.</p>
      <p style="${sectionBody}">Vector Zero is the structural origin point of the archetype. It represents the directional bias the identity system takes when interacting with the world. In LIGS, Vector Zero marks the starting geometry from which behavior, coherence, and environmental interaction unfold.</p>
      <p style="${sectionBody}">Archetype Classification: ${escapeHtml(report.archetypeClassification)}</p>
      ${vectorZeroImageBlock}
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Plain-text version of the free WHOIS report (for email multipart).
 */
export function renderFreeWhoisReportText(
  report: FreeWhoisReport,
  options?: { siteUrl?: string }
): string {
  const siteUrl = (options?.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
  const createdDateDisplay = report.created_at.slice(0, 10);
  const lines: string[] = [
    "LIGS HUMAN WHOIS REGISTRY",
    "Identity Registration Record",
    "",
    "REGISTRATION LOG",
    "",
    "Registry Status: " + report.registryStatus,
    "Created Date: " + createdDateDisplay,
    "Record Authority: " + report.recordAuthority,
    "Registry ID: " + report.registryId,
    "",
    "Human WHOIS Registry Record",
    "",
    "Subject Name: " + report.name,
    "Birth Date: " + report.birthDate,
    "Birth Location: " + report.birthLocation,
    "Birth Time: " + report.birthTime,
    "Solar Segment: " + report.solarSignature,
    "Archetype Classification: " + report.archetypeClassification,
    "Cosmic analogue: " + report.cosmicAnalogue,
    "",
    "You now have access to the Human WHOIS registry. Full node analytics will become available when the registry opens.",
    "",
    "IDENTITY ARCHITECTURE",
    "The registry identifies a stable identity structure arising within the total field of forces present at birth.",
    "",
    "FIELD CONDITIONS",
    "Classification emerges from field conditions and force structure at the birth event.",
    "",
    "ARCHETYPE EXPRESSION",
    "Archetype Classification: " + report.archetypeClassification,
    "",
    "COSMIC TWIN RELATION",
    "Cosmic analogue: " + report.cosmicAnalogue,
    "",
    "INTERPRETIVE NOTES",
    "Expanded interpretive sections ship with the complete registration report.",
    "",
    "VECTOR ZERO",
    "Vector Zero is the structural origin point of the archetype. It represents the directional bias the identity system takes when interacting with the world. In LIGS, Vector Zero marks the starting geometry from which behavior, coherence, and environmental interaction unfold.",
    ...(getVectorZeroImageUrl(report.archetypeClassification, siteUrl)
      ? ["", "Vector Zero image: " + getVectorZeroImageUrl(report.archetypeClassification, siteUrl)]
      : []),
    "",
    "Return to the registry: " + siteUrl,
    "",
    "LIGS Systems",
    "This message was generated automatically by the registry.",
    "",
    "OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO",
    "",
    "As an early registry participant, your record has been expanded with an additional identity layer now cleared for release: Vector Zero.",
    "",
    "Vector Zero is the structural origin point of the archetype. It represents the directional bias the identity system takes when interacting with the world. In LIGS, Vector Zero marks the starting geometry from which behavior, coherence, and environmental interaction unfold.",
    "",
    "Archetype Classification: " + report.archetypeClassification,
    ...(getVectorZeroImageUrl(report.archetypeClassification, siteUrl)
      ? ["", "Vector Zero image: " + getVectorZeroImageUrl(report.archetypeClassification, siteUrl)]
      : []),
  ];
  return lines.join("\n");
}
