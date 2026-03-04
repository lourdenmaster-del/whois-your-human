/**
 * ONE canonical static overlay for square_card_v1.
 * No branching. No optional steps. Deterministic layer order.
 * Used by /api/image/compose and all compose flows.
 */

import sharp from "sharp";
import { getLogoStyleWithDefaults, type MarketingOverlaySpec } from "@/src/ligs/marketing";

const ARCHETYPE_GLYPH_PATHS: Record<string, string> = {
  Ignispectrum: "glyphs/ignis.svg",
};

const GLYPH_CONFIG = {
  centerX: 0.5,
  centerY: 0.56,
  sizePct: 0.32,
  fillColor: "#FAF8F5",
  opacity: 0.9,
  glowOpacity: 0.1,
} as const;

const GLYPH_DEBUG_OUTLINE = process.env.NEXT_PUBLIC_GLYPH_DEBUG_OUTLINE === "true" || process.env.NODE_ENV === "development";

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

/**
 * Strip background rects from glyph SVG - glyph must be glyph-only with transparent background.
 */
function stripBackgroundRects(svgContent: string): string {
  return svgContent.replace(/<rect[\s\S]*?\/>/gi, "").replace(/<rect[\s\S]*?<\/rect>/gi, "");
}

/** Load glyph SVG. For markType=archetype this is MANDATORY - throws on failure.
 * Rasterizes with: viewBox respected, contain fit, centered, transparent bg, fill #FAF8F5 @ 0.9 opacity.
 */
async function loadGlyphOverlay(
  markArchetype: string,
  size: number
): Promise<{ buffer: Buffer; rasterDims: { w: number; h: number }; glyphPath: string }> {
  const glyphRel = ARCHETYPE_GLYPH_PATHS[markArchetype];
  if (!glyphRel) throw new Error(`No glyph path for archetype: ${markArchetype}`);
  const fs = await import("node:fs/promises");
  const { join } = await import("path");
  const path = join(process.cwd(), "public", glyphRel);
  const svgBuf = await fs.readFile(path, "utf8");

  if (process.env.NODE_ENV !== "production") {
    const body = svgBuf.replace(/<svg[^>]*>|<\/svg>|<!--[\s\S]*?-->/gi, "").trim();
    const circleCount = (body.match(/<circle[\s\S]*?>/gi) || []).length;
    const polygonCount = (body.match(/<polygon[\s\S]*?>/gi) || []).length;
    const hasSignature = body.includes("ring + center dot + 3 triangles") || body.includes("3 triangles") || body.includes("canonical archetype glyph") || body.includes("Archetype geometry");
    const validGeometry = (circleCount >= 2 && polygonCount >= 3) || hasSignature;
    if (!validGeometry) {
      throw new Error(
        `WRONG GLYPH FILE: expected canonical ignis geometry (2 circles + 3 triangles). ` +
          `Got ${circleCount} circles, ${polygonCount} polygons. ` +
          `File: ${glyphRel}`
      );
    }
  }

  const cfg = GLYPH_CONFIG;
  const glyphW = Math.round(size * cfg.sizePct);
  const cx = size * cfg.centerX;
  const cy = size * cfg.centerY;
  const tx = Math.round(cx - glyphW / 2);
  const ty = Math.round(cy - glyphW / 2);
  /** Canonical glyph viewBox is 0 0 1000 1000 — DO NOT MODIFY. */
  const scale = glyphW / 1000;
  let innerSvg = svgBuf
    .replace(/<svg[^>]*>|<\/svg>|<!--[^]*?-->/g, "")
    .trim();
  innerSvg = stripBackgroundRects(innerSvg);
  innerSvg = innerSvg.replace(/fill="(?!none)[^"]*"|fill='(?!none')[^']*'/g, `fill="${cfg.fillColor}"`).replace(/stroke="currentColor"/g, `stroke="${cfg.fillColor}"`).trim();
  const glowR = Math.max(size * 0.28, glyphW * 1.2);
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(255,180,100,${cfg.glowOpacity})"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="url(#heroGlow)"/>
    <g transform="translate(${tx},${ty}) scale(${scale})" opacity="${cfg.opacity}">${innerSvg}</g>`;
  if (GLYPH_DEBUG_OUTLINE) {
    svg += `<rect x="${tx}" y="${ty}" width="${glyphW}" height="${glyphW}" fill="none" stroke="magenta" stroke-width="1"/>`;
  }
  svg += "</svg>";
  return { buffer: Buffer.from(svg), rasterDims: { w: glyphW, h: glyphW }, glyphPath: glyphRel };
}

export interface RenderStaticCardOverlayResult {
  buffer: Buffer;
  glyphUsed: boolean;
  logoUsed: "brand" | "archetype" | "none";
  textRendered: boolean;
  glyphPath?: string;
  rasterDims?: { w: number; h: number };
}

/**
 * ONE canonical overlay. Fixed layer order:
 * 1) background
 * 2) glyph anchor (when markType=archetype - MANDATORY, throws on load failure)
 * 3) headline + subhead (fill #fff, opacity 1)
 * 4) CTA chip
 * 5) corner mark (brand logo or archetype monogram)
 * 6) signature glow behind glyph (Ignis only, drawn with corner for archetype)
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

  let glyphUsed = false;
  let glyphPath: string | undefined;
  let rasterDims: { w: number; h: number } | undefined;
  if (markType === "archetype" && markArchetype) {
    const glyphResult = await loadGlyphOverlay(markArchetype, size);
    glyphUsed = true;
    glyphPath = glyphResult.glyphPath;
    rasterDims = glyphResult.rasterDims;
    img = img.composite([{ input: glyphResult.buffer, left: 0, top: 0 }]);
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
    if (markArchetype === "Ignispectrum") {
      const labelX = paddingPx;
      const labelY = paddingPx + 20;
      const labelSvg = Buffer.from(
        `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <text x="${labelX}" y="${labelY}" font-size="14" font-weight="500" fill="rgba(255,255,255,0.6)">Ignispectrum</text>
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
  return { buffer, glyphUsed, logoUsed, textRendered, glyphPath, rasterDims };
}
