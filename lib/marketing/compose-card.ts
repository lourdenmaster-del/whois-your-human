/**
 * Deterministic marketing card composition (sharp + SVG).
 * No API calls — used by engine route for TEST_MODE and by image/compose route.
 */

import sharp from "sharp";
import {
  getLogoStyleWithDefaults,
  type MarketingOverlaySpec,
} from "@/src/ligs/marketing";
import { getArchetypeStaticImagePath } from "@/lib/archetype-static-images";

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

/** Hero archetype image config: center anchor. */
const HERO_ARCHETYPE_CONFIG = {
  centerX: 0.5,
  centerY: 0.56,
  sizePct: 0.31,
  opacity: 0.85,
  glowOpacity: 0.12,
} as const;

const COMPOSE_DEBUG = process.env.COMPOSE_DEBUG === "1" || process.env.COMPOSE_DEBUG === "true";

/** Create hero overlay: centered archetype static image. On missing: returns null. */
async function createHeroArchetypeOverlay(
  spec: MarketingOverlaySpec,
  size: number,
  _backgroundPurpose?: string
): Promise<Buffer | null> {
  const markType = (spec as { markType?: string }).markType ?? "brand";
  const markArchetype = (spec as { markArchetype?: string }).markArchetype;
  if (markType !== "archetype" || !markArchetype) return null;

  const imagePath = getArchetypeStaticImagePath(markArchetype);
  if (!imagePath) return null;

  const fs = await import("node:fs/promises");
  const { join } = await import("path");
  const fullPath = join(process.cwd(), "public", imagePath.startsWith("/") ? imagePath.slice(1) : imagePath);
  try {
    const pngBuf = await fs.readFile(fullPath);
    const cfg = HERO_ARCHETYPE_CONFIG;
    const imgW = Math.round(size * cfg.sizePct);
    const cx = size * cfg.centerX;
    const cy = size * cfg.centerY;
    const tx = Math.round(cx - imgW / 2);
    const ty = Math.round(cy - imgW / 2);
    const resized = await sharp(pngBuf).resize(imgW, imgW).png().toBuffer();
    const b64 = resized.toString("base64");
    const glowR = Math.max(size * 0.28, imgW * 1.2);
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,180,100,${cfg.glowOpacity})"/>
          <stop offset="60%" stop-color="rgba(255,200,120,${cfg.glowOpacity * 0.5})"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#heroGlow)"/>
      <image href="data:image/png;base64,${b64}" x="${tx}" y="${ty}" width="${imgW}" height="${imgW}" opacity="${cfg.opacity}"/>
    </svg>`;
    return Buffer.from(svg);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Archetype image load failed (markType=archetype, ${markArchetype}): ${msg}`);
    }
    if (typeof console !== "undefined" && console.error) {
      console.error("[COMPOSE] archetype image load failed", { markArchetype, path: imagePath, error: msg });
    }
    return null;
  }
}

/** Resolve mark buffer: archetype static image when markType=archetype, else logoBuffer or monogram. */
async function resolveMarkBuffer(
  spec: MarketingOverlaySpec,
  logoBuffer: Buffer | null
): Promise<Buffer | null> {
  const markType = (spec as { markType?: string }).markType ?? "brand";
  const markArchetype = (spec as { markArchetype?: string }).markArchetype;

  if (markType === "archetype" && markArchetype) {
    const imagePath = getArchetypeStaticImagePath(markArchetype);
    if (imagePath) {
      const fs = await import("node:fs/promises");
      const { join } = await import("path");
      const fullPath = join(process.cwd(), "public", imagePath.startsWith("/") ? imagePath.slice(1) : imagePath);
      try {
        const pngBuf = await fs.readFile(fullPath);
        return sharp(pngBuf).resize(256, 256).png().toBuffer();
      } catch {
        // fall through to logoBuffer or monogram
      }
    }
  }

  if (logoBuffer && logoBuffer.length > 0) return logoBuffer;
  return createMonogramLogoSvg(spec);
}

type LogoBoxPx = { left: number; top: number; width: number; height: number };

/** Subtle signature-field overlay for archetype mark (Ignis). Returns null for brand. */
function createSignatureFieldOverlaySvg(
  spec: MarketingOverlaySpec,
  size: number,
  logoBoxPx: LogoBoxPx
): Buffer | null {
  const markType = (spec as { markType?: string }).markType ?? "brand";
  if (markType !== "archetype") return null;
  const { left, top, width, height } = logoBoxPx;
  const cx = left + width / 2;
  const cy = top + height / 2;
  const r = Math.max(width, height) * 0.8;
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="sig" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,200,120,0.08)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#sig)"/>
  </svg>`;
  return Buffer.from(svg);
}

/** Dev-only: add "IGNIS MARK" stamp at 2% opacity when markType=archetype. */
function maybeAddDevStamp(
  svgRaw: string,
  spec: MarketingOverlaySpec,
  logoLeft: number,
  logoTop: number,
  logoWidthPx: number,
  logoHeightPx: number
): string {
  const markType = (spec as { markType?: string }).markType ?? "brand";
  if (markType !== "archetype" || process.env.NODE_ENV === "production") return svgRaw;
  const stamp = `<text x="${logoLeft}" y="${logoTop + logoHeightPx / 2}" font-size="10" fill="white" opacity="0.02">IGNIS MARK</text>`;
  return svgRaw.replace("</svg>", `${stamp}</svg>`);
}

/**
 * Compose marketing card: overlaySpec + background buffer → PNG buffer.
 * Uses placeholder "(L)" logo when logoBuffer is null.
 * Logo placement: always bottom-left (institutional rules: 6% padding, 13% width, opacity 0.9).
 * Optionally populates options.meta with { textRendered }. glyphUsed=false for brand compose.
 */
export async function composeMarketingCardToBuffer(
  spec: MarketingOverlaySpec,
  backgroundBuffer: Buffer,
  options: { size?: number; logoBuffer?: Buffer | null; meta?: { glyphUsed?: boolean; textRendered?: boolean } } = {}
): Promise<Buffer> {
  const size = options.size ?? 1024;
  const resolvedLogoBuffer = await resolveMarkBuffer(spec, options.logoBuffer ?? null);
  if (options.meta) options.meta.glyphUsed = false;

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

  const { svg: textSvg, textRendered } = buildTextOverlaySvg(spec, size, tbPx);
  if (options.meta) options.meta.textRendered = textRendered;

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

  if (resolvedLogoBuffer && resolvedLogoBuffer.length > 0) {
    const { paddingPct, widthPct, opacity, paddingBoxOpacity, paddingBoxInsetPct } = EXEMPLAR_LOGO_CONFIG;
    const logoMeta = await sharp(resolvedLogoBuffer).metadata();
    const origW = logoMeta.width ?? 1;
    const origH = logoMeta.height ?? 1;
    const logoWidthPx = Math.round(size * widthPct);
    const logoHeightPx = Math.round(logoWidthPx * (origH / origW));
    const paddingPx = Math.round(size * paddingPct);
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;
    const logoBoxPx = { left: logoLeft, top: logoTop, width: logoWidthPx, height: logoHeightPx };

    const sigOverlay = createSignatureFieldOverlaySvg(spec, size, logoBoxPx);
    if (sigOverlay) {
      img = img.composite([{ input: sigOverlay, left: 0, top: 0 }]);
    }

    const logoResized = await sharp(resolvedLogoBuffer)
      .resize(logoWidthPx, logoHeightPx)
      .png()
      .toBuffer();
    const b64 = logoResized.toString("base64");

    const insetPx = Math.max(4, Math.round(size * paddingBoxInsetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxWidth = logoWidthPx + insetPx * 2;
    const boxHeight = logoHeightPx + insetPx * 2;

    const logoSvgRaw = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="4" fill="rgba(0,0,0,${paddingBoxOpacity})"/>
        <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="${opacity}"/>
      </svg>`;
    const logoSvg = Buffer.from(maybeAddDevStamp(logoSvgRaw, spec, logoLeft, logoTop, logoWidthPx, logoHeightPx));
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

/** Build text overlay SVG. Production: explicit fill #FFFFFF, opacity >= 0.9. Debug: pure white, no filter. */
function buildTextOverlaySvg(
  spec: MarketingOverlaySpec,
  size: number,
  tbPx: { x: number; y: number; w: number; h: number }
): { svg: Buffer; textRendered: boolean } {
  const headlineLines = wrapText(spec.copy.headline ?? "", 25, 2);
  const subheadLines = spec.copy.subhead ? wrapText(spec.copy.subhead, 35, 3) : [];
  const textRendered = headlineLines.length > 0 || subheadLines.length > 0;

  const lineHeight = 48;
  const headlineSize = spec.styleTokens.typography.headlineSize === "xl" ? 56 : 44;
  const subheadSize = spec.styleTokens.typography.subheadSize === "md" ? 32 : 28;
  const centerX = tbPx.x + tbPx.w / 2;

  const debug = COMPOSE_DEBUG;
  const scrimOpacity = debug ? 0.35 : 0.45;
  const textFill = "#FFFFFF";
  const headlineOpacity = debug ? 1 : 1;
  const subheadOpacity = debug ? 1 : 0.95;
  const textFilter = debug ? "" : ' style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8))"';

  const scrimRect = `<rect x="${tbPx.x}" y="${tbPx.y}" width="${tbPx.w}" height="${tbPx.h}" fill="rgba(0,0,0,${scrimOpacity})"/>`;
  const svgParts: string[] = [scrimRect];
  let yOffset = tbPx.y + 36;
  for (const line of headlineLines) {
    svgParts.push(
      `<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${headlineSize}" font-weight="${spec.styleTokens.typography.weight}" fill="${textFill}" opacity="${headlineOpacity}"${textFilter}>${escapeXml(line)}</text>`
    );
    yOffset += lineHeight;
  }
  for (const line of subheadLines) {
    svgParts.push(
      `<text x="${centerX}" y="${yOffset}" text-anchor="middle" font-size="${subheadSize}" fill="${textFill}" opacity="${subheadOpacity}"${textFilter}>${escapeXml(line)}</text>`
    );
    yOffset += lineHeight - 8;
  }

  if (debug) {
    const sa = spec.placement.safeArea;
    const saPx = { x: Math.round(sa.x * size), y: Math.round(sa.y * size), w: Math.round(sa.w * size), h: Math.round(sa.h * size) };
    svgParts.push(`<rect x="${saPx.x}" y="${saPx.y}" width="${saPx.w}" height="${saPx.h}" fill="none" stroke="#00ff00" stroke-width="2"/>`);
    svgParts.push(`<rect x="${tbPx.x}" y="${tbPx.y}" width="${tbPx.w}" height="${tbPx.h}" fill="none" stroke="#ff00ff" stroke-width="2"/>`);
    if (spec.placement.ctaChip) {
      const cc = spec.placement.ctaChip.box;
      const ccPx = { x: Math.round(cc.x * size), y: Math.round(cc.y * size), w: Math.round(cc.w * size), h: Math.round(cc.h * size) };
      svgParts.push(`<rect x="${ccPx.x}" y="${ccPx.y}" width="${ccPx.w}" height="${ccPx.h}" fill="none" stroke="#00ffff" stroke-width="2"/>`);
    }
  }

  const svg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${svgParts.join("\n")}
    </svg>`
  );
  return { svg, textRendered };
}

/**
 * Compose exemplar card: marketing_background + overlay copy + CTA + global logo (bottom-left, topmost).
 * Layering: background → archetypeAnchor → headline/subhead → CTA → cornerMark.
 * Optionally populates options.meta with { glyphUsed, textRendered }.
 */
export async function composeExemplarCardToBuffer(
  spec: MarketingOverlaySpec,
  backgroundBuffer: Buffer,
  options: {
    size?: number;
    logoBuffer?: Buffer;
    backgroundPurpose?: string;
    meta?: { glyphUsed?: boolean; textRendered?: boolean };
  } = { logoBuffer: Buffer.alloc(0) }
): Promise<Buffer> {
  const size = options.size ?? 1024;
  const resolvedLogoBuffer = await resolveMarkBuffer(spec, options.logoBuffer ?? null);
  const { paddingPct, widthPct, opacity, paddingBoxOpacity, paddingBoxInsetPct } = EXEMPLAR_LOGO_CONFIG;
  const markType = (spec as { markType?: string }).markType ?? "brand";

  if (COMPOSE_DEBUG) {
    console.log("[COMPOSE DEBUG] layer order: background → archetypeAnchor → headline/subhead → CTA → cornerMark");
  }

  let img = sharp(backgroundBuffer)
    .resize(size, size)
    .extract({ left: 0, top: 0, width: size, height: size });

  const heroOverlay = await createHeroArchetypeOverlay(spec, size, options.backgroundPurpose);
  const glyphUsed = heroOverlay != null;
  if (options.meta) options.meta.glyphUsed = glyphUsed;
  if (heroOverlay) {
    img = img.composite([{ input: heroOverlay, left: 0, top: 0 }]);
  }

  const tb = spec.placement.textBlock.box;
  const tbPx = {
    x: Math.round(tb.x * size),
    y: Math.round(tb.y * size),
    w: Math.round(tb.w * size),
    h: Math.round(tb.h * size),
  };

  const { svg: textSvg, textRendered } = buildTextOverlaySvg(spec, size, tbPx);
  if (options.meta) options.meta.textRendered = textRendered;

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

  if (markType === "archetype") {
    const monogramBuffer = createMonogramLogoSvg(spec);
    const logoWidthPx = Math.round(size * 0.08);
    const logoHeightPx = logoWidthPx;
    const paddingPx = Math.round(size * paddingPct);
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;
    const logoResized = await sharp(monogramBuffer).resize(logoWidthPx, logoHeightPx).png().toBuffer();
    const b64 = logoResized.toString("base64");
    const insetPx = Math.max(2, Math.round(size * paddingBoxInsetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxWidth = logoWidthPx + insetPx * 2;
    const boxHeight = logoHeightPx + insetPx * 2;
    const logoSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="4" fill="rgba(0,0,0,${paddingBoxOpacity * 0.5})"/>
      <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="0.85"/>
    </svg>`;
    img = img.composite([{ input: Buffer.from(logoSvg), left: 0, top: 0 }]);
  } else if (markType === "brand" && resolvedLogoBuffer && resolvedLogoBuffer.length > 0) {
    const logoMeta = await sharp(resolvedLogoBuffer).metadata();
    const origW = logoMeta.width ?? 1;
    const origH = logoMeta.height ?? 1;
    const logoWidthPx = Math.round(size * widthPct);
    const logoHeightPx = Math.round(logoWidthPx * (origH / origW));
    const paddingPx = Math.round(size * paddingPct);
    const logoLeft = paddingPx;
    const logoTop = size - paddingPx - logoHeightPx;
    const logoBoxPx = { left: logoLeft, top: logoTop, width: logoWidthPx, height: logoHeightPx };

    const sigOverlay = createSignatureFieldOverlaySvg(spec, size, logoBoxPx);
    if (sigOverlay) {
      img = img.composite([{ input: sigOverlay, left: 0, top: 0 }]);
    }

    const logoResized = await sharp(resolvedLogoBuffer)
      .resize(logoWidthPx, logoHeightPx)
      .png()
      .toBuffer();
    const b64 = logoResized.toString("base64");

    const insetPx = Math.max(4, Math.round(size * paddingBoxInsetPct));
    const boxLeft = logoLeft - insetPx;
    const boxTop = logoTop - insetPx;
    const boxWidth = logoWidthPx + insetPx * 2;
    const boxHeight = logoHeightPx + insetPx * 2;

    const logoSvgRaw = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect x="${boxLeft}" y="${boxTop}" width="${boxWidth}" height="${boxHeight}" rx="4" fill="rgba(0,0,0,${paddingBoxOpacity})"/>
        <image href="data:image/png;base64,${b64}" x="${logoLeft}" y="${logoTop}" width="${logoWidthPx}" height="${logoHeightPx}" opacity="${opacity}"/>
      </svg>`;
    const logoSvg = Buffer.from(maybeAddDevStamp(logoSvgRaw, spec, logoLeft, logoTop, logoWidthPx, logoHeightPx));
    img = img.composite([{ input: logoSvg, left: 0, top: 0 }]);
  }

  return img.png().toBuffer();
}
