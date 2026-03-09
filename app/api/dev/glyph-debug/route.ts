/**
 * GET /api/dev/glyph-debug?name=ignis
 * Dev-only: audits glyph or icon SVG. Use ?name=ignis for canonical glyph, ?name=ignis_icon for UI icon.
 */

import { NextResponse } from "next/server";
import { join } from "path";
import { readFile } from "fs/promises";

const GLYPH_DIR = join(process.cwd(), "public", "glyphs");
const ICONS_DIR = join(process.cwd(), "public", "icons");

function allowDev(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_PREVIEW_LIVE_TEST === "1" ||
    process.env.ALLOW_PREVIEW_LIVE_TEST === "true"
  );
}

function parseSvgMetadata(content: string): { viewBox: string | null; hasRectBackground: boolean; hasPaths: boolean; hasCirclesPolygons: boolean } {
  const viewBoxMatch = content.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1].trim() : null;

  const svgBody = content.replace(/<svg[^>]*>|<\/svg>|<!--[\s\S]*?-->/gi, "");
  const hasRectBackground =
    /<rect[\s\S]*?>/i.test(svgBody) || /<rect[\s\S]*?\/>/i.test(svgBody);
  const hasPaths = /<path[\s\S]*?>/i.test(svgBody) || /<path[\s\S]*?\/>/i.test(svgBody);
  const hasCirclesPolygons =
    /<circle[\s\S]*?>/i.test(svgBody) ||
    /<polygon[\s\S]*?>/i.test(svgBody) ||
    /<polyline[\s\S]*?>/i.test(svgBody);

  return { viewBox, hasRectBackground, hasPaths, hasCirclesPolygons };
}

export async function GET(req: Request) {
  if (!allowDev()) {
    return NextResponse.json({ error: "glyph-debug is dev-only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() || "ignis";
  const baseName = name.replace(/\.svg$/i, "");
  const fileName = baseName.endsWith(".svg") ? baseName : `${baseName}.svg`;
  const resolvedFsPath =
    baseName === "ignis_icon"
      ? join(ICONS_DIR, "ignis_icon.svg")
      : join(GLYPH_DIR, fileName);

  try {
    const buf = await readFile(resolvedFsPath, "utf8");
    const content = buf;
    const fileSizeBytes = Buffer.byteLength(buf, "utf8");
    const first200Chars = content.slice(0, 200);
    const { viewBox, hasRectBackground, hasPaths, hasCirclesPolygons } = parseSvgMetadata(content);

    return NextResponse.json({
      name: baseName,
      exists: true,
      resolvedFsPath,
      fileSizeBytes,
      first200Chars,
      viewBox,
      hasRectBackground,
      hasPaths,
      hasCirclesPolygons,
    });
  } catch (err) {
    const exists = false;
    return NextResponse.json({
      name: baseName,
      exists,
      resolvedFsPath,
      fileSizeBytes: null,
      first200Chars: null,
      viewBox: null,
      hasRectBackground: false,
      hasPaths: false,
      hasCirclesPolygons: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
