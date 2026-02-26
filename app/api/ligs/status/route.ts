import { NextResponse } from "next/server";
import { join } from "path";
import { PROVIDER_NAME } from "@/src/ligs/image/provider";
import { GLOBAL_LOGO_PATH } from "@/lib/brand";

export async function GET() {
  const allowExternalWrites = process.env.ALLOW_EXTERNAL_WRITES === "true";

  let logoConfigured = false;
  const globalLogoFsPath = join(process.cwd(), "public", GLOBAL_LOGO_PATH.replace(/^\//, ""));
  try {
    const fs = await import("node:fs/promises");
    await fs.access(globalLogoFsPath);
    logoConfigured = true;
  } catch {
    logoConfigured = false;
  }

  const logoFallbackAvailable = process.env.ENABLE_PLACEHOLDER_LOGO === "true";

  return NextResponse.json({
    allowExternalWrites,
    provider: PROVIDER_NAME,
    logoConfigured,
    logoFallbackAvailable,
  });
}
