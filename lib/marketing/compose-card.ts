/**
 * Deterministic marketing card composition (sharp + SVG).
 * No API calls — used by engine route for TEST_MODE and by image/compose route.
 */

import sharp from "sharp";
import {
  getLogoStyleWithDefaults,
  type MarketingOverlaySpec,
} from "@/src/ligs/marketing";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w.length > maxCharsPerLine ? w.slice(0, maxCharsPerLine) : w;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

/** Monogram "(L)" logo SVG driven by spec.styleTokens.logoStyle. */
export function createMonogramLogoSvg(spec: MarketingOverlaySpec): Buffer {
  const ls = getLogoStyleWithDefaults(spec.styleTokens.logoStyle);
  const r = 48;
  const glowFilter =
    ls.glow > 0
      ? ` filter="drop-shadow(0 0 ${ls.glow}px ${ls.fill})"`
      : "";
  const strokeAttr =
    ls.stroke && ls.strokeWidth > 0
      ? ` stroke="${ls.stroke}" stroke-width="${ls.strokeWidth}"`
      : "";
  const opacityAttr = ls.opacity < 1 ? ` opacity="${ls.opacity}"` : "";
  const letterSpacing = ls.tracking !== 0 ? ` letter-spacing="${ls.tracking}em"` : "";
  const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="${r}" fill="${ls.circleFill}" stroke="${ls.circleStroke}" stroke-width="1"/>
  <text x="50" y="58" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" font-size="42" font-weight="${ls.weight}" fill="${ls.fill}"${letterSpacing}${strokeAttr}${opacityAttr}${glowFilter}>${escapeXml(ls.text)}</text>
</svg>`;
  return Buffer.from(svg);
}

/**
 * Compose marketing card: overlaySpec + background buffer → PNG buffer.
 * Uses placeholder "(L)" logo when logoBuffer is null.
 * Logo placement: always bottom-left (institutional rules: 6% padding, 13% width, opacity 0.9).
 */
export async function composeMarketingCardToBuffer(
  spec: MarketingOverlaySpec,
  backgroundBuffer: Buffer,
  options: { size?: number; logoBuffer?: Buffer | null } = {}
): Promise<Buffer> {
  const size = options.size ?? 1024;
  const logoBuffer = options.logoBuffer ?? createMonogramLogoSvg(spec);

  let img = sharp(backgroundBuffer)
    .resize(size, size)
    .extract({ left: 0, top: 0, width: size, height: size });

  const tb = spec.placement.textBlock.box;
  const tbPx = {
    x: Math.round(tb.x * size),
    y: Math.round(tb.y * size),
    w: Math.round(tb.w * size),
    h: Math.round(tb.h * size),
  };

  const headlineLines = wrapText(spec.copy.headline ?? "", 25, 2);
  const subheadLines = spec.copy.subhead
    ? wrapText(spec.copy.subhead, 35, 3)
    : [];

  const lineHeight = 48;
  const headlineSize = spec.styleTokens.typography.headlineSize === "xl" ? 56 : 44;
  const subheadSize = spec.styleTokens.typography.subheadSize === "md" ? 32 : 28;
  const centerX = tbPx.x + tbPx.w / 2;

  /* Dark scrim behind text so white text contrasts on light backgrounds (matches dry-run canvas). */
  const scrimRect = `<rect x="${tbPx.x}" y="${tbPx.y}" width="${tbPx.w}" height="${tbPx.h}" fill="rgba(0,0,0,0.45)"/>`;
  const svgParts: string[] = [scrimRect];
  let yOffset = tbPx.y + 36;
  for (const line of headlineLines) {
    svgParts.push(
      `<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${headlineSize}" font-weight="${spec.styleTokens.typography.weight}" fill="#ffffff" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));">${escapeXml(line)}</text>`
    );
    yOffset += lineHeight;
  }
  for (const line of subheadLines) {
    svgParts.push(
      `<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${subheadSize}" fill="rgba(255,255,255,0.95)" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));">${escapeXml(line)}</text>`
    );
    yOffset += lineHeight - 8;
  }

  const textSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${svgParts.join("\n")}
    </svg>`
  );

  img = img.composite([{ input: textSvg, left: 0, top: 0 }]);

  if (spec.copy.cta && spec.placement.ctaChip) {
    const cc = spec.placement.ctaChip.box;
    const ccPx = {
      x: Math.round(cc.x * size),
      y: Math.round(cc.y * size),
      w: Math.round(cc.w * size),
      h: Math.round(cc.h * size),
    };
    const ctaSvg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${ccPx.x}" y="${ccPx.y}" width="${ccPx.w}" height="${ccPx.h}" rx="8" fill="rgba(255,255,255,0.9)"/>
        <text x="${ccPx.x + ccPx.w / 2}" y="${ccPx.y + ccPx.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="24" font-weight="600" fill="#111">${escapeXml(spec.copy.cta)}</text>
      </svg>`
    );
    img = img.composite([{ input: ctaSvg, left: 0, top: 0 }]);
  }

  if (logoBuffer) {
    const { paddingPct, widthPct, opacity, paddingBoxOpacity, paddingBoxInsetPct } = EXEMPLAR_LOGO_CONFIG;
    const logoMeta = await sharp(logoBuffer).metadata();
    const origW = logoMeta.width ?? 1;
    const origH = logoMeta.height ?? 1;
    const logoWidthPx = Math.round(size * widthPct);
    const logoHeightPx = Math.round(logoWidthPx * (origH / origW));
    const paddingPx = Math.round(size * paddingPct);
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;

    const logoResized = await sharp(logoBuffer)
      .resize(logoWidthPx, logoHeightPx)
      .png()
      .toBuffer();
    const b64 = logoResized.toString("base64");

    const insetPx = Math.max(4, Math.round(size * paddingBoxInsetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxWidth = logoWidthPx + insetPx * 2;
    const boxHeight = logoHeightPx + insetPx * 2;

    const logoSvg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="4" fill="rgba(0,0,0,${paddingBoxOpacity})"/>
        <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="${opacity}"/>
      </svg>`
    );
    img = img.composite([{ input: logoSvg, left: 0, top: 0 }]);
  }

  return img.png().toBuffer();
}

/**
 * Exemplar card compose config (global logo, bottom-left institutional placement).
 * - Position: bottom-left, 6% padding from left and bottom
 * - Width: 12–14% of card (proportional)
 * - No drop shadow, glow, outline
 * - Opacity 0.9; optional subtle padding box behind logo (8% opacity) for contrast
 */
export const EXEMPLAR_LOGO_CONFIG = {
  /** Horizontal/vertical padding as fraction of card size (0.06 = 6%) */
  paddingPct: 0.06,
  /** Logo width as fraction of card size (0.13 = 13%, within 12–14%) */
  widthPct: 0.13,
  /** Logo opacity 0–1 */
  opacity: 0.9,
  /** Padding box behind logo (for low-contrast backgrounds): opacity 0–1 */
  paddingBoxOpacity: 0.08,
  /** Padding around logo for contrast box, as fraction of card (≈5px at 1024) */
  paddingBoxInsetPct: 0.005,
} as const;

/**
 * Compose exemplar card: marketing_background + overlay copy + CTA + global logo (bottom-left, topmost).
 * Uses GLOBAL_LOGO_PATH asset only; no generated logos.
 * Layering: background → headline/subhead/cta → global logo (topmost)
 */
export async function composeExemplarCardToBuffer(
  spec: MarketingOverlaySpec,
  backgroundBuffer: Buffer,
  options: { size?: number; logoBuffer: Buffer } = { logoBuffer: Buffer.alloc(0) }
): Promise<Buffer> {
  const size = options.size ?? 1024;
  const logoBuffer = options.logoBuffer;
  const { paddingPct, widthPct, opacity, paddingBoxOpacity, paddingBoxInsetPct } = EXEMPLAR_LOGO_CONFIG;

  let img = sharp(backgroundBuffer)
    .resize(size, size)
    .extract({ left: 0, top: 0, width: size, height: size });

  const tb = spec.placement.textBlock.box;
  const tbPx = {
    x: Math.round(tb.x * size),
    y: Math.round(tb.y * size),
    w: Math.round(tb.w * size),
    h: Math.round(tb.h * size),
  };

  const headlineLines = wrapText(spec.copy.headline ?? "", 25, 2);
  const subheadLines = spec.copy.subhead
    ? wrapText(spec.copy.subhead, 35, 3)
    : [];

  const lineHeight = 48;
  const headlineSize = spec.styleTokens.typography.headlineSize === "xl" ? 56 : 44;
  const subheadSize = spec.styleTokens.typography.subheadSize === "md" ? 32 : 28;
  const centerX = tbPx.x + tbPx.w / 2;

  /* Dark scrim behind text so white text contrasts on light backgrounds (matches dry-run canvas). */
  const scrimRect = `<rect x="${tbPx.x}" y="${tbPx.y}" width="${tbPx.w}" height="${tbPx.h}" fill="rgba(0,0,0,0.45)"/>`;
  const svgParts: string[] = [scrimRect];
  let yOffset = tbPx.y + 36;
  for (const line of headlineLines) {
    svgParts.push(
      `<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${headlineSize}" font-weight="${spec.styleTokens.typography.weight}" fill="#ffffff" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));">${escapeXml(line)}</text>`
    );
    yOffset += lineHeight;
  }
  for (const line of subheadLines) {
    svgParts.push(
      `<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${subheadSize}" fill="rgba(255,255,255,0.95)" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));">${escapeXml(line)}</text>`
    );
    yOffset += lineHeight - 8;
  }

  const textSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${svgParts.join("\n")}
    </svg>`
  );

  img = img.composite([{ input: textSvg, left: 0, top: 0 }]);

  if (spec.copy.cta && spec.placement.ctaChip) {
    const cc = spec.placement.ctaChip.box;
    const ccPx = {
      x: Math.round(cc.x * size),
      y: Math.round(cc.y * size),
      w: Math.round(cc.w * size),
      h: Math.round(cc.h * size),
    };
    const ctaSvg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${ccPx.x}" y="${ccPx.y}" width="${ccPx.w}" height="${ccPx.h}" rx="8" fill="rgba(255,255,255,0.9)"/>
        <text x="${ccPx.x + ccPx.w / 2}" y="${ccPx.y + ccPx.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="24" font-weight="600" fill="#111">${escapeXml(spec.copy.cta)}</text>
      </svg>`
    );
    img = img.composite([{ input: ctaSvg, left: 0, top: 0 }]);
  }

  if (logoBuffer.length > 0) {
    const logoMeta = await sharp(logoBuffer).metadata();
    const origW = logoMeta.width ?? 1;
    const origH = logoMeta.height ?? 1;
    const logoWidthPx = Math.round(size * widthPct);
    const logoHeightPx = Math.round(logoWidthPx * (origH / origW));
    const paddingPx = Math.round(size * paddingPct);
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;

    const logoResized = await sharp(logoBuffer)
      .resize(logoWidthPx, logoHeightPx)
      .png()
      .toBuffer();
    const b64 = logoResized.toString("base64");

    const insetPx = Math.max(4, Math.round(size * paddingBoxInsetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxWidth = logoWidthPx + insetPx * 2;
    const boxHeight = logoHeightPx + insetPx * 2;

    const logoSvg = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="4" fill="rgba(0,0,0,${paddingBoxOpacity})"/>
        <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="${opacity}"/>
      </svg>`
    );
    img = img.composite([{ input: logoSvg, left: 0, top: 0 }]);
  }

  return img.png().toBuffer();
}
