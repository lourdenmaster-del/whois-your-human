import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { pickBackgroundSource } from "@/lib/ligs-studio-utils";
import { buildMinimalVoiceProfile } from "@/lib/marketing/minimal-profile";
import { LigsArchetypeEnum } from "@/src/ligs/voice/schema";
import { FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import { MarketingVisualsRequestSchema } from "./request-schema";

const VALID_ARCHETYPES = new Set(LigsArchetypeEnum.options);

function getBaseUrl(req: Request): string {
  try {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    const v = process.env.VERCEL_URL;
    if (v) return `https://${v}`;
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "MARKETING_VISUALS_INVALID", message: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const parsed = MarketingVisualsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "MARKETING_VISUALS_INVALID",
          message: "Invalid request body",
          issues: parsed.error.issues,
          requestId,
        },
        { status: 400 }
      );
    }

    const { primary_archetype, variationKey, contrastDelta = 0.15 } = parsed.data;
    const delta = Math.max(0, Math.min(1, contrastDelta));
    const isKnownArchetype = VALID_ARCHETYPES.has(primary_archetype as (typeof LigsArchetypeEnum.options)[number]);
    const profileArchetype = isKnownArchetype ? primary_archetype : FALLBACK_PRIMARY_ARCHETYPE;
    const vkForPrompt = isKnownArchetype ? `cd${delta}` : `raw_${primary_archetype}_cd${delta}`;
    const vk = variationKey ? `${vkForPrompt}_${variationKey}` : vkForPrompt;

    const profile = buildMinimalVoiceProfile(profileArchetype as import("@/src/ligs/voice/schema").LigsArchetype);
    const baseUrl = getBaseUrl(req);
    const warnings: string[] = [];

    const logoMark = await fetchImageGenerate(baseUrl, {
      profile,
      purpose: "marketing_logo_mark",
      image: { aspectRatio: "1:1", size: "1024", count: 1 },
      variationKey: vk,
      archetype: profileArchetype,
    });
    const logoNorm = logoMark ? pickBackgroundSource({ images: [logoMark] }) : null;
    if (!logoNorm) warnings.push("No logoMark returned from image/generate");

    const marketingBackground = await fetchImageGenerate(baseUrl, {
      profile,
      purpose: "marketing_background",
      image: { aspectRatio: "16:9", size: "1024", count: 1 },
      variationKey: vk,
      archetype: profileArchetype,
    });
    const bgNorm = marketingBackground ? pickBackgroundSource({ images: [marketingBackground] }) : null;
    if (!bgNorm) warnings.push("No marketingBackground returned from image/generate");

    log("info", "marketing_visuals", {
      requestId,
      primary_archetype,
      hasLogo: !!logoNorm,
      hasBackground: !!bgNorm,
    });

    const response: Record<string, unknown> = {
      logoMark: logoNorm ?? undefined,
      marketingBackground: bgNorm ?? undefined,
    };
    // Ensure keys exist for consistent response shape (undefined omitted by JSON.stringify)
    if (response.logoMark === undefined) response.logoMark = null;
    if (response.marketingBackground === undefined) response.marketingBackground = null;
    if (warnings.length > 0) response.warnings = warnings;
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log("error", "marketing_visuals_failed", { requestId, error: message });
    return NextResponse.json(
      { error: "MARKETING_VISUALS_FAILED", message, requestId },
      { status: 500 }
    );
  }
}

async function fetchImageGenerate(
  baseUrl: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${baseUrl}/api/image/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) return null;
    const images = data.images as unknown[] | undefined;
    const first = images?.[0];
    if (first != null && typeof first === "object") return first as Record<string, unknown>;
    if (typeof first === "string") return { url: first };
    return null;
  } catch {
    return null;
  }
}
