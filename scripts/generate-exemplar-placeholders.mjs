#!/usr/bin/env node
/**
 * Generate 400x300 placeholder PNG images for archetype exemplars.
 * Uses sharp to render SVG gradients to PNG.
 */

import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'exemplars');

const ARCHETYPES = [
  { name: 'stabiliora', colors: ['#3d5c3d', '#1a2f1a'] },
  { name: 'ignispectrum', colors: ['#e85c2c', '#8b2500'] },
  { name: 'radiantis', colors: ['#f4d03f', '#d4a017'] },
  { name: 'tenebris', colors: ['#2d1b4e', '#0d0618'] },
  { name: 'precisura', colors: ['#4a90d9', '#1e3a5f'] },
  { name: 'fluxionis', colors: ['#0d9488', '#134e4a'] },
];

const W = 400;
const H = 300;

function svgWithGradient(name, [color1, color2]) {
  return '<svg width="' + W + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' +
  '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
  '<stop offset="0%" style="stop-color:' + color1 + '"/>' +
  '<stop offset="100%" style="stop-color:' + color2 + '"/>' +
  '</linearGradient></defs>' +
  '<rect width="100%" height="100%" fill="url(#g)"/>' +
  '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
  'font-family="system-ui,sans-serif" font-size="24" fill="rgba(255,255,255,0.6)">' + name + '</text>' +
  '</svg>';
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  for (const { name, colors } of ARCHETYPES) {
    const svg = svgWithGradient(name, colors);
    const outPath = join(OUT_DIR, name + '.png');
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log('Generated', outPath);
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
