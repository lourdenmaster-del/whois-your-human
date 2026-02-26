/**
 * DRY_RUN placeholder PNG for marketing card pipeline.
 * No external API calls. Uses sharp (already in project).
 */

import sharp from "sharp";

const SIZE = 1024;
const BG_COLOR = { r: 10, g: 15, b: 28, alpha: 1 }; // #0A0F1C
const TEXT_COLOR = "#7A4FFF";

/** Create a 1024x1024 placeholder PNG with text. */
export async function createMarketingCardPlaceholderPng(
  archetypeName: string,
  reportId: string
): Promise<Buffer> {
  const textSvg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="rgb(${BG_COLOR.r},${BG_COLOR.g},${BG_COLOR.b})"/>
  <text x="50%" y="40%" text-anchor="middle" dominant-baseline="middle" font-size="32" font-weight="600" fill="${TEXT_COLOR}" font-family="system-ui,sans-serif">MARKETING CARD (DRY RUN)</text>
  <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" font-size="24" fill="rgba(255,255,255,0.9)" font-family="system-ui,sans-serif">${escapeXml(archetypeName)}</text>
  <text x="50%" y="64%" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="rgba(255,255,255,0.6)" font-family="system-ui,sans-serif">${escapeXml(reportId)}</text>
</svg>
  `.trim();

  return sharp(Buffer.from(textSvg))
    .resize(SIZE, SIZE)
    .png()
    .toBuffer();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
