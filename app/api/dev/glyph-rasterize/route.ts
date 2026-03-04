/**
 * GET /api/dev/glyph-rasterize?name=ignis_mark
 * Dev-only: rasterizes glyph SVG to 512x512 PNG (contain-fit, transparent bg).
 */

import { NextResponse } from "next/server";
import { join } from "path";
import { readFile } from "fs/promises";
import sharp from "sharp";

const GLYPH_DIR = join(process.cwd(), "public", "glyphs");
const SIZE = 512;

function allowDev(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_PREVIEW_LIVE_TEST === "1" ||
    process.env.ALLOW_PREVIEW_LIVE_TEST === "true"
  );
}

export async function GET(req: Request) {
  if (!allowDev()) {
    return NextResponse.json({ error: "glyph-rasterize is dev-only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() || "ignis";
  const baseName = name.replace(/\.svg$/i, "");
  const fileName = baseName.endsWith(".svg") ? baseName : `${baseName}.svg`;
  const resolvedFsPath = join(GLYPH_DIR, fileName);

  try {
    const svgBuf = await readFile(resolvedFsPath, "utf8");

    if (process.env.NODE_ENV !== "production" && (baseName === "ignis" || baseName === "ignis_mark")) {
      const body = svgBuf.replace(/<svg[^>]*>|<\/svg>|<!--[\s\S]*?-->/gi, "").trim();
      const circleCount = (body.match(/<circle[\s\S]*?>/gi) || []).length;
      const polygonCount = (body.match(/<polygon[\s\S]*?>/gi) || []).length;
      const validGeometry = circleCount >= 2 && polygonCount >= 3;
      if (!validGeometry) {
        return NextResponse.json(
          {
            error: "WRONG_GLYPH_FILE",
            message: "WRONG GLYPH FILE: expected canonical ignis geometry (2 circles + 3 triangles). " +
              `Got ${circleCount} circles, ${polygonCount} polygons.`,
            path: resolvedFsPath,
          },
          { status: 500 }
        );
      }
    }

    const png = await sharp(Buffer.from(svgBuf))
      .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "GLYPH_RASTERIZE_FAILED",
        message: err instanceof Error ? err.message : String(err),
        path: resolvedFsPath,
      },
      { status: 500 }
    );
  }
}
