/**
 * Deterministic SVG gradient background for marketing card.
 * No network, no API — derived from archetype palette only.
 */

import { getMarketingVisuals } from "@/src/ligs/archetypes/adapters";

/** Map palette keywords to hex for SVG gradient. Fallback: deep navy + violet. */
const PALETTE_TO_HEX: Record<string, string> = {
  blush: "#F4D1D1",
  cream: "#FFFDD0",
  rosewater: "#F4D0D0",
  lavender: "#E6E6FA",
  neutral: "#E8E8E8",
  ivory: "#FFFFF0",
  ember: "#B22222",
  amber: "#FFBF00",
  silver: "#C0C0C0",
  pearl: "#F0E6E6",
  charcoal: "#36454F",
  midnight: "#191970",
  graphite: "#383838",
  aqua: "#00FFFF",
  mist: "#E0E5E5",
  electric: "#7DF9FF",
  azure: "#007FFF",
  warm: "#FF7F50",
  fiery: "#FF4500",
  intense: "#FF6347",
  muted: "#8B8386",
  sand: "#C2B280",
  stone: "#858585",
  concrete: "#9E9E9E",
  slate: "#708090",
  deep: "#0A0F1C",
  shadow: "#2F4F4F",
  light: "#FFF8DC",
  bright: "#FFFFFF",
  clean: "#F5F5F5",
  organized: "#E8E8E8",
  bold: "#FFD700",
  fresh: "#98FB98",
  flowing: "#87CEEB",
  gradient: "#7A4FFF",
};

function paletteToHex(palette: string[]): [string, string] {
  const c1 = palette[0] ? (PALETTE_TO_HEX[palette[0].toLowerCase()] ?? "#0A0F1C") : "#0A0F1C";
  const c2 = palette[1] ? (PALETTE_TO_HEX[palette[1].toLowerCase()] ?? "#7A4FFF") : "#7A4FFF";
  return [c1, c2];
}

const SIZE = 1024;

/**
 * Returns an SVG buffer for use as marketing card background.
 * Gradient derived from archetype marketing visuals palette.
 */
export function createArchetypeGradientSvgBuffer(archetypeName: string): Buffer {
  const { palette } = getMarketingVisuals(archetypeName);
  const [c1, c2] = paletteToHex(palette);
  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
</svg>`;
  return Buffer.from(svg);
}
