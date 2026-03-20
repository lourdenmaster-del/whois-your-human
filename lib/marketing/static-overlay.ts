/**
 * ONE canonical static overlay for square_card_v1.
 * No branching. No optional steps. Deterministic layer order.
 * Used by /api/image/compose and all compose flows.
 *
 * renderIdentityCardOverlay: scientific identity share card (square_identity_v1).
 * Top-left header, bottom-left identity block, bottom-right system mark.
 */

import sharp from "sharp";
import { getLogoStyleWithDefaults, type MarketingOverlaySpec } from "@/src/ligs/marketing";
import { getIdentityTemplate } from "@/src/ligs/marketing/templates";
import type { IdentityOverlaySpec } from "@/src/ligs/marketing/identity-spec";
import { getArchetypeStaticImagePath } from "@/lib/archetype-static-images";

const ARCHETYPE_IMAGE_CONFIG = {
  centerX: 0.5,
  centerY: 0.56,
  sizePct: 0.32,
  opacity: 0.9,
  glowOpacity: 0.1,
} as const;

const ARCHETYPE_DEBUG_OUTLINE = process.env.NEXT_PUBLIC_GLYPH_DEBUG_OUTLINE === "true" || process.env.NODE_ENV === "development";

const CORNER_CONFIG = { paddingPct: 0.06, widthPct: 0.13, boxOpacity: 0.08, insetPct: 0.005 } as const;

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxCharsPerLine) current = next;
    else {
      if (current) lines.push(current);
      current = w.length <= maxCharsPerLine ? w : w.slice(0, maxCharsPerLine);
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

function createMonogramSvg(spec: MarketingOverlaySpec): Buffer {
  const ls = getLogoStyleWithDefaults(spec.styleTokens.logoStyle);
  const r = 48;
  const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="${r}" fill="${ls.circleFill}" stroke="${ls.circleStroke}" stroke-width="1"/>
  <text x="50" y="58" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" font-weight="${ls.weight}" fill="${ls.fill}">${escapeXml(ls.text)}</text>
</svg>`;
  return Buffer.from(svg);
}

/** Load archetype static image for overlay. Throws on failure. */
async function loadArchetypeImageOverlay(
  markArchetype: string,
  size: number
): Promise<{ buffer: Buffer; rasterDims: { w: number; h: number }; archetypeImagePath: string }> {
  const imagePath = getArchetypeStaticImagePath(markArchetype);
  if (!imagePath) throw new Error(`No static image for archetype: ${markArchetype}`);
  const fs = await import("node:fs/promises");
  const { join } = await import("path");
  const fullPath = join(process.cwd(), "public", imagePath.startsWith("/") ? imagePath.slice(1) : imagePath);
  const pngBuf = await fs.readFile(fullPath);
  const cfg = ARCHETYPE_IMAGE_CONFIG;
  const imgW = Math.round(size * cfg.sizePct);
  const cx = size * cfg.centerX;
  const cy = size * cfg.centerY;
  const tx = Math.round(cx - imgW / 2);
  const ty = Math.round(cy - imgW / 2);
  const resized = await sharp(pngBuf).resize(imgW, imgW).png().toBuffer();
  const b64 = resized.toString("base64");
  const glowR = Math.max(size * 0.28, imgW * 1.2);
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs><radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,180,100,${cfg.glowOpacity})"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#heroGlow)"/>
    <image href="data:image/png;base64,${b64}" x="${tx}" y="${ty}" width="${imgW}" height="${imgW}" opacity="${cfg.opacity}"/>`;
  if (ARCHETYPE_DEBUG_OUTLINE) {
    svg += `<rect x="${tx}" y="${ty}" width="${imgW}" height="${imgW}" fill="none" stroke="magenta" stroke-width="1"/>`;
  }
  svg += "</svg>";
  return { buffer: Buffer.from(svg), rasterDims: { w: imgW, h: imgW }, archetypeImagePath: imagePath };
}

export interface RenderStaticCardOverlayResult {
  buffer: Buffer;
  archetypeVisualUsed: boolean;
  logoUsed: "brand" | "archetype" | "none";
  textRendered: boolean;
  /** Path to archetype static image when markType=archetype. Kept as glyphPath for API backward compat. */
  archetypeImagePath?: string;
  glyphPath?: string;
  rasterDims?: { w: number; h: number };
}

/**
 * ONE canonical overlay. Fixed layer order:
 * 1) background
 * 2) archetype image anchor (when markType=archetype - MANDATORY, throws on load failure)
 * 3) headline + subhead (fill #fff, opacity 1)
 * 4) CTA chip
 * 5) corner mark (brand logo or archetype monogram)
 * 6) signature glow behind archetype image (Ignis only, drawn with corner for archetype)
 */
export async function renderStaticCardOverlay(
  spec: MarketingOverlaySpec,
  backgroundBuffer: Buffer,
  options: {
    size?: number;
    logoBuffer?: Buffer | null;
  } = {}
): Promise<RenderStaticCardOverlayResult> {
  const size = options.size ?? 1024;
  const markType = (spec as { markType?: string }).markType ?? "brand";
  const markArchetype = (spec as { markArchetype?: string }).markArchetype;

  let img = sharp(backgroundBuffer)
    .resize(size, size)
    .extract({ left: 0, top: 0, width: size, height: size });

  let archetypeVisualUsed = false;
  let archetypeImagePath: string | undefined;
  let rasterDims: { w: number; h: number } | undefined;
  if (markType === "archetype" && markArchetype) {
    const overlayResult = await loadArchetypeImageOverlay(markArchetype, size);
    archetypeVisualUsed = true;
    archetypeImagePath = overlayResult.archetypeImagePath;
    rasterDims = overlayResult.rasterDims;
    img = img.composite([{ input: overlayResult.buffer, left: 0, top: 0 }]);
  }

  const tb = spec.placement.textBlock.box;
  const tbPx = {
    x: Math.round(tb.x * size),
    y: Math.round(tb.y * size),
    w: Math.round(tb.w * size),
    h: Math.round(tb.h * size),
  };

  const headlineLines = wrapText(spec.copy.headline ?? "", 25, 2);
  const subheadLines = spec.copy.subhead ? wrapText(spec.copy.subhead, 35, 3) : [];
  const textRendered = headlineLines.length > 0 || subheadLines.length > 0;
  const lineHeight = 48;
  const headlineSize = spec.styleTokens.typography.headlineSize === "xl" ? 56 : 44;
  const subheadSize = spec.styleTokens.typography.subheadSize === "md" ? 32 : 28;
  const centerX = tbPx.x + tbPx.w / 2;
  const scrimRect = `<rect x="${tbPx.x}" y="${tbPx.y}" width="${tbPx.w}" height="${tbPx.h}" fill="rgba(0,0,0,0.45)"/>`;
  const svgParts: string[] = [scrimRect];
  let yOffset = tbPx.y + 36;
  for (const line of headlineLines) {
    svgParts.push(`<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${headlineSize}" font-weight="${spec.styleTokens.typography.weight}" fill="#FFFFFF" opacity="1">${escapeXml(line)}</text>`);
    yOffset += lineHeight;
  }
  for (const line of subheadLines) {
    svgParts.push(`<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${subheadSize}" fill="#FFFFFF" opacity="1">${escapeXml(line)}</text>`);
    yOffset += lineHeight - 8;
  }
  const textSvg = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${svgParts.join("\n")}</svg>`);
  img = img.composite([{ input: textSvg, left: 0, top: 0 }]);

  if (spec.copy.cta && spec.placement.ctaChip) {
    const cc = spec.placement.ctaChip.box;
    const ccPx = { x: Math.round(cc.x * size), y: Math.round(cc.y * size), w: Math.round(cc.w * size), h: Math.round(cc.h * size) };
    const ctaSvg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${ccPx.x}" y="${ccPx.y}" width="${ccPx.w}" height="${ccPx.h}" rx="8" fill="rgba(255,255,255,0.9)"/>
        <text x="${ccPx.x + ccPx.w / 2}" y="${ccPx.y + ccPx.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="24" font-weight="600" fill="#111">${escapeXml(spec.copy.cta)}</text>
      </svg>`
    );
    img = img.composite([{ input: ctaSvg, left: 0, top: 0 }]);
  }

  let logoUsed: "brand" | "archetype" | "none" = "none";
  const { paddingPct, widthPct, boxOpacity, insetPct } = CORNER_CONFIG;
  const paddingPx = Math.round(size * paddingPct);

  if (markType === "archetype") {
    logoUsed = "archetype";
    if (markArchetype) {
      const labelX = paddingPx;
      const labelY = paddingPx + 20;
      const labelSvg = Buffer.from(
        `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <text x="${labelX}" y="${labelY}" font-size="14" font-weight="500" fill="rgba(255,255,255,0.6)">${escapeXml(markArchetype)}</text>
        </svg>`
      );
      img = img.composite([{ input: labelSvg, left: 0, top: 0 }]);
    }
    const monogramBuffer = createMonogramSvg(spec);
    const logoWidthPx = Math.round(size * 0.08);
    const logoHeightPx = logoWidthPx;
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;
    const logoResized = await sharp(monogramBuffer).resize(logoWidthPx, logoHeightPx).png().toBuffer();
    const b64 = logoResized.toString("base64");
    const insetPx = Math.max(2, Math.round(size * insetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxW = logoWidthPx + insetPx * 2;
    const boxH = logoHeightPx + insetPx * 2;
    const logoSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect x="${boxLeft}" y="${boxTop}" width="${boxW}" height="${boxH}" rx="4" fill="rgba(0,0,0,${boxOpacity * 0.5})"/>
      <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="0.85"/>
    </svg>`;
    img = img.composite([{ input: Buffer.from(logoSvg), left: 0, top: 0 }]);
  } else if (options.logoBuffer && options.logoBuffer.length > 0) {
    logoUsed = "brand";
    const logoMeta = await sharp(options.logoBuffer).metadata();
    const origW = logoMeta.width ?? 1;
    const origH = logoMeta.height ?? 1;
    const logoWidthPx = Math.round(size * widthPct);
    const logoHeightPx = Math.round(logoWidthPx * (origH / origW));
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;
    const logoResized = await sharp(options.logoBuffer).resize(logoWidthPx, logoHeightPx).png().toBuffer();
    const b64 = logoResized.toString("base64");
    const insetPx = Math.max(4, Math.round(size * insetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxW = logoWidthPx + insetPx * 2;
    const boxH = logoHeightPx + insetPx * 2;
    const logoSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect x="${boxLeft}" y="${boxTop}" width="${boxW}" height="${boxH}" rx="4" fill="rgba(0,0,0,${boxOpacity})"/>
      <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="0.9"/>
    </svg>`;
    img = img.composite([{ input: Buffer.from(logoSvg), left: 0, top: 0 }]);
  } else {
    logoUsed = "archetype";
    const monogramBuffer = createMonogramSvg(spec);
    const logoWidthPx = Math.round(size * widthPct);
    const logoHeightPx = logoWidthPx;
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;
    const logoResized = await sharp(monogramBuffer).resize(logoWidthPx, logoHeightPx).png().toBuffer();
    const b64 = logoResized.toString("base64");
    const insetPx = Math.max(4, Math.round(size * insetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxW = logoWidthPx + insetPx * 2;
    const boxH = logoHeightPx + insetPx * 2;
    const logoSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect x="${boxLeft}" y="${boxTop}" width="${boxW}" height="${boxH}" rx="4" fill="rgba(0,0,0,${boxOpacity})"/>
      <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="0.9"/>
    </svg>`;
    img = img.composite([{ input: Buffer.from(logoSvg), left: 0, top: 0 }]);
  }

  const buffer = await img.png().toBuffer();
  return {
    buffer,
    archetypeVisualUsed,
    logoUsed,
    textRendered,
    archetypeImagePath,
    glyphPath: archetypeImagePath,
    rasterDims,
  };
}

/** Format ISO timestamp for display: "2026-03-09 12:44 UTC" */
function formatGeneratedTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min} UTC`;
  } catch {
    return iso;
  }
}

/** Load small archetype mark for identity header. Returns null if not available. */
async function loadSmallArchetypeMark(
  markArchetype: string,
  sizePx: number
): Promise<Buffer | null> {
  const imagePath = getArchetypeStaticImagePath(markArchetype);
  if (!imagePath) return null;
  try {
    const fs = await import("node:fs/promises");
    const { join } = await import("path");
    const fullPath = join(process.cwd(), "public", imagePath.startsWith("/") ? imagePath.slice(1) : imagePath);
    const pngBuf = await fs.readFile(fullPath);
    return sharp(pngBuf).resize(sizePx, sizePx).png().toBuffer();
  } catch {
    return null;
  }
}

/**
 * Render scientific identity share card overlay (square_identity_v1).
 * Background: full-bleed, no blur, no opacity reduction.
 * Top-left: ARCHETYPE SIGNATURE + archetype name + optional small mark.
 * Bottom-left: WHOIS RECORD block (name, archetype, LIR-ID, timestamp).
 * Bottom-right: LIGS WHOIS PROTOCOL — HUMAN.
 * Optional: ultra-faint 1% measurement grid.
 */
export async function renderIdentityCardOverlay(
  spec: IdentityOverlaySpec,
  backgroundBuffer: Buffer
): Promise<Buffer> {
  const size = spec.size ?? 1200;
  const placement = getIdentityTemplate(spec.templateId);

  let img = sharp(backgroundBuffer)
    .resize(size, size)
    .extract({ left: 0, top: 0, width: size, height: size });

  // Optional: nearly subliminal grid (0.3% opacity — barely registers)
  const gridOpacity = 0.003;
  const gridStep = Math.round(size / 16);
  const gridLines: string[] = [];
  for (let i = 0; i <= size; i += gridStep) {
    gridLines.push(`<line x1="${i}" y1="0" x2="${i}" y2="${size}" stroke="rgba(255,255,255,${gridOpacity})" stroke-width="1"/>`);
    gridLines.push(`<line x1="0" y1="${i}" x2="${size}" y2="${i}" stroke="rgba(255,255,255,${gridOpacity})" stroke-width="1"/>`);
  }
  const gridSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${gridLines.join("\n")}</svg>`
  );
  img = img.composite([{ input: gridSvg, left: 0, top: 0 }]);

  const px = (box: { x: number; y: number; w: number; h: number }) => ({
    x: Math.round(box.x * size),
    y: Math.round(box.y * size),
    w: Math.round(box.w * size),
    h: Math.round(box.h * size),
  });

  // Top-left header: ARCHETYPE SIGNATURE (micro-label) + archetype name + optional mark (secondary)
  const header = px(placement.headerBlock);
  const headerParts: string[] = [];
  let headerY = header.y + 20;
  headerParts.push(
    `<text x="${header.x}" y="${headerY}" font-family="monospace,sans-serif" font-size="9" font-weight="400" fill="rgba(255,255,255,0.52)" letter-spacing="0.12em">ARCHETYPE SIGNATURE</text>`
  );
  headerY += 28;
  headerParts.push(
    `<text x="${header.x}" y="${headerY}" font-family="monospace,sans-serif" font-size="16" font-weight="500" fill="rgba(255,255,255,0.88)">${escapeXml(spec.archetypeName)}</text>`
  );

  // Optional small archetype mark to the right of archetype name (secondary, low prominence)
  if (spec.markArchetype) {
    const markSize = Math.round(size * 0.028);
    const markBuf = await loadSmallArchetypeMark(spec.markArchetype, markSize);
    if (markBuf) {
      const markX = header.x + 120;
      const markY = headerY - 14;
      const b64 = markBuf.toString("base64");
      headerParts.push(
        `<image href="data:image/png;base64,${b64}" x="${markX}" y="${markY}" width="${markSize}" height="${markSize}" opacity="0.62"/>`
      );
    }
  }

  const headerSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${headerParts.join("\n")}</svg>`
  );
  img = img.composite([{ input: headerSvg, left: 0, top: 0 }]);

  // Bottom-left identity block — minimal backing for readability, embedded feel
  // Font sizes increased (12–16px) for in-app legibility at ~280–320px display; remains restrained
  const idBlock = px(placement.identityBlock);
  const generatedStr = formatGeneratedTimestamp(spec.generatedAt);
  const lineH = 22;
  const idLines = [
    "WHOIS RECORD",
    "",
    `Name: ${escapeXml(spec.subjectName)}`,
    `Archetype: ${escapeXml(spec.archetypeName)}`,
    `LIR-ID: ${escapeXml(spec.lirId)}`,
    "",
    `Generated: ${generatedStr}`,
  ];
  if (spec.systemPhrase) {
    idLines.splice(1, 0, spec.systemPhrase);
  }
  // Minimal backing: extremely restrained local darkening (6% black) for readability; no panel feel
  const backPad = 4;
  const backX = Math.max(0, idBlock.x - backPad);
  const backY = Math.max(0, idBlock.y - backPad);
  const backW = Math.min(idBlock.w + backPad * 2, size - backX);
  const backH = idLines.length * lineH + 24;
  const backSvg = `<rect x="${backX}" y="${backY}" width="${backW}" height="${backH}" rx="0" fill="rgba(0,0,0,0.08)"/>`;
  const idParts: string[] = [backSvg];
  let idY = idBlock.y + 16;
  for (const line of idLines) {
    if (line === "") {
      idY += 6;
      continue;
    }
    const fontSize = line.startsWith("WHOIS RECORD") ? 13 : line.startsWith("Generated") ? 12 : 16;
    const fill = line.startsWith("WHOIS RECORD") ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.9)";
    const weight = line.startsWith("WHOIS RECORD") ? "500" : "400";
    idParts.push(
      `<text x="${idBlock.x}" y="${idY}" font-family="monospace,sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`
    );
    idY += lineH;
  }
  const idSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${idParts.join("\n")}</svg>`
  );
  img = img.composite([{ input: idSvg, left: 0, top: 0 }]);

  // Bottom-right system mark — very small, quiet, system-stamp feel
  const sys = px(placement.systemMarkBlock);
  const sysRightX = sys.x + sys.w;
  const sysSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <text x="${sysRightX}" y="${sys.y + 10}" text-anchor="end" font-family="monospace,sans-serif" font-size="7" font-weight="400" fill="rgba(255,255,255,0.38)" letter-spacing="0.06em">LIGS</text>
      <text x="${sysRightX}" y="${sys.y + 22}" text-anchor="end" font-family="monospace,sans-serif" font-size="6" font-weight="400" fill="rgba(255,255,255,0.3)">WHOIS PROTOCOL — HUMAN</text>
    </svg>`
  );
  img = img.composite([{ input: sysSvg, left: 0, top: 0 }]);

  return img.png().toBuffer();
}
