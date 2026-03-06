#!/usr/bin/env node
/**
 * Print 12 solar seasons table (dev). Run: node scripts/print-solar-seasons-table.mjs
 * Or with dev server: curl -s http://localhost:3000/api/dev/solar-seasons-table | jq
 */

const OBLIQUITY_DEG = 23.436;
const LIGS_ARCHETYPES = [
  "Ignispectrum", "Stabiliora", "Duplicaris", "Tenebris", "Radiantis", "Precisura",
  "Aequilibris", "Obscurion", "Vectoris", "Structoris", "Innovaris", "Fluxionis",
];
const ANCHOR_TYPES = [
  "equinox", "crossquarter", "none", "solstice", "crossquarter", "none",
  "equinox", "crossquarter", "none", "solstice", "crossquarter", "none",
];

function declination(lonDeg) {
  const lonRad = (lonDeg * Math.PI) / 180;
  const oblRad = (OBLIQUITY_DEG * Math.PI) / 180;
  const sinDec = Math.sin(lonRad) * Math.sin(oblRad);
  return (Math.asin(Math.max(-1, Math.min(1, sinDec))) * 180) / Math.PI;
}

function polarity(lon) {
  return lon >= 0 && lon < 180 ? "waxing" : "waning";
}

const rows = LIGS_ARCHETYPES.map((archetype, i) => {
  const lonCenter = i * 30 + 15;
  const dec = declination(lonCenter);
  return {
    seasonIndex: i,
    archetype,
    lonCenterDeg: lonCenter,
    declinationDegAtCenter: Math.round(dec * 100) / 100,
    polarity: polarity(lonCenter),
    anchorType: ANCHOR_TYPES[i],
  };
});

const sep = " | ";
const header = ["idx", "archetype", "lonCenter", "decl°", "polarity", "anchor"].join(sep);
const line = "-".repeat(header.length);
console.log(header);
console.log(line);
rows.forEach((r) => {
  console.log([
    String(r.seasonIndex).padStart(3),
    r.archetype.padEnd(12),
    String(r.lonCenterDeg).padStart(7),
    String(r.declinationDegAtCenter).padStart(8),
    r.polarity.padEnd(7),
    r.anchorType,
  ].join(sep));
});
