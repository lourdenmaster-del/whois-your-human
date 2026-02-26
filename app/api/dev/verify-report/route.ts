/**
 * GET /api/dev/verify-report?reportId=X
 * Dev-only: verifies new report completeness (Blob, schema, prompts, images, archetype).
 */

import { NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { BLOB_BEAUTY_PREFIX, getImageUrlFromBlob } from "@/lib/report-store";
import { SCHEMA_VERSION } from "@/lib/beauty-profile-schema";
import { isTestMode } from "@/lib/runtime-mode";

const IMAGE_SLUGS = [
  "vector_zero_beauty_field",
  "light_signature_aesthetic_field",
  "final_beauty_field",
] as const;

function hasPrompt(raw: Record<string, unknown>): boolean {
  const ip = raw.imagery_prompts as Record<string, unknown> | undefined;
  if (ip && typeof ip === "object") {
    for (const k of ["vector_zero_beauty_field", "light_signature_aesthetic_field", "final_beauty_field"]) {
      const v = ip[k];
      if (typeof v === "string" && v.trim().length > 0) return true;
    }
  }
  const used = raw.imagePromptsUsed as Array<{ prompt?: string }> | undefined;
  if (Array.isArray(used)) {
    for (const u of used) {
      if (typeof u?.prompt === "string" && u.prompt.trim().length > 0) return true;
    }
  }
  return false;
}

export async function GET(request: Request) {
  const allowPreview = process.env.ALLOW_PREVIEW_LIVE_TEST === "1" || process.env.ALLOW_PREVIEW_LIVE_TEST === "true";
  if (process.env.NODE_ENV === "production" && !allowPreview) {
    return NextResponse.json(
      { error: "Verify-report is dev-only" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId")?.trim();
  if (!reportId) {
    return NextResponse.json(
      { error: "Missing reportId query param" },
      { status: 400 }
    );
  }

  const checks: Record<string, boolean> = {};
  const failures: string[] = [];
  const imageUrls: string[] = [];
  let raw: Record<string, unknown> | null = null;

  // 1. Profile exists in Blob
  try {
    const pathname = `${BLOB_BEAUTY_PREFIX}${reportId}.json`;
    const meta = await head(pathname);
    if (meta?.url) {
      const res = await fetch(meta.url);
      if (res.ok) {
        raw = (await res.json()) as Record<string, unknown>;
      }
    }
    checks.profileInBlob = !!raw;
    if (!raw) failures.push("profile missing in Blob");
  } catch {
    checks.profileInBlob = false;
    failures.push("profile missing in Blob");
  }

  // 2. schemaVersion exists and equals expected
  if (raw) {
    const sv = raw.schemaVersion as string | undefined;
    checks.schemaVersion = sv === SCHEMA_VERSION;
    if (sv !== SCHEMA_VERSION) failures.push(`schemaVersion expected "${SCHEMA_VERSION}", got ${JSON.stringify(sv ?? "missing")}`);
  } else {
    checks.schemaVersion = false;
  }

  // 3. At least one prompt field exists
  if (raw) {
    checks.hasPrompt = hasPrompt(raw);
    if (!checks.hasPrompt) failures.push("no prompt field found (imagery_prompts or imagePromptsUsed)");
  } else {
    checks.hasPrompt = false;
  }

  // 4. Images array exists and length >= 1
  for (const slug of IMAGE_SLUGS) {
    try {
      const u = await getImageUrlFromBlob(reportId, slug);
      if (u) {
        imageUrls.push(u);
        const headRes = await fetch(u, { method: "HEAD" });
        checks[`image_${slug}`] = headRes.ok;
      } else {
        checks[`image_${slug}`] = false;
      }
    } catch {
      checks[`image_${slug}`] = false;
    }
  }
  checks.imagesCountGe1 = imageUrls.length >= 1;
  if (imageUrls.length < 1) failures.push("images array empty or not retrievable (need >= 1)");

  // 5. dominantArchetype (or primary archetype) exists
  if (raw) {
    const arch = (raw.dominantArchetype ?? (raw as { primary_archetype?: string }).primary_archetype) as string | undefined;
    checks.hasArchetype = typeof arch === "string" && arch.trim().length > 0;
    if (!checks.hasArchetype) failures.push("dominantArchetype/primary_archetype missing or empty");
  } else {
    checks.hasArchetype = false;
  }

  // 6. marketingCardUrl (profile or Blob) — required when DRY_RUN or TEST_MODE
  const dryRunEnv = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const requireMarketingCard = dryRunEnv || isTestMode;
  let marketingCardUrl: string | null = null;
  if (raw) {
    marketingCardUrl = (raw.marketingCardUrl as string) ?? null;
  }
  if (!marketingCardUrl) {
    try {
      marketingCardUrl = await getImageUrlFromBlob(reportId, "marketing_card");
    } catch {
      marketingCardUrl = null;
    }
  }
  checks.hasMarketingCard = !!marketingCardUrl;
  if (requireMarketingCard && !checks.hasMarketingCard) {
    failures.push("marketingCardUrl missing (required in DRY_RUN / TEST_MODE)");
  }

  const allOk = Object.values(checks).every((v) => v === true);

  return NextResponse.json({
    reportId,
    ok: allOk,
    checks,
    failures: allOk ? [] : failures,
    imageUrls,
    marketingCardUrl: marketingCardUrl ?? undefined,
    summary: allOk ? "PASS — New report complete." : `FAIL — ${failures.join("; ")}`,
  });
}
