"use client";

/**
 * LIGS Studio — internal control room for image generation and compose.
 * No automatic generation: user must explicitly trigger Generate/Compose/Full Pipeline.
 * Cursor/AI should not trigger generation; Studio is the control room.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { safeParseVoiceProfile } from "@/src/ligs/voice/schema";
import { FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import {
  pickBackgroundSource,
  backgroundToInputString,
  TINY_PNG_B64,
  isPlaceholderPng,
} from "@/lib/ligs-studio-utils";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { buildOverlaySpecWithCopy, getLogoStyleWithDefaults, type MarketingOverlaySpec } from "@/src/ligs/marketing";
import MarketingHeader from "./MarketingHeader";
import ArtifactCompare from "./ArtifactCompare";
import ArchetypeArtifactCard, { buildArtifactsFromProfile } from "./ArchetypeArtifactCard";
import { useApiStatus } from "@/hooks/useApiStatus";
import { PROOF_ONLY } from "@/lib/dry-run-config";
import { buildImagePromptSpec } from "@/src/ligs/image/buildImagePromptSpec";
import { getArchetypeStaticImagePath } from "@/lib/archetype-static-images";

/** Client-side placeholder generators (zero network, canvas-based). */
function createDryBackgroundPlaceholder(archetypeName: string, size = 1024): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#4a5568");
  gradient.addColorStop(1, "#2d3748");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(size / 20)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${archetypeName}`, size / 2, size / 2 - 30);
  ctx.font = `${Math.round(size / 30)}px system-ui, sans-serif`;
  ctx.fillText("BACKGROUND (DRY)", size / 2, size / 2 + 30);
  return canvas.toDataURL("image/png");
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = w.length > maxCharsPerLine ? w.slice(0, maxCharsPerLine) : w;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

/** Canonical Ignis proof copy for "Render Proof Card (FREE)". */
const PROOF_COPY = {
  headline: "Ignispectrum",
  subhead: "Transform with intensity.",
  cta: "Ignite change",
} as const;

export interface ProofCardResult {
  imageDataUrl: string;
  glyphUsed: boolean;
  glyphPath: string;
  outputDims: { width: number; height: number };
}

/**
 * Render Proof Card (FREE) — ZERO external calls.
 * Uses placeholder gradient, square_card_v1 overlay, Ignis archetype static image.
 * HARD FAIL if markType=archetype and glyph cannot load (no silent skip).
 */
function renderProofCardFree(size: number): Promise<ProofCardResult> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("renderProofCardFree requires browser"));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas 2d context unavailable"));
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#2d1b4e");
    gradient.addColorStop(0.5, "#1a0f2e");
    gradient.addColorStop(1, "#0d0618");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const profile = {
      id: "proof_vp",
      version: "1.0.0",
      ligs: { primary_archetype: "Ignispectrum", secondary_archetype: null, blend_weights: {} },
      formatting: { emoji_policy: "none" as const, exclamation_policy: "rare" as const },
      claims_policy: { medical_claims: "prohibited" as const, before_after_promises: "prohibited" as const },
      lexicon: { banned_words: [] as string[] },
    };
    const spec = buildOverlaySpecWithCopy(
      profile as import("@/src/ligs/voice/schema").VoiceProfile,
      { purpose: "marketing_background", templateId: "square_card_v1", size: size === 1536 ? "1536" : "1024", variationKey: "proof" },
      PROOF_COPY,
      "Ignispectrum"
    );

    const archetypeImagePath = getArchetypeStaticImagePath("Ignispectrum");
    if (!archetypeImagePath) {
      reject(new Error("ARCHETYPE_IMAGE_LOAD_FAILED: No static image for Ignispectrum"));
      return;
    }

    const archetypeImg = new Image();
    archetypeImg.crossOrigin = "anonymous";
    archetypeImg.onload = () => {
      const imgPct = 0.32;
      const centerX = 0.5;
      const centerY = 0.56;
      const imgW = size * imgPct;
      const tx = size * centerX - imgW / 2;
      const ty = size * centerY - imgW / 2;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(archetypeImg, tx, ty, imgW, imgW);
      ctx.globalAlpha = 1;
      if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GLYPH_DEBUG_OUTLINE === "true") {
        ctx.strokeStyle = "magenta";
        ctx.lineWidth = 1;
        ctx.strokeRect(tx, ty, imgW, imgW);
      }
      drawTextAndRest(ctx, spec, size, canvas, (url) => {
        resolve({
          imageDataUrl: url,
          glyphUsed: true,
          glyphPath: archetypeImagePath,
          outputDims: { width: size, height: size },
        });
      });
    };
    archetypeImg.onerror = () => {
      reject(new Error(`ARCHETYPE_IMAGE_LOAD_FAILED: ${archetypeImagePath} could not be loaded. No silent fallback.`));
    };
    archetypeImg.src = archetypeImagePath;
  });
}

function renderDryComposeFromSpec(
  backgroundDataUrl: string,
  spec: MarketingOverlaySpec,
  size: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(backgroundDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);

      const markType = (spec as { markType?: string }).markType ?? "brand";
      const markArchetype = (spec as { markArchetype?: string }).markArchetype;
      if (markType === "archetype" && markArchetype) {
        const archetypeImagePath = getArchetypeStaticImagePath(markArchetype);
        if (archetypeImagePath) {
          const archetypeImg = new Image();
          archetypeImg.crossOrigin = "anonymous";
          archetypeImg.onload = () => {
            const imgPct = 0.32;
            const centerX = 0.5;
            const centerY = 0.56;
            const imgW = size * imgPct;
            const tx = size * centerX - imgW / 2;
            const ty = size * centerY - imgW / 2;
            ctx.globalAlpha = 0.9;
            ctx.drawImage(archetypeImg, tx, ty, imgW, imgW);
            ctx.globalAlpha = 1;
            if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GLYPH_DEBUG_OUTLINE === "true") {
              ctx.strokeStyle = "magenta";
              ctx.lineWidth = 1;
              ctx.strokeRect(tx, ty, imgW, imgW);
            }
            drawTextAndRest(ctx, spec, size, canvas, resolve);
          };
          archetypeImg.onerror = () => {
            drawTextAndRest(ctx, spec, size, canvas, resolve);
          };
          archetypeImg.src = archetypeImagePath;
        } else {
          drawTextAndRest(ctx, spec, size, canvas, resolve);
        }
      } else {
        drawTextAndRest(ctx, spec, size, canvas, resolve);
      }
    };
    img.onerror = () => {
      const fallback = document.createElement("canvas");
      fallback.width = size;
      fallback.height = size;
      const ctx2 = fallback.getContext("2d");
      if (ctx2) {
        const g = ctx2.createLinearGradient(0, 0, size, size);
        g.addColorStop(0, "#4a5568");
        g.addColorStop(1, "#2d3748");
        ctx2.fillStyle = g;
        ctx2.fillRect(0, 0, size, size);
        drawTextAndRest(ctx2, spec, size, fallback, resolve);
      } else {
        resolve(backgroundDataUrl);
      }
    };
    img.src = backgroundDataUrl;
  });
}

function drawTextAndRest(
  ctx: CanvasRenderingContext2D,
  spec: MarketingOverlaySpec,
  size: number,
  canvas: HTMLCanvasElement,
  resolve: (url: string) => void
) {
  const tb = spec.placement.textBlock.box;
  const tbPx = {
    x: Math.round(tb.x * size),
    y: Math.round(tb.y * size),
    w: Math.round(tb.w * size),
    h: Math.round(tb.h * size),
  };
  const headlineLines = wrapText(spec.copy.headline ?? "", 25, 2);
  const subheadLines = spec.copy.subhead ? wrapText(spec.copy.subhead, 35, 3) : [];
  const lineHeight = 48;
  const headlineSize = spec.styleTokens.typography.headlineSize === "xl" ? 56 : 44;
  const subheadSize = spec.styleTokens.typography.subheadSize === "md" ? 32 : 28;
  const centerX = tbPx.x + tbPx.w / 2;
  let yOffset = tbPx.y + 36;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(tbPx.x, tbPx.y, tbPx.w, tbPx.h);
  ctx.fillStyle = "#FFFFFF";
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${spec.styleTokens.typography.weight === "semibold" ? "600" : "400"} ${headlineSize}px system-ui, sans-serif`;
  for (const line of headlineLines) {
    ctx.fillText(line, centerX, yOffset);
    yOffset += lineHeight;
  }
  ctx.font = `${subheadSize}px system-ui, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  for (const line of subheadLines) {
    ctx.fillText(line, centerX, yOffset);
    yOffset += lineHeight - 8;
  }

  if (spec.copy.cta && spec.placement.ctaChip) {
    const cc = spec.placement.ctaChip.box;
    const ccPx = {
      x: Math.round(cc.x * size),
      y: Math.round(cc.y * size),
      w: Math.round(cc.w * size),
      h: Math.round(cc.h * size),
    };
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    roundRect(ctx, ccPx.x, ccPx.y, ccPx.w, ccPx.h, 8);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = "600 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.copy.cta, ccPx.x + ccPx.w / 2, ccPx.y + ccPx.h / 2);
  }

  const ls = getLogoStyleWithDefaults(spec.styleTokens.logoStyle);
  const paddingPx = Math.round(size * 0.06);
  const logoSize = Math.round(size * 0.13);
  const logoLeft = paddingPx;
  const logoTop = size - paddingPx - logoSize;
  const radiusPx = Math.round(logoSize / 2 * ls.radius);
  ctx.fillStyle = ls.circleFill;
  ctx.beginPath();
  ctx.arc(logoLeft + logoSize / 2, logoTop + logoSize / 2, radiusPx - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ls.circleStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = ls.fill;
  const fontSize = Math.round(logoSize * 0.42);
  ctx.font = `${ls.weight} ${fontSize}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (ls.stroke && ls.strokeWidth > 0) {
    ctx.strokeStyle = ls.stroke;
    ctx.lineWidth = ls.strokeWidth;
    ctx.strokeText(ls.text, logoLeft + logoSize / 2, logoTop + logoSize / 2);
  }
  ctx.fillText(ls.text, logoLeft + logoSize / 2, logoTop + logoSize / 2);
  ctx.globalAlpha = 1;

  resolve(canvas.toDataURL("image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const STORAGE_KEY = "ligs_studio_inputs";
const DEFAULT_PROFILE = JSON.stringify(
  {
    id: "vp_studio",
    version: "1.0.0",
    created_at: "2025-02-20T12:00:00.000Z",
    owner_user_id: "u1",
    brand: { name: "LIGS Studio", products: [], audience: "" },
    ligs: { primary_archetype: "Ignispectrum", secondary_archetype: null, blend_weights: {} },
    descriptors: ["energy", "transform", "ignite", "vivid", "intensity"],
    cadence: {
      sentence_length: { target_words: 14, range: [8, 22] },
      paragraph_length: { target_sentences: 2, range: [1, 4] },
    },
    lexicon: { preferred_words: [], avoid_words: [], banned_words: [] },
    formatting: {
      emoji_policy: "none",
      exclamation_policy: "rare",
      capitalization: "standard",
      bullets: "allowed",
      headline_style: "",
    },
    claims_policy: {
      medical_claims: "prohibited",
      before_after_promises: "prohibited",
      substantiation_required: true,
      allowed_phrasing: [],
    },
    channel_adapters: {},
    examples: { do: [], dont: [] },
  },
  null,
  2
);

function loadStored() {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function saveStored(data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

type VariationRun = { variationImages: string[]; primary_archetype: string; variationKey: string };

export type StudioRunResult = {
  mode: "LIVE" | "DRY_RUN";
  requestId?: string;
  reportId?: string;
  savedToBlob: boolean;
  blobKeys?: { reportKey?: string; imageKeys?: string[]; beautyProfileKey?: string };
  warning?: string;
  full_report?: string;
  emotional_snippet?: string;
  vector_zero?: object;
  image_prompts?: string[];
  images?: Array<{ label: string; url: string; blobKey?: string }>;
  meta?: Record<string, unknown>;
};

function LatestRunOutputPanel({
  result,
  verifyResult,
  verifyLoading,
  onVerify,
  onCopy,
}: {
  result: StudioRunResult;
  verifyResult: Record<string, unknown> | null;
  verifyLoading: boolean;
  onVerify: () => void;
  onCopy: (text: string) => void;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggle = (key: string) =>
    setExpandedSection((s) => (s === key ? null : key));

  return (
    <div className="mb-4 p-4 rounded border-2 border-violet-200 bg-violet-50/50 space-y-3">
      <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide">
        Latest Run Output
      </p>

      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-mono text-gray-700">
          Mode: {result.mode} | reportId: {result.reportId ?? "—"}
        </span>
        <span
          className={
            result.savedToBlob
              ? "px-2 py-1 rounded bg-green-100 text-green-800 font-medium"
              : "px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium"
          }
        >
          Saved to Blob: {result.savedToBlob ? "Yes" : "No"}
        </span>
        {result.warning && (
          <span className="px-2 py-1 rounded bg-amber-200 text-amber-900 truncate max-w-xs" title={result.warning}>
            Warning: {result.warning}
          </span>
        )}
        <button
          className="px-2 py-1 rounded bg-violet-200 text-violet-800 hover:bg-violet-300 disabled:opacity-50"
          disabled={!result.reportId || result.reportId.startsWith("UNSAVED:") || verifyLoading}
          onClick={onVerify}
        >
          {verifyLoading ? "Verifying…" : "Verify saved to Blob"}
        </button>
        {verifyResult != null && (
          <span className={verifyResult.ok ? "text-green-700" : "text-red-700"}>
            Verify: {verifyResult.ok ? "OK" : (verifyResult.reason as string) ?? "FAIL"}
          </span>
        )}
      </div>

      {/* Accordions */}
      {result.full_report && (
        <div>
          <div className="flex items-center gap-2">
            <button
              className="flex-1 text-left py-2 px-2 rounded bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium"
              onClick={() => toggle("report")}
            >
              {expandedSection === "report" ? "▼" : "▶"} Full Report
            </button>
            <button
              className="px-2 py-1 text-xs text-violet-600 hover:bg-violet-100 rounded"
              onClick={() => onCopy(result.full_report ?? "")}
            >
              Copy
            </button>
          </div>
          {expandedSection === "report" && (
            <pre className="mt-2 p-3 rounded bg-white border border-gray-300 text-xs overflow-auto max-h-80 font-mono text-black">
              {result.full_report}
            </pre>
          )}
        </div>
      )}

      {(result.emotional_snippet || result.vector_zero) && (
        <div>
          <button
            className="text-left w-full py-2 px-2 rounded bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium"
            onClick={() => toggle("snippet")}
          >
            {expandedSection === "snippet" ? "▼" : "▶"} Snippet + Vector Zero
          </button>
          {expandedSection === "snippet" && (
            <div className="mt-2 space-y-2">
              {result.emotional_snippet && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Emotional snippet:</p>
                  <p className="p-2 rounded bg-white border border-gray-200 text-sm italic">
                    {result.emotional_snippet}
                  </p>
                </div>
              )}
              {result.vector_zero && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Vector Zero:</p>
                  <pre className="p-3 rounded bg-white border border-gray-300 text-xs overflow-auto max-h-48 font-mono">
                    {JSON.stringify(result.vector_zero, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {result.image_prompts && result.image_prompts.length > 0 && (
        <div>
          <button
            className="text-left w-full py-2 px-2 rounded bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium"
            onClick={() => toggle("prompts")}
          >
            {expandedSection === "prompts" ? "▼" : "▶"} Image Prompts ({result.image_prompts.length})
          </button>
          {expandedSection === "prompts" && (
            <ul className="mt-2 space-y-2 list-decimal list-inside">
              {result.image_prompts.map((p, i) => (
                <li key={i} className="p-2 rounded bg-white border border-gray-200 text-xs">
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result.images && result.images.length > 0 && (
        <div>
          <button
            className="text-left w-full py-2 px-2 rounded bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium"
            onClick={() => toggle("images")}
          >
            {expandedSection === "images" ? "▼" : "▶"} Images ({result.images.length})
          </button>
          {expandedSection === "images" && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {result.images.map((img, i) => (
                <div key={i} className="rounded border border-gray-200 overflow-hidden">
                  <img src={img.url} alt={img.label} className="w-full h-32 object-cover" />
                  <p className="p-1 text-xs">{img.label}</p>
                  {img.blobKey && <p className="p-1 text-xs text-gray-500 truncate" title={img.blobKey}>{img.blobKey}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {result.meta && Object.keys(result.meta).length > 0 && (
        <div>
          <button
            className="text-left w-full py-2 px-2 rounded bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium"
            onClick={() => toggle("meta")}
          >
            {expandedSection === "meta" ? "▼" : "▶"} Meta (e.g. forbiddenHitsDetected)
          </button>
          {expandedSection === "meta" && (
            <pre className="mt-2 p-3 rounded bg-white border border-gray-300 text-xs overflow-auto font-mono">
              {JSON.stringify(result.meta, null, 2)}
            </pre>
          )}
        </div>
      )}

      {verifyResult != null && (
        <div>
          <button
            className="text-left w-full py-2 px-2 rounded bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium"
            onClick={() => toggle("verify")}
          >
            {expandedSection === "verify" ? "▼" : "▶"} Persistence Verification
          </button>
          {expandedSection === "verify" && (
            <pre className="mt-2 p-3 rounded bg-white border border-gray-300 text-xs overflow-auto font-mono">
              {JSON.stringify(verifyResult, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function LigsStudio() {
  const { disabled: apiDisabled } = useApiStatus();
  const [profileJson, setProfileJson] = useState(DEFAULT_PROFILE);
  const [purpose, setPurpose] = useState<"marketing_background" | "share_card" | "archetype_background_from_glyph">("marketing_background");
  const [variationKey, setVariationKey] = useState("exemplar-v2");
  const [size, setSize] = useState<"1024" | "1536">("1024");
  const templateId = "square_card_v1";
  /** Compose output aspectRatio from template (square_card_v1 → 1:1). Background must match compose. */
  const composeOutputAspectRatio = templateId === "square_card_v1" ? "1:1" : "16:9";
  const backgroundGenParams = {
    aspectRatio: composeOutputAspectRatio as "1:1" | "16:9",
    size: "1024" as const,
    count: 1,
  };
  const [backgroundSource, setBackgroundSource] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [imageResult, setImageResult] = useState<Record<string, unknown> | null>(null);
  const [composeResult, setComposeResult] = useState<Record<string, unknown> | null>(null);
  const [savedExemplarUrls, setSavedExemplarUrls] = useState<{
    exemplarCard?: string;
    shareCard?: string;
    marketingBackground?: string;
  } | null>(null);
  const [variationHistory, setVariationHistory] = useState<VariationRun[]>([]);
  const [marketingResult, setMarketingResult] = useState<{
    descriptor: import("@/lib/marketing/types").MarketingDescriptor;
    assets: import("@/lib/marketing/types").MarketingAssets;
  } | null>(null);
  const [showMarketingLayer, setShowMarketingLayer] = useState(false);

  const [status, setStatus] = useState<{
    allowExternalWrites: boolean;
    provider: string;
    logoConfigured: boolean;
    logoFallbackAvailable?: boolean;
  } | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string>("");
  const [lastGenerateDebug, setLastGenerateDebug] = useState<{
    purpose?: string;
    purposeEchoed?: string;
    providerUsed?: string;
    dryRun?: boolean;
    cacheHit?: boolean;
    glyphBranchUsed?: boolean;
    buildSha?: string;
    requestId?: string;
    validation?: { pass?: boolean; score?: number; issues?: unknown[] };
    error?: string;
    imageUrl?: string;
  } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const [liveFullName, setLiveFullName] = useState("Dev User");
  const [liveBirthDate, setLiveBirthDate] = useState("1990-01-15");
  const [liveBirthTime, setLiveBirthTime] = useState("14:30");
  const [liveBirthLocation, setLiveBirthLocation] = useState("New York, NY");
  const [liveOnceLoading, setLiveOnceLoading] = useState(false);
  const [liveOnceResult, setLiveOnceResult] = useState<Record<string, unknown> | null>(null);
  const [liveOnceError, setLiveOnceError] = useState<string | null>(null);

  const [studioRunResult, setStudioRunResult] = useState<StudioRunResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [reportOnlyLoading, setReportOnlyLoading] = useState(false);
  const [reportOnlyError, setReportOnlyError] = useState<string | null>(null);
  const [reportOnlyResult, setReportOnlyResult] = useState<{ full_report: string; reportId?: string; emotional_snippet?: string } | null>(null);

  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [lastResultProfile, setLastResultProfile] = useState<Record<string, unknown> | null>(null);
  const [lastResultError, setLastResultError] = useState<string | null>(null);

  const [dryRunPreview, setDryRunPreview] = useState<{
    action: string;
    endpoint: string;
    method: string;
    payload: string;
  } | null>(null);
  const [dryRunPreviewOpen, setDryRunPreviewOpen] = useState(false);
  const [forceDryRun, setForceDryRun] = useState(PROOF_ONLY);
  const dryRunPreviewRef = useRef<HTMLDivElement>(null);
  const [dryRunResults, setDryRunResults] = useState<{
    lastAction: string;
    imageDataUrl?: string | null;
    marketingCopy?: { archetypeLabel: string; tagline: string; hitPoints: string[]; ctaText: string };
  } | null>(null);
  const [dryBackgroundDataUrl, setDryBackgroundDataUrl] = useState<string | null>(null);
  const [dryOverlaySpec, setDryOverlaySpec] = useState<MarketingOverlaySpec | null>(null);
  const [overlaySpecOpen, setOverlaySpecOpen] = useState(false);
  const [overlayDraftHeadline, setOverlayDraftHeadline] = useState("");
  const [overlayDraftSubhead, setOverlayDraftSubhead] = useState("");
  const [overlayDraftCta, setOverlayDraftCta] = useState("");

  const [proofResult, setProofResult] = useState<ProofCardResult | { error: string } | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const [glyphDebugData, setGlyphDebugData] = useState<Record<string, unknown> | null>(null);
  const [glyphDebugName, setGlyphDebugName] = useState("ignis");
  const [glyphDebugLoading, setGlyphDebugLoading] = useState(false);

  const [waitlistData, setWaitlistData] = useState<{
    total: number;
    recent: Array<{ email: string; created_at: string; source: string; preview_archetype?: string; solar_season?: string; name?: string }>;
    metrics: {
      total: number;
      last24h: number;
      last7d: number;
      bySource: { source: string; count: number; newestAt?: string }[];
      byArchetype: { archetype: string; count: number }[];
      originTerminalPct: number | null;
    };
  } | null>(null);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistSourceFilter, setWaitlistSourceFilter] = useState<string>("");

  const [pipelineStatus, setPipelineStatus] = useState<{
    stripeConfigured?: boolean;
    stripeMode?: string;
    stripeWebhookSecretConfigured?: boolean;
    stripeTestModeRequired?: boolean;
    emailConfigured?: boolean;
    blobConfigured?: boolean;
    ligsApiOff?: boolean;
    waitlistOnly?: boolean;
    nodeEnv?: string;
  } | null>(null);
  const [pipelineStatusError, setPipelineStatusError] = useState<string | null>(null);

  useEffect(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    fetch(`${base}/api/ligs/status`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setWaitlistLoading(true);
    setWaitlistError(null);
    const base = typeof window !== "undefined" ? window.location.origin : "";
    fetch(`${base}/api/waitlist/list`, { credentials: "include" })
      .then((r) => {
        if (r.ok) return r.json();
        if (r.status === 403) return Promise.reject(new Error("Access denied. Open /ligs-studio/login to authenticate."));
        if (r.status === 503) return Promise.reject(new Error("Waitlist storage not configured. Add BLOB_READ_WRITE_TOKEN to the server environment and redeploy."));
        return Promise.reject(new Error("Failed to load"));
      })
      .then((data) => {
        if (!cancelled) setWaitlistData(data);
      })
      .catch((err) => {
        if (!cancelled) setWaitlistError(err?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setWaitlistLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setPipelineStatusError(null);
    fetch(`${base}/api/studio/pipeline-status`, { credentials: "include" })
      .then((r) => {
        if (r.ok) return r.json();
        if (r.status === 403) throw new Error("Forbidden — login at /ligs-studio/login");
        throw new Error("Failed to load pipeline status");
      })
      .then(setPipelineStatus)
      .catch((e) => setPipelineStatusError(e?.message ?? "Failed"));
  }, []);

  const effectiveDryRun = forceDryRun;
  const liveBlocked = effectiveDryRun || PROOF_ONLY;

  const performDryRunExit = useCallback(
    (action: string, endpoint: string, method: string, payload: string) => {
      setDryRunPreview({ action, endpoint, method, payload });
      setDryRunPreviewOpen(true);
    },
    []
  );

  useEffect(() => {
    if (dryRunPreview && dryRunPreviewRef.current) {
      dryRunPreviewRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [dryRunPreview]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setShowMarketingLayer(params.get("showMarketing") === "1");
  }, []);

  const loadFromStorage = useCallback(() => {
    const stored = loadStored();
    if (stored) {
      let jsonToUse = stored.profileJson?.trim() || DEFAULT_PROFILE;
      try {
        const parsed = JSON.parse(jsonToUse);
        const result = safeParseVoiceProfile(parsed);
        if (!result.success) jsonToUse = DEFAULT_PROFILE;
      } catch {
        jsonToUse = DEFAULT_PROFILE;
      }
      setProfileJson(jsonToUse);
      if (["marketing_background", "share_card", "archetype_background_from_glyph"].includes(String(stored.purpose ?? ""))) {
        setPurpose(stored.purpose as "marketing_background" | "share_card" | "archetype_background_from_glyph");
      }
      if (stored.variationKey) setVariationKey(stored.variationKey);
      if (stored.size) setSize(stored.size);
    } else {
      setProfileJson(DEFAULT_PROFILE);
      setPurpose("marketing_background");
      setVariationKey("exemplar-v2");
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const persist = useCallback(() => {
    saveStored({ profileJson, purpose, variationKey, size });
  }, [profileJson, purpose, variationKey, size]);

  useEffect(() => {
    persist();
  }, [persist]);

  const { profile, profileError } = useMemo(() => {
    if (!profileJson?.trim()) return { profile: null as object | null, profileError: null as string | null };
    try {
      const parsed = JSON.parse(profileJson);
      const result = safeParseVoiceProfile(parsed);
      if (result.success) return { profile: result.data, profileError: null };
      return { profile: null, profileError: result.error.message };
    } catch (e) {
      return { profile: null, profileError: e instanceof Error ? e.message : "Invalid JSON" };
    }
  }, [profileJson]);

  useEffect(() => {
    const arch = (profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype;
    if (arch === "Ignispectrum") setPurpose("marketing_background");
  }, [profile]);

  const getBaseUrl = () => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  };

  const drySimulateBackground = useCallback(() => {
    if (!profile) return;
    const archetype = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    performDryRunExit(
      "Simulate Background",
      `${getBaseUrl()}/api/image/generate`,
      "POST",
      JSON.stringify({ profile, purpose, image: { aspectRatio: backgroundGenParams.aspectRatio, size: backgroundGenParams.size, count: backgroundGenParams.count }, variationKey }, null, 2)
    );
    const sz = size === "1536" ? 1536 : 1024;
    const dataUrl = createDryBackgroundPlaceholder(archetype, sz);
    setDryBackgroundDataUrl(dataUrl);
    setDryRunResults({ lastAction: "Simulate Background", imageDataUrl: dataUrl, marketingCopy: undefined });
  }, [profile, purpose, size, variationKey, backgroundGenParams, performDryRunExit]);

  const drySimulateCompose = useCallback(async () => {
    if (!profile) return;
    let bg: { url?: string; b64?: string } = {};
    if (backgroundSource.trim().startsWith("http")) bg = { url: backgroundSource.trim() };
    else if (backgroundSource.trim().length > 50) bg = { b64: backgroundSource.replace(/^data:image\/\w+;base64,/, "").trim() };
    else bg = { b64: TINY_PNG_B64 };
    performDryRunExit(
      "Simulate Compose",
      `${getBaseUrl()}/api/image/compose`,
      "POST",
      JSON.stringify({ profile, purpose, templateId: "square_card_v1", output: { size }, variationKey, background: bg }, null, 2)
    );
    const archetype = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    const sz = size === "1536" ? 1536 : 1024;
    const bgDataUrl =
      dryBackgroundDataUrl && dryBackgroundDataUrl.startsWith("data:")
        ? dryBackgroundDataUrl
        : (() => {
            const u = createDryBackgroundPlaceholder(archetype, sz);
            setDryBackgroundDataUrl(u);
            return u;
          })();
    const arch = (profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    const copy = {
      headline: overlayDraftHeadline.trim() || undefined,
      subhead: overlayDraftSubhead.trim() || undefined,
      cta: overlayDraftCta.trim() || undefined,
    };
    const spec = buildOverlaySpecWithCopy(
      profile as import("@/src/ligs/voice/schema").VoiceProfile,
      { purpose, templateId: "square_card_v1", size, variationKey },
      copy,
      arch
    );
    setDryOverlaySpec(spec);
    const composedUrl = await renderDryComposeFromSpec(bgDataUrl, spec, sz);
    setDryRunResults({ lastAction: "Simulate Compose", imageDataUrl: composedUrl, marketingCopy: undefined });
  }, [profile, purpose, size, variationKey, backgroundSource, performDryRunExit, dryBackgroundDataUrl, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

  const drySimulateFullPipeline = useCallback(() => {
    if (!profile) return;
    performDryRunExit(
      "Simulate Full Pipeline",
      `${getBaseUrl()}/api/image/generate`,
      "POST",
      JSON.stringify({ profile, purpose, image: { aspectRatio: backgroundGenParams.aspectRatio, size: backgroundGenParams.size, count: backgroundGenParams.count }, variationKey }, null, 2)
    );
  }, [profile, purpose, size, variationKey, backgroundGenParams, performDryRunExit]);

  const drySimulate6Variations = useCallback(() => {
    if (!profile) return;
    performDryRunExit(
      "Simulate 6 Variations",
      `${getBaseUrl()}/api/image/generate`,
      "POST",
      JSON.stringify({ profile, purpose, image: { aspectRatio: backgroundGenParams.aspectRatio, size: backgroundGenParams.size, count: backgroundGenParams.count }, variationKey: "demo-1" }, null, 2)
    );
  }, [profile, purpose, size, backgroundGenParams, performDryRunExit]);

  const drySimulateMarketing = useCallback(() => {
    if (!profile) return;
    const archetype = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype;
    if (!archetype) return;
    performDryRunExit(
      "Simulate Marketing",
      `${getBaseUrl()}/api/marketing/generate`,
      "POST",
      JSON.stringify({ primary_archetype: archetype, variationKey, contrastDelta: 0.15 }, null, 2)
    );
    const d = getMarketingDescriptor(archetype, { contrastDelta: 0.15 });
    setOverlayDraftHeadline(d.archetypeLabel);
    setOverlayDraftSubhead(d.tagline);
    setOverlayDraftCta(d.ctaText);
    setDryRunResults({
      lastAction: "Simulate Marketing",
      imageDataUrl: dryRunResults?.imageDataUrl ?? undefined,
      marketingCopy: {
        archetypeLabel: d.archetypeLabel,
        tagline: d.tagline,
        hitPoints: d.hitPoints ?? [],
        ctaText: d.ctaText,
      },
    });
  }, [profile, variationKey, performDryRunExit, dryRunResults?.imageDataUrl]);

  const runPreviewOverlayFree = useCallback(async () => {
    if (!profile) return;
    const archetype = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    const sz = size === "1536" ? 1536 : 1024;
    const fromImageResult = imageResult ? backgroundToInputString(pickBackgroundSource(imageResult as Record<string, unknown>)) : "";
    const bgDataUrl =
      fromImageResult && (fromImageResult.startsWith("data:") || fromImageResult.startsWith("http"))
        ? fromImageResult
        : dryBackgroundDataUrl && dryBackgroundDataUrl.startsWith("data:")
          ? dryBackgroundDataUrl
          : (() => {
              const u = createDryBackgroundPlaceholder(archetype, sz);
              setDryBackgroundDataUrl(u);
              return u;
            })();
    const copy = {
      headline: overlayDraftHeadline.trim() || undefined,
      subhead: overlayDraftSubhead.trim() || undefined,
      cta: overlayDraftCta.trim() || undefined,
    };
    const spec = buildOverlaySpecWithCopy(
      profile as import("@/src/ligs/voice/schema").VoiceProfile,
      { purpose, templateId: "square_card_v1", size, variationKey },
      copy,
      archetype
    );
    setDryOverlaySpec(spec);
    const composedUrl = await renderDryComposeFromSpec(bgDataUrl, spec, sz);
    setDryRunResults({ lastAction: "Preview Overlay (FREE)", imageDataUrl: composedUrl, marketingCopy: undefined });
    setComposeResult({ composedDisplayUrl: composedUrl, requestId: "preview-free", dryRun: true });
  }, [profile, purpose, size, variationKey, imageResult, dryBackgroundDataUrl, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

  const dryRerenderCompose = useCallback(async () => {
    if (!profile) return;
    const archetype = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    const sz = size === "1536" ? 1536 : 1024;
    const fromImage = imageResult ? backgroundToInputString(pickBackgroundSource(imageResult as Record<string, unknown>)) : "";
    const bgDataUrl =
      fromImage && (fromImage.startsWith("data:") || fromImage.startsWith("http"))
        ? fromImage
        : dryBackgroundDataUrl && dryBackgroundDataUrl.startsWith("data:")
        ? dryBackgroundDataUrl
        : (() => {
            const u = createDryBackgroundPlaceholder(archetype, sz);
            setDryBackgroundDataUrl(u);
            return u;
          })();
    const arch = (profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    const copy = {
      headline: overlayDraftHeadline.trim() || undefined,
      subhead: overlayDraftSubhead.trim() || undefined,
      cta: overlayDraftCta.trim() || undefined,
    };
    const spec = buildOverlaySpecWithCopy(
      profile as import("@/src/ligs/voice/schema").VoiceProfile,
      { purpose, templateId: "square_card_v1", size, variationKey },
      copy,
      arch
    );
    setDryOverlaySpec(spec);
    const composedUrl = await renderDryComposeFromSpec(bgDataUrl, spec, sz);
    setDryRunResults({ lastAction: "Re-render Compose (Dry)", imageDataUrl: composedUrl, marketingCopy: undefined });
  }, [profile, purpose, size, variationKey, imageResult, dryBackgroundDataUrl, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

  const drySimulateFullReport = useCallback(() => {
    performDryRunExit(
      "Simulate Full Report",
      `${getBaseUrl()}/api/dev/live-once`,
      "POST",
      JSON.stringify(
        { fullName: liveFullName, birthDate: liveBirthDate, birthTime: liveBirthTime, birthLocation: liveBirthLocation, email: "dev@example.com" },
        null,
        2
      )
    );
  }, [liveFullName, liveBirthDate, liveBirthTime, liveBirthLocation, performDryRunExit]);

  const runRenderProofCardFree = useCallback(async () => {
    setProofLoading(true);
    setProofResult(null);
    try {
      const sz = size === "1536" ? 1536 : 1024;
      const result = await renderProofCardFree(sz);
      setProofResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setProofResult({ error: msg });
    } finally {
      setProofLoading(false);
    }
  }, [size]);

  const fetchGlyphDebug = useCallback(async (name: string) => {
    setGlyphDebugName(name);
    setGlyphDebugLoading(true);
    setGlyphDebugData(null);
    try {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${base}/api/dev/glyph-debug?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      setGlyphDebugData(data);
    } catch (err) {
      setGlyphDebugData({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setGlyphDebugLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((effectiveDryRun || PROOF_ONLY) && !glyphDebugData && !glyphDebugLoading) {
      fetchGlyphDebug("ignis");
    }
  }, [effectiveDryRun, PROOF_ONLY, glyphDebugData, glyphDebugLoading, fetchGlyphDebug]);

  const runGenerateBackground = useCallback(async () => {
    if (!profile || apiDisabled) return;
    setLoading(true);
    setImageResult(null);
    setBackgroundUrl("");
    try {
      const res = await fetch(`${getBaseUrl()}/api/image/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          purpose,
          image: { aspectRatio: backgroundGenParams.aspectRatio, size: backgroundGenParams.size, count: backgroundGenParams.count },
          variationKey,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      setImageResult(data);
      setLastRequestId((data.requestId as string) ?? "");
      const img0 = (data.images as { url?: string; b64?: string }[])?.[0];
      setLastGenerateDebug({
        purpose,
        purposeEchoed: data.purposeEchoed as string | undefined,
        providerUsed: (data.providerUsed as string) ?? "—",
        dryRun: !!data.dryRun,
        cacheHit: !!data.cacheHit,
        glyphBranchUsed: data.glyphBranchUsed as boolean | undefined,
        buildSha: data.buildSha as string | undefined,
        requestId: data.requestId as string | undefined,
        validation: data.validation as { pass?: boolean; score?: number; issues?: unknown[] } | undefined,
        error: (data.message ?? data.error) as string | undefined,
        imageUrl: img0?.url ?? (img0?.b64 ? "data:image/png;base64,..." : undefined),
      });
      if (!res.ok) {
        setLastError((data.message as string) ?? (data.error as string) ?? "Request failed");
        return;
      }
      setLastError(null);
      const bg = pickBackgroundSource(data as Record<string, unknown>);
      if (bg) {
        setBackgroundSource(backgroundToInputString(bg));
        setBackgroundUrl(bg.url ?? "");
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, purpose, size, variationKey, backgroundGenParams]);

  const runCompose = useCallback(async () => {
    if (!profile || apiDisabled) return;
    let bg: { url?: string; b64?: string } = {};

    const fromImageResult = pickBackgroundSource(imageResult as Record<string, unknown>);
    if (fromImageResult?.url) {
      bg = { url: fromImageResult.url };
    } else if (backgroundUrl.trim()) {
      bg = { url: backgroundUrl.trim() };
    } else if (backgroundSource.trim().startsWith("http")) {
      bg = { url: backgroundSource.trim() };
    } else if (backgroundSource.trim().length > 50) {
      const b64 = backgroundSource.replace(/^data:image\/\w+;base64,/, "").trim();
      if (isPlaceholderPng(b64)) {
        setLastError("Compose blocked: background is placeholder (1x1). Generate Background first.");
        return;
      }
      bg = { b64 };
    } else {
      setLastError("Compose blocked: background is placeholder (1x1). Generate Background first.");
      return;
    }
    const arch = (profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    const overlaySpecToSend =
      dryOverlaySpec ??
      buildOverlaySpecWithCopy(
        profile as import("@/src/ligs/voice/schema").VoiceProfile,
        { purpose, templateId: "square_card_v1", size, variationKey },
        {
          headline: overlayDraftHeadline.trim() || undefined,
          subhead: overlayDraftSubhead.trim() || undefined,
          cta: overlayDraftCta.trim() || undefined,
        },
        arch
      );
    setLoading(true);
    setComposeResult(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/image/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          purpose,
          templateId: "square_card_v1",
          output: { size },
          variationKey,
          background: bg,
          overlaySpec: overlaySpecToSend,
        }),
      });
      const data = await res.json();
      setComposeResult(data);
      setLastRequestId((data.requestId as string) ?? "");
      if (!res.ok) {
        setLastError((data.message as string) ?? (data.error as string) ?? "Request failed");
      } else {
        const composedUrl = (data.composedDisplayUrl as string) ?? ((data.image as { b64?: string })?.b64 ? `data:image/png;base64,${(data.image as { b64: string }).b64}` : "");
        const bgStr = backgroundToInputString(bg);
        if (composedUrl && bgStr && composedUrl === bgStr) {
          setLastError("Compose did not run — response same as background");
        } else {
          setLastError(null);
        }
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, purpose, size, variationKey, imageResult, backgroundUrl, backgroundSource, dryOverlaySpec, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

  const runFullPipeline = useCallback(async () => {
    if (!profile || apiDisabled) return;
    setLoading(true);
    setImageResult(null);
    setComposeResult(null);
    setBackgroundUrl("");
    try {
      const genRes = await fetch(`${getBaseUrl()}/api/image/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          purpose,
          image: { aspectRatio: backgroundGenParams.aspectRatio, size: backgroundGenParams.size, count: backgroundGenParams.count },
          variationKey,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const genData = await genRes.json();
      setImageResult(genData);
      setLastRequestId((genData.requestId as string) ?? "");
      const gImg0 = (genData.images as { url?: string; b64?: string }[])?.[0];
      setLastGenerateDebug({
        purpose,
        purposeEchoed: genData.purposeEchoed as string | undefined,
        providerUsed: (genData.providerUsed as string) ?? "—",
        dryRun: !!genData.dryRun,
        cacheHit: !!genData.cacheHit,
        glyphBranchUsed: genData.glyphBranchUsed as boolean | undefined,
        buildSha: genData.buildSha as string | undefined,
        requestId: genData.requestId as string | undefined,
        validation: genData.validation as { pass?: boolean; score?: number; issues?: unknown[] } | undefined,
        error: (genData.message ?? genData.error) as string | undefined,
        imageUrl: gImg0?.url ?? (gImg0?.b64 ? "data:image/png;base64,..." : undefined),
      });
      if (!genRes.ok) {
        setLastError((genData.message as string) ?? (genData.error as string) ?? "Generate failed");
        return;
      }
      setLastError(null);
      const bg = pickBackgroundSource(genData as Record<string, unknown>);
      if (!bg?.url && !bg?.b64) {
        setLastError("No background returned from image/generate");
        return;
      }
      const arch = (profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
      const overlaySpecToSend =
        dryOverlaySpec ??
        buildOverlaySpecWithCopy(
          profile as import("@/src/ligs/voice/schema").VoiceProfile,
          { purpose, templateId: "square_card_v1", size, variationKey },
          {
            headline: overlayDraftHeadline.trim() || undefined,
            subhead: overlayDraftSubhead.trim() || undefined,
            cta: overlayDraftCta.trim() || undefined,
          },
          arch
        );
      const compRes = await fetch(`${getBaseUrl()}/api/image/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          purpose,
          templateId: "square_card_v1",
          output: { size },
          variationKey,
          background: bg,
          overlaySpec: overlaySpecToSend,
        }),
      });
      const compData = await compRes.json();
      setComposeResult(compData);
      setLastRequestId((compData.requestId as string) ?? "");
      if (!compRes.ok) {
        setLastError((compData.message as string) ?? (compData.error as string) ?? "Compose failed");
      } else {
        const composedUrl = (compData.composedDisplayUrl as string) ?? ((compData.image as { b64?: string })?.b64 ? `data:image/png;base64,${(compData.image as { b64: string }).b64}` : "");
        const bgStr = backgroundToInputString(bg);
        if (composedUrl && bgStr && composedUrl === bgStr) {
          setLastError("Compose did not run — response same as background");
        } else {
          setLastError(null);
        }
      }
      setBackgroundSource(backgroundToInputString(bg));
      setBackgroundUrl(bg.url ?? "");
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, purpose, size, variationKey, backgroundGenParams, dryOverlaySpec, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

  const run6Variations = useCallback(async () => {
    if (!profile || apiDisabled) return;
    setLoading(true);
    setComposeResult(null);
    const results: string[] = [];
    try {
      for (let i = 1; i <= 6; i++) {
        const kv = `demo-${i}`;
        const genRes = await fetch(`${getBaseUrl()}/api/image/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            purpose,
            image: { aspectRatio: backgroundGenParams.aspectRatio, size: backgroundGenParams.size, count: backgroundGenParams.count },
            variationKey: kv,
            idempotencyKey: crypto.randomUUID(),
          }),
        });
        const genData = (await genRes.json()) as Record<string, unknown>;
        setLastRequestId(String(genData.requestId ?? ""));
        const vImg0 = (genData.images as { url?: string; b64?: string }[])?.[0];
        setLastGenerateDebug({
          purpose,
          purposeEchoed: genData.purposeEchoed as string | undefined,
          providerUsed: (genData.providerUsed as string) ?? "—",
          dryRun: !!genData.dryRun,
          cacheHit: !!genData.cacheHit,
          glyphBranchUsed: genData.glyphBranchUsed as boolean | undefined,
          buildSha: genData.buildSha as string | undefined,
          requestId: genData.requestId as string | undefined,
          validation: genData.validation as { pass?: boolean; score?: number; issues?: unknown[] } | undefined,
          error: (genData.message ?? genData.error) as string | undefined,
          imageUrl: vImg0?.url ?? (vImg0?.b64 ? "data:image/png;base64,..." : undefined),
        });
        if (!genRes.ok) setLastError(String(genData.message ?? genData.error ?? "Generate failed"));
        else setLastError(null);
        const bg = pickBackgroundSource(genData) ?? { b64: TINY_PNG_B64 };
        const arch = (profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
        const overlaySpecToSend = buildOverlaySpecWithCopy(
          profile as import("@/src/ligs/voice/schema").VoiceProfile,
          { purpose, templateId: "square_card_v1", size, variationKey: kv },
          undefined,
          arch
        );
        const compRes = await fetch(`${getBaseUrl()}/api/image/compose`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            purpose,
            templateId: "square_card_v1",
            output: { size },
            variationKey: kv,
            background: bg,
            overlaySpec: overlaySpecToSend,
          }),
        });
        const compData = (await compRes.json()) as { requestId?: string; image?: { b64?: string }; error?: string; message?: string };
        setLastRequestId(compData.requestId ?? "");
        if (!compRes.ok) setLastError(compData.message ?? compData.error ?? "Compose failed");
        const b64 = compData.image?.b64;
        if (b64) results.push(`data:image/png;base64,${b64}`);
      }
      setComposeResult({ variationImages: results });
      if (results.length === 6 && profile) {
        const archetype = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? "—";
        setVariationHistory((prev) => {
          const next = [...prev, { variationImages: results, primary_archetype: archetype, variationKey: "demo-1 … demo-6" }];
          return next.slice(-2);
        });
      }
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "6 Variations failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, purpose, size, backgroundGenParams]);

  const runGenerateMarketing = useCallback(async () => {
    if (!profile || apiDisabled) return;
    const archetype = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype;
    if (!archetype) {
      setLastError("Profile has no primary_archetype");
      return;
    }
    setLoading(true);
    setLastError(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/marketing/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_archetype: archetype,
          variationKey,
          contrastDelta: 0.15,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLastError((data.message as string) ?? (data.error as string) ?? "Marketing generate failed");
        return;
      }
      setMarketingResult({ descriptor: data.descriptor, assets: data.assets ?? {} });
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Marketing generate failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, variationKey]);

  const canSaveToLanding =
    composeResult?.image &&
    typeof (composeResult.image as { b64?: string }).b64 === "string" &&
    (composeResult.image as { b64: string }).b64.length > 0;

  const runSaveMarketingBackground = useCallback(async () => {
    if (!profile || apiDisabled || effectiveDryRun || !imageResult) return;
    const bg = pickBackgroundSource(imageResult as Record<string, unknown>);
    if (!bg) return;
    setLoading(true);
    setLastError(null);
    try {
      let marketingBackgroundB64: string;
      if (bg.b64) {
        marketingBackgroundB64 = bg.b64.replace(/^data:image\/\w+;base64,/, "").trim();
      } else if (bg.url) {
        const res = await fetch(bg.url);
        if (!res.ok) throw new Error("Fetch failed");
        const blob = await res.blob();
        marketingBackgroundB64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => {
            const s = r.result as string;
            resolve(s.replace(/^data:[^;]+;base64,/, ""));
          };
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
      } else {
        setLoading(false);
        return;
      }
      const arch = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
      const version = arch === "Ignispectrum" ? "v2" : "v1";
      const saveRes = await fetch(`${getBaseUrl()}/api/exemplars/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype: arch,
          version,
          target: "marketing_background",
          marketingBackgroundB64,
        }),
      });
      const data = await saveRes.json();
      if (!saveRes.ok) {
        setLastError((data.message as string) ?? (data.error as string) ?? "Save failed");
        return;
      }
      const urls = (data.urls as { exemplarCard?: string; shareCard?: string; marketingBackground?: string }) ?? {};
      setSavedExemplarUrls((prev) => ({ ...prev, ...urls }));
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, imageResult, effectiveDryRun]);

  const runSaveExemplar = useCallback(
    async (target: "exemplar_card" | "share_card") => {
      if (!profile || !canSaveToLanding || apiDisabled || effectiveDryRun) return;
      const arch = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
      const exemplarCardB64 = (composeResult!.image as { b64: string }).b64.replace(/^data:image\/\w+;base64,/, "").trim();
      const spec = composeResult!.overlaySpec as { copy?: { headline?: string; subhead?: string; cta?: string } } | undefined;
      const version = arch === "Ignispectrum" ? "v2" : "v1";
      setLoading(true);
      setLastError(null);
      try {
        const res = await fetch(`${getBaseUrl()}/api/exemplars/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            archetype: arch,
            version,
            target,
            exemplarCardB64,
            overlay: {
              headline: spec?.copy?.headline,
              subhead: spec?.copy?.subhead,
              cta: spec?.copy?.cta,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setLastError((data.message as string) ?? (data.error as string) ?? "Save failed");
          return;
        }
        const urls = (data.urls as { exemplarCard?: string; shareCard?: string; marketingBackground?: string }) ?? {};
        setSavedExemplarUrls((prev) => ({ ...prev, ...urls }));
      } catch (e) {
        setLastError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setLoading(false);
      }
    },
    [apiDisabled, profile, composeResult, canSaveToLanding, effectiveDryRun]
  );

  const runLiveOnce = useCallback(async () => {
    const confirmed = window.confirm(
      "This will call OpenAI and may cost money. Continue?"
    );
    if (!confirmed) return;
    setLiveOnceLoading(true);
    setLiveOnceResult(null);
    setLiveOnceError(null);
    setStudioRunResult(null);
    setVerifyResult(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/dev/live-once`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: liveFullName,
          birthDate: liveBirthDate,
          birthTime: liveBirthTime,
          birthLocation: liveBirthLocation,
          email: "dev@example.com",
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setLiveOnceError((data.error ?? data.message ?? "Request failed") as string);
        return;
      }
      setLiveOnceResult(data);

      const payload = (data.data ?? data) as Record<string, unknown>;
      const reportId = (payload.reportId ?? data.reportId) as string | undefined;
      const warning = payload.warning as string | undefined;
      const savedToBlob =
        !!reportId &&
        !reportId.startsWith("UNSAVED:") &&
        !warning;

      setStudioRunResult({
        mode: "LIVE",
        requestId: (data.requestId ?? payload.requestId) as string | undefined,
        reportId,
        savedToBlob,
        warning,
        full_report: (payload.full_report ?? "") as string,
        emotional_snippet: (payload.emotional_snippet ?? "") as string,
        vector_zero: payload.vector_zero as object | undefined,
        image_prompts: Array.isArray(payload.image_prompts)
          ? (payload.image_prompts as string[])
          : [],
        images: [],
        meta: payload.meta as Record<string, unknown> | undefined,
      });
      if (reportId) setLastReportId(reportId);
    } catch (e) {
      setLiveOnceError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLiveOnceLoading(false);
    }
  }, [liveFullName, liveBirthDate, liveBirthTime, liveBirthLocation]);

  const runVerifySaved = useCallback(async () => {
    const reportId = studioRunResult?.reportId;
    if (!reportId) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/dev/verify-saved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      setVerifyResult(data as Record<string, unknown>);
    } catch (e) {
      setVerifyResult({
        ok: false,
        reason: "request_failed",
        message: e instanceof Error ? e.message : "Verify request failed",
      });
    } finally {
      setVerifyLoading(false);
    }
  }, [studioRunResult?.reportId]);

  const runReportOnly = useCallback(async () => {
    if (!effectiveDryRun && !window.confirm("This will call OpenAI and may cost money. Generate report only (no images)? Continue?")) return;
    setReportOnlyLoading(true);
    setReportOnlyError(null);
    setReportOnlyResult(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (!effectiveDryRun) headers["X-Force-Live"] = "1";
      const res = await fetch(`${getBaseUrl()}/api/engine/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          fullName: liveFullName,
          birthDate: liveBirthDate,
          birthTime: liveBirthTime,
          birthLocation: liveBirthLocation,
          email: "dev@example.com",
          dryRun: effectiveDryRun,
          idempotencyKey: effectiveDryRun ? undefined : crypto.randomUUID(),
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setReportOnlyError((data.error ?? data.message ?? "Request failed") as string);
        return;
      }
      const payload = (data.data ?? data) as Record<string, unknown>;
      const full_report = (payload.full_report ?? "") as string;
      const reportId = (payload.reportId ?? data.reportId) as string | undefined;
      const emotional_snippet = (payload.emotional_snippet ?? "") as string;
      setReportOnlyResult({ full_report, reportId, emotional_snippet });
    } catch (e) {
      setReportOnlyError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setReportOnlyLoading(false);
    }
  }, [effectiveDryRun, liveFullName, liveBirthDate, liveBirthTime, liveBirthLocation]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const refreshResult = useCallback(async () => {
    if (!lastReportId) return;
    setLastResultError(null);
    setLastResultProfile(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/beauty/${encodeURIComponent(lastReportId)}`);
      const json = (await res.json()) as { data?: Record<string, unknown>; error?: string };
      if (!res.ok) {
        setLastResultError((json.error as string) ?? "Failed to load");
        return;
      }
      const profile = (json.data ?? json) as Record<string, unknown>;
      setLastResultProfile(profile);
    } catch (e) {
      setLastResultError(e instanceof Error ? e.message : "Request failed");
    }
  }, [lastReportId]);

  const getGeneratePayload = () => {
    const p = profile;
    return p
      ? JSON.stringify(
          {
            profile: p,
            purpose,
            image: { aspectRatio: backgroundGenParams.aspectRatio, size: backgroundGenParams.size, count: backgroundGenParams.count },
            variationKey,
            idempotencyKey: crypto.randomUUID(),
          },
          null,
          2
        )
      : "";
  };

  const getComposePayload = () => {
    const p = profile;
    let bg: { url?: string; b64?: string } = {};
    const fromImageResult = pickBackgroundSource(imageResult as Record<string, unknown>);
    if (fromImageResult?.url) {
      bg = { url: fromImageResult.url };
    } else if (backgroundUrl.trim()) {
      bg = { url: backgroundUrl.trim() };
    } else if (backgroundSource.trim().startsWith("http")) {
      bg = { url: backgroundSource.trim() };
    } else if (backgroundSource.trim().length > 50) {
      const b64 = backgroundSource.replace(/^data:image\/\w+;base64,/, "").trim();
      if (!isPlaceholderPng(b64)) bg = { b64 };
      else bg = { url: "(placeholder — Generate Background first)" };
    } else {
      bg = { url: "(placeholder — Generate Background first)" };
    }
    return p
      ? JSON.stringify(
          {
            profile: p,
            purpose,
            templateId: "square_card_v1",
            output: { size },
            variationKey,
            background: bg,
          },
          null,
          2
        )
      : "";
  };

  const canRun = profile !== null;

  const lastCacheHit = imageResult && "cacheHit" in imageResult ? (imageResult.cacheHit as boolean) : null;
  const backgroundDisplayUrl = useMemo(
    () => (imageResult ? backgroundToInputString(pickBackgroundSource(imageResult as Record<string, unknown>)) : ""),
    [imageResult]
  );

  const canSaveMarketingBackground = !!backgroundDisplayUrl;

  const shell = "min-h-screen bg-[#0a0a0b] text-[#c8c8cc] p-4 md:p-6 text-sm font-mono";
  const sectionLabel = "text-[10px] uppercase tracking-widest text-[#6a6a70] mb-3";
  const panel = "mb-4 p-4 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#e8e8ec]";

  return (
    <div className={shell}>
      {/* —— STUDIO HEADER / CONTROL BAR —— */}
      <header className="mb-6 pb-4 border-b border-[#2a2a2e]">
        <h1 className="text-lg font-medium mb-1 text-[#e8e8ec]">LIGS Studio — launch control</h1>
        <p className="text-[11px] text-[#8a8a90] mb-3">Light Report preflight + delivery pipeline. All tools below; nothing removed.</p>
        <div className={panel}>
        <p className="text-xs font-semibold text-[#9a9aa0] uppercase tracking-wide mb-2">How to drive</p>
        <ol className="text-sm text-[#c8c8cc] space-y-1 list-decimal list-inside">
          <li><strong>Generate Background</strong> — DALL·E 3 creates the field (for Ignis: center void + radiating energy)</li>
          <li><strong>Compose Marketing Card</strong> — Adds archetype image anchor + headline/subhead/CTA over the background</li>
          <li><strong>Save</strong> — Exemplar Card (landing), Share Card, or Marketing Background</li>
        </ol>
        <p className="text-xs text-[#9a9aa0] mt-2">
          <strong className="text-[#c8c8cc]">Where do I add archetype visual?</strong> For Ignispectrum, the archetype image is added automatically in Compose. Set <code className="bg-[#1a1a1e] px-1 rounded text-[#c8c8cc]">primary_archetype: &quot;Ignispectrum&quot;</code> in VoiceProfile; the compose step uses <code className="bg-[#1a1a1e] px-1 rounded text-[#c8c8cc]">public/arc-static-images/ignispectrum-static1.png</code> and places it in the center void. No manual step.
        </p>
        </div>
      </header>

      {/* —— PRE-FLIGHT —— */}
      <section className="mb-6 pb-6 border-b border-[#2a2a2e]" aria-label="Pre-flight">
        <p className={sectionLabel}>01 — Pre-flight</p>
      <div className="mb-4 p-3 rounded border border-[#2a2a2e] bg-[#0d0d0f] space-y-2 text-[#c8c8cc]">
        <p className="text-xs font-semibold text-[#9a9aa0] uppercase tracking-wide">Warning Lights</p>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#c8c8cc]">
          <input
            type="checkbox"
            checked={forceDryRun}
            onChange={(e) => setForceDryRun(e.target.checked)}
          />
          Dry Run Mode (no API calls)
        </label>
        <div className="flex flex-wrap gap-3 text-xs">
          <span
            className={
              effectiveDryRun
                ? "px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium"
                : status?.allowExternalWrites
                  ? "px-2 py-1 rounded bg-red-100 text-red-800 font-medium"
                  : "px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium"
            }
          >
            Mode: {effectiveDryRun ? "DRY RUN (safe — no requests)" : status?.allowExternalWrites ? "LIVE (requests enabled)" : "LIVE disabled by server config"}
          </span>
          {!effectiveDryRun && !status?.allowExternalWrites && (
            <span className="block w-full mt-1 text-amber-800">
              → Set <code className="bg-amber-100 px-1 rounded">ALLOW_EXTERNAL_WRITES=true</code> in .env.local and restart.
            </span>
          )}
          <span className="text-[#8a8a90]">
            Provider: {status?.provider ? `DALL·E ${status.provider.replace("dall-e-", "")}` : "—"}
          </span>
          <span
            className={
              status?.logoConfigured
                ? "px-2 py-1 rounded bg-green-100 text-green-800"
                : status?.logoFallbackAvailable
                  ? "px-2 py-1 rounded bg-yellow-100 text-yellow-800"
                  : "px-2 py-1 rounded bg-amber-100 text-amber-800"
            }
          >
            Logo: {status ? (status.logoConfigured ? "OK" : "missing") : "—"}
          </span>
          <span className="text-[#8a8a90]">
            Cache: {lastCacheHit === true ? "hit" : lastCacheHit === false ? "miss" : "—"}
          </span>
          <span className="text-[#8a8a90] font-mono">Request: {lastRequestId || "—"}</span>
          {lastGenerateDebug && (
            <span className="text-xs font-mono text-[#9a9aa0] block sm:inline" title="Last Generate Background response">
              Last: purpose={String(lastGenerateDebug.purpose ?? "—")} provider={String(lastGenerateDebug.providerUsed ?? "—")} glyphBranch={String(lastGenerateDebug.glyphBranchUsed ?? "—")} mode={lastGenerateDebug.dryRun ? "dry" : "live"}
            </span>
          )}
          {lastError && (
            <span className="px-2 py-1 rounded bg-red-50 text-red-700 truncate max-w-xs" title={lastError}>
              Error: {lastError}
            </span>
          )}
        </div>
      </div>
      <div className="mb-4 p-3 rounded border border-[#2a2a2e] bg-[#0d0d0f] space-y-1 text-[#c8c8cc]">
        <p className="text-xs font-semibold text-[#9a9aa0] uppercase tracking-wide">Pipeline status (paid / delivery)</p>
        {pipelineStatusError && (
          <p className="text-xs text-amber-600">{pipelineStatusError}</p>
        )}
        {pipelineStatus && !pipelineStatusError && (
          <ul className="text-xs text-[#c8c8cc] font-mono space-y-0.5 list-none">
            <li>LIGS_API_OFF: {pipelineStatus.ligsApiOff ? "on" : "off"}</li>
            <li>WAITLIST_ONLY: {pipelineStatus.waitlistOnly ? "on" : "off"}</li>
            <li>Stripe configured: {pipelineStatus.stripeConfigured ? "yes" : "no"}</li>
            <li>Stripe mode: {pipelineStatus.stripeMode ?? "—"}</li>
            <li>Stripe test required: {pipelineStatus.stripeTestModeRequired ? "yes" : "no"}</li>
            <li>Webhook secret set: {pipelineStatus.stripeWebhookSecretConfigured ? "yes" : "no"}</li>
            <li>Email provider: {pipelineStatus.emailConfigured ? "configured" : "missing"}</li>
            <li>Blob token: {pipelineStatus.blobConfigured ? "set" : "missing"}</li>
            <li>NODE_ENV: {pipelineStatus.nodeEnv ?? "—"}</li>
          </ul>
        )}
      </div>
      </section>

      {/* —— REGISTRY / OPERATIONS —— */}
      <section className="mb-6 pb-6 border-b border-[#2a2a2e]" aria-label="Registry">
        <p className={sectionLabel}>02 — Registry / operations</p>
      <div className="mb-4 p-4 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#c8c8cc]">
        <p className="text-xs font-semibold text-[#9a9aa0] uppercase tracking-wide mb-3">Waitlist Registry (Internal)</p>
        {waitlistLoading && <p className="text-sm text-sky-700">Loading…</p>}
        {waitlistError && <p className="text-sm text-red-600 mb-2">{waitlistError}</p>}
        {waitlistData && !waitlistLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2 rounded bg-white border border-sky-200">
                <span className="text-sky-600 block">Total</span>
                <span className="font-mono font-semibold text-sky-900">{waitlistData.metrics.total}</span>
              </div>
              <div className="p-2 rounded bg-white border border-sky-200">
                <span className="text-sky-600 block">24h</span>
                <span className="font-mono font-semibold text-sky-900">{waitlistData.metrics.last24h}</span>
              </div>
              <div className="p-2 rounded bg-white border border-sky-200">
                <span className="text-sky-600 block">7d</span>
                <span className="font-mono font-semibold text-sky-900">{waitlistData.metrics.last7d}</span>
              </div>
              <div className="p-2 rounded bg-white border border-sky-200">
                <span className="text-sky-600 block">Origin %</span>
                <span className="font-mono font-semibold text-sky-900">{waitlistData.metrics.originTerminalPct ?? "—"}%</span>
              </div>
              <div className="p-2 rounded bg-white border border-sky-200 col-span-2 sm:col-span-1">
                <span className="text-sky-600 block">Nodes</span>
                <span className="font-mono font-semibold text-sky-900">{waitlistData.metrics.total}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-sky-800 mb-2">By source</p>
                <ul className="space-y-1 text-xs font-mono">
                  {waitlistData.metrics.bySource.map(({ source, count, newestAt }) => (
                    <li key={source} className="flex justify-between gap-2 items-center">
                      <span>{source}</span>
                      <span>{count}</span>
                      {newestAt && <span className="text-sky-600 text-[10px]" title={newestAt}>{new Date(newestAt).toLocaleDateString()}</span>}
                    </li>
                  ))}
                  {waitlistData.metrics.bySource.length === 0 && <li className="text-sky-600">—</li>}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-sky-800 mb-2">Top archetypes</p>
                <ul className="space-y-1 text-xs font-mono">
                  {waitlistData.metrics.byArchetype.slice(0, 8).map(({ archetype, count }) => (
                    <li key={archetype} className="flex justify-between gap-2">
                      <span>{archetype}</span>
                      <span>{count}</span>
                    </li>
                  ))}
                  {waitlistData.metrics.byArchetype.length === 0 && <li className="text-sky-600">—</li>}
                </ul>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium text-sky-800">Recent entries</p>
                <select
                  value={waitlistSourceFilter}
                  onChange={(e) => setWaitlistSourceFilter(e.target.value)}
                  className="text-xs rounded border border-sky-300 bg-white px-2 py-1"
                >
                  <option value="">All sources</option>
                  {waitlistData.metrics.bySource.map(({ source }) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded border border-sky-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-sky-50 border-b border-sky-200">
                    <tr>
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-left p-2 font-medium">Source</th>
                      <th className="text-left p-2 font-medium">Archetype</th>
                      <th className="text-left p-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlistData.recent
                      .filter((e) => !waitlistSourceFilter || e.source === waitlistSourceFilter)
                      .map((e, i) => (
                        <tr key={`${e.email}-${i}`} className="border-b border-sky-100 last:border-0">
                          <td className="p-2 font-mono truncate max-w-[160px]" title={e.email}>{e.email}</td>
                          <td className="p-2">{e.source}</td>
                          <td className="p-2">{e.preview_archetype ?? "—"}</td>
                          <td className="p-2" title={e.created_at}>
                            {new Date(e.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      </section>

      {/* —— FLIGHT / DELIVERY —— */}
      <section className="mb-6 pb-6 border-b border-[#2a2a2e]" aria-label="Flight">
        <p className={sectionLabel}>03 — Flight / delivery</p>
      {lastGenerateDebug && !effectiveDryRun && (
        <div className="mb-4 p-4 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#c8c8cc]">
          <p className="text-xs font-semibold text-[#9a9aa0] uppercase tracking-wide mb-3">Last Response Debug (Generate)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
            <div><span className="text-[#6a6a70]">providerUsed</span> {lastGenerateDebug.providerUsed ?? "—"}</div>
            <div><span className="text-[#6a6a70]">purpose (echoed)</span> {lastGenerateDebug.purposeEchoed ?? lastGenerateDebug.purpose ?? "—"}</div>
            <div><span className="text-[#6a6a70]">cacheHit</span> {String(lastGenerateDebug.cacheHit ?? "—")}</div>
            <div><span className="text-[#6a6a70]">glyphBranchUsed</span> {String(lastGenerateDebug.glyphBranchUsed ?? "—")}</div>
            <div><span className="text-[#6a6a70]">requestId</span> {lastGenerateDebug.requestId ?? "—"}</div>
            <div><span className="text-[#6a6a70]">buildSha</span> {lastGenerateDebug.buildSha ?? "—"}</div>
            {lastGenerateDebug.validation && (
              <div><span className="text-[#6a6a70]">validation</span> pass={String(lastGenerateDebug.validation.pass ?? "—")} score={lastGenerateDebug.validation.score ?? "—"}</div>
            )}
            {lastGenerateDebug.error && <div className="col-span-full text-red-600">error: {lastGenerateDebug.error}</div>}
            {lastGenerateDebug.imageUrl && (
              <div className="col-span-full">
                <span className="text-slate-500">image URL</span>{" "}
                {lastGenerateDebug.imageUrl.startsWith("data:") ? (
                  <span className="text-[#9a9aa0]">{lastGenerateDebug.imageUrl}</span>
                ) : (
                  <a href={lastGenerateDebug.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-full inline-block">
                    {lastGenerateDebug.imageUrl}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {composeResult && !effectiveDryRun && (
        <div className="mb-4 p-4 rounded border-2 border-emerald-200 bg-emerald-50/50">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-3">Last Response Debug (Compose)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
            <div><span className="text-emerald-700">requestId</span> {String(composeResult.requestId ?? "—")}</div>
            <div><span className="text-emerald-700">composedUrl</span> {(composeResult.composedUrl as string)?.startsWith("data:") ? "data:image/png;base64,..." : String(composeResult.composedUrl ?? "—")}</div>
            <div><span className="text-emerald-700">logoUsed</span> {String(composeResult.logoUsed ?? "—")}</div>
            <div><span className="text-emerald-700">glyphUsed</span> {String(composeResult.glyphUsed ?? "—")}</div>
            <div><span className="text-emerald-700">textRendered</span> {String(composeResult.textRendered ?? "—")}</div>
            <div><span className="text-emerald-700">dryRun</span> {String(composeResult.dryRun ?? "—")}</div>
          </div>
        </div>
      )}
      {((profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype === "Ignispectrum") && (
        <div className="mb-4 p-4 rounded border-2 border-violet-300 bg-violet-50">
          <p className="text-xs font-semibold text-violet-800 uppercase tracking-wide mb-1">Ignis: Archetype Anchor (Field-First)</p>
          <p className="text-[11px] text-violet-700 mb-2">Compose automatically adds this archetype image when archetype = Ignispectrum. Source: <code className="bg-violet-100 px-0.5 rounded">public/arc-static-images/ignispectrum-static1.png</code>. Generate Background creates the field; Compose places the archetype visual in the center void.</p>
          <div className="inline-block p-2 rounded border border-violet-200 bg-white">
            <img
              src={getArchetypeStaticImagePath("Ignispectrum") ?? "/arc-static-images/ignispectrum-static1.png"}
              alt="Ignis archetype (anchored in compose)"
              className="max-w-[200px] max-h-[200px] object-contain"
            />
          </div>
        </div>
      )}
      {PROOF_ONLY && (
        <div className="mb-4 p-3 rounded border-2 border-red-400 bg-red-50 text-red-900">
          <p className="text-sm font-semibold">PROOF ONLY: All live calls blocked. No DALL·E, no background generation, no compose API. Use &quot;Render Proof Card (FREE)&quot; to verify archetype image + overlay locally.</p>
        </div>
      )}
      <div className="mb-4 p-4 rounded border-2 border-teal-300 bg-teal-50 space-y-3">
        <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Report Only (no images)</p>
        <p className="text-sm text-teal-700">Generate a full field-resolution report. Stops at report text; no DALL·E or compose.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="block text-gray-600 text-xs mb-0.5">fullName</label>
            <input
              type="text"
              className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
              value={liveFullName}
              onChange={(e) => setLiveFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs mb-0.5">birthDate</label>
            <input
              type="text"
              className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
              value={liveBirthDate}
              onChange={(e) => setLiveBirthDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs mb-0.5">birthTime</label>
            <input
              type="text"
              className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
              value={liveBirthTime}
              onChange={(e) => setLiveBirthTime(e.target.value)}
              placeholder="HH:MM"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-xs mb-0.5">birthLocation</label>
            <input
              type="text"
              className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
              value={liveBirthLocation}
              onChange={(e) => setLiveBirthLocation(e.target.value)}
              placeholder="City, State"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded bg-teal-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700"
            disabled={reportOnlyLoading || apiDisabled}
            onClick={runReportOnly}
          >
            {reportOnlyLoading ? "Generating…" : "Generate Report"}
          </button>
          <span className="text-xs text-teal-800">
            {effectiveDryRun ? "Dry run (mock report)" : "Live (OpenAI)"}
          </span>
        </div>
        {reportOnlyError && (
          <p className="text-red-600 text-sm">{reportOnlyError}</p>
        )}
        {reportOnlyResult && (
          <div className="mt-3 p-3 rounded border border-teal-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-teal-800">Full Report</p>
              <div className="flex gap-2">
                {reportOnlyResult.reportId && (
                  <span className="text-xs text-gray-500">reportId: {reportOnlyResult.reportId}</span>
                )}
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded bg-teal-100 text-teal-800 hover:bg-teal-200"
                  onClick={() => copyToClipboard(reportOnlyResult.full_report)}
                >
                  Copy
                </button>
              </div>
            </div>
            <pre className="text-xs font-mono text-black overflow-auto max-h-96 p-3 rounded bg-gray-50 border border-gray-200 whitespace-pre-wrap">
              {reportOnlyResult.full_report}
            </pre>
          </div>
        )}
      </div>
      {(effectiveDryRun || PROOF_ONLY) && (
        <div className="mb-4 p-4 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#c8c8cc] space-y-3">
          <p className="text-xs font-semibold text-[#9a9aa0] uppercase tracking-wide">GLYPH SOURCE OF TRUTH AUDIT</p>
          <p className="text-xs text-slate-700">Candidate files: <code className="bg-slate-200 px-1 rounded">public/glyphs/ignis.svg</code> (canonical), <code className="bg-slate-200 px-1 rounded">public/icons/ignis_icon.svg</code> (UI icon)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-slate-300 hover:bg-slate-400"
              onClick={async () => {
                const base = typeof window !== "undefined" ? window.location.origin : "";
                for (const n of ["ignis", "ignis_icon"]) {
                  const r = await fetch(`${base}/api/dev/glyph-debug?name=${n}`);
                  const d = await r.json();
                  console.log(`[GLYPH-DEBUG] ${n}:`, d);
                }
              }}
            >
              Print all to console
            </button>
            {["ignis", "ignis_icon"].map((n) => (
              <button
                key={n}
                type="button"
                className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
                disabled={glyphDebugLoading}
                onClick={() => fetchGlyphDebug(n)}
              >
                Debug {n}
              </button>
            ))}
          </div>
          {glyphDebugData && (
            <div className="space-y-3">
              <pre className="text-[10px] font-mono overflow-auto max-h-40 p-2 rounded bg-slate-100 border border-slate-200">
                {JSON.stringify(glyphDebugData, null, 2)}
              </pre>
              {(glyphDebugData as { exists?: boolean }).exists && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-2 rounded border border-slate-300 bg-white">
                      <p className="text-[10px] font-semibold text-slate-700 mb-1">Raw Glyph (img) — direct from /glyphs/</p>
                      <img src={`/glyphs/${glyphDebugName}.svg`} alt={`Raw ${glyphDebugName}`} className="max-w-[200px] max-h-[200px] object-contain bg-slate-100" />
                    </div>
                    <div className="p-2 rounded border border-slate-300 bg-white">
                      <p className="text-[10px] font-semibold text-slate-700 mb-1">Raw Glyph (object) — SVG rendered directly</p>
                      <object data={`/glyphs/${glyphDebugName}.svg`} type="image/svg+xml" className="max-w-[200px] max-h-[200px] bg-slate-100" aria-label={`SVG ${glyphDebugName}`} />
                    </div>
                  </div>
                  <div className="p-2 rounded border border-slate-300 bg-white">
                    <p className="text-[10px] font-semibold text-slate-700 mb-1">Rasterized Glyph Debug (server) — sharp 512×512 contain-fit</p>
                    <img
                      src={typeof window !== "undefined" ? `${window.location.origin}/api/dev/glyph-rasterize?name=${encodeURIComponent(glyphDebugName)}` : ""}
                      alt={`Rasterized ${glyphDebugName}`}
                      className="max-w-[256px] max-h-[256px] object-contain bg-slate-100"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {(effectiveDryRun || PROOF_ONLY) && (
        <div className="mb-4 p-4 rounded border-2 border-emerald-600 bg-emerald-50 space-y-3">
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">PROOF OVERLAY (FREE)</p>
          <p className="text-xs text-emerald-900">Zero external calls. Placeholder background + Ignis archetype image + headline/subhead/CTA.</p>
          <button
            type="button"
            className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
            disabled={proofLoading}
            onClick={runRenderProofCardFree}
            title="No API calls. Renders square card with archetype image + Ignispectrum copy locally."
          >
            {proofLoading ? "…" : "Render Proof Card (FREE)"}
          </button>
          {proofResult && (
            <div className="mt-3 pt-3 border-t border-emerald-200 space-y-2">
              {"error" in proofResult ? (
                <div className="p-3 rounded bg-red-100 text-red-900 text-sm font-medium">
                  {proofResult.error}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 text-xs font-mono text-emerald-900">
                    <span>glyphUsed: {String(proofResult.glyphUsed)}</span>
                    <span>glyphPath: {proofResult.glyphPath}</span>
                    <span>outputDims: {proofResult.outputDims.width}×{proofResult.outputDims.height}</span>
                  </div>
                  <img
                    src={proofResult.imageDataUrl}
                    alt="Proof card"
                    className="max-w-full max-h-96 rounded border border-emerald-300 object-contain"
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
      {effectiveDryRun ? (
        <>
          <div className="mb-4 p-3 rounded border-2 border-amber-400 bg-amber-100 text-amber-900">
            <p className="text-sm font-semibold">DRY RUN: No requests will be sent.</p>
          </div>
          <div className="mb-4 p-4 rounded border-2 border-amber-300 bg-amber-50 space-y-3">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">DRY RUN CONTROLS</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">fullName</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveFullName}
                  onChange={(e) => setLiveFullName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">birthDate</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveBirthDate}
                  onChange={(e) => setLiveBirthDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">birthTime</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveBirthTime}
                  onChange={(e) => setLiveBirthTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">birthLocation</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveBirthLocation}
                  onChange={(e) => setLiveBirthLocation(e.target.value)}
                  placeholder="City, State"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded border-2 border-dashed border-amber-500 bg-amber-50 text-amber-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canRun}
                onClick={drySimulateFullReport}
              >
                Simulate Full Report
              </button>
            </div>
          </div>
          <div ref={dryRunPreviewRef} className="mb-4 rounded border-2 border-violet-200 bg-violet-50 overflow-hidden">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm font-semibold text-violet-800 hover:bg-violet-100 flex items-center gap-2"
              onClick={() => setDryRunPreviewOpen((o) => !o)}
            >
              {dryRunPreviewOpen ? "▼" : "▶"} Dry Run Preview{dryRunPreview ? `: ${dryRunPreview.action}` : ""}
            </button>
            {dryRunPreviewOpen && (
              <div className="p-4 bg-white border-t border-violet-200 space-y-3">
                {dryRunPreview ? (
                  <>
                    <div className="text-xs font-mono text-violet-900">
                      <p><span className="font-semibold">Endpoint:</span> {dryRunPreview.endpoint}</p>
                      <p><span className="font-semibold">Method:</span> {dryRunPreview.method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded bg-violet-200 text-violet-800 hover:bg-violet-300"
                        onClick={() => copyToClipboard(dryRunPreview.payload)}
                      >
                        Copy payload
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-violet-900 overflow-auto max-h-64 bg-gray-50 p-2 rounded border border-gray-200">
                      {dryRunPreview.payload}
                    </pre>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Click a Simulate button to preview the request payload.</p>
                )}
              </div>
            )}
          </div>
          <div className="mb-4 rounded border-2 border-amber-200 bg-amber-50 overflow-hidden">
            <p className="px-4 py-2 text-xs font-semibold text-amber-900 uppercase tracking-wide border-b border-amber-200 bg-amber-100">
              DRY RUN RESULTS
            </p>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {dryRunResults?.imageDataUrl ? (
                  <>
                    <p className="text-xs text-gray-600 mb-1">Last action: {dryRunResults.lastAction}</p>
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 mb-1 font-medium">Layout preview only</p>
                    <img
                      src={dryRunResults.imageDataUrl}
                      alt="Dry run layout preview"
                      className="max-w-full max-h-96 rounded border border-amber-300 object-contain"
                    />
                  </>
                ) : dryRunResults?.marketingCopy ? (
                  <div className="p-3 rounded bg-white border border-amber-200 text-sm space-y-2">
                    <p className="text-xs text-gray-600 mb-1">Last action: {dryRunResults.lastAction}</p>
                    <p><span className="font-semibold text-gray-700">Archetype:</span> {dryRunResults.marketingCopy.archetypeLabel}</p>
                    <p><span className="font-semibold text-gray-700">Tagline:</span> {dryRunResults.marketingCopy.tagline}</p>
                    {dryRunResults.marketingCopy.hitPoints.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-700">Hit points:</p>
                        <ul className="list-disc list-inside ml-1">
                          {dryRunResults.marketingCopy.hitPoints.map((hp, i) => (
                            <li key={i}>{hp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p><span className="font-semibold text-gray-700">CTA:</span> {dryRunResults.marketingCopy.ctaText}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Click a Simulate button to see preview outputs.</p>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Overlay Draft</p>
                <div>
                  <label className="block text-gray-600 text-xs mb-0.5">headline</label>
                  <input
                    type="text"
                    className="w-full p-2 text-sm rounded bg-white border border-amber-200 text-black"
                    value={overlayDraftHeadline}
                    onChange={(e) => setOverlayDraftHeadline(e.target.value)}
                    placeholder="Headline"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs mb-0.5">subhead</label>
                  <input
                    type="text"
                    className="w-full p-2 text-sm rounded bg-white border border-amber-200 text-black"
                    value={overlayDraftSubhead}
                    onChange={(e) => setOverlayDraftSubhead(e.target.value)}
                    placeholder="Subhead"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-xs mb-0.5">cta</label>
                  <input
                    type="text"
                    className="w-full p-2 text-sm rounded bg-white border border-amber-200 text-black"
                    value={overlayDraftCta}
                    onChange={(e) => setOverlayDraftCta(e.target.value)}
                    placeholder="CTA"
                  />
                </div>
                <button
                  type="button"
                  className="px-3 py-2 rounded border-2 border-dashed border-amber-500 bg-amber-100 text-amber-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={dryRerenderCompose}
                >
                  Re-render Compose (Dry)
                </button>
                {dryOverlaySpec && (
                  <div className="mt-3 rounded border border-amber-200 overflow-hidden">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 flex items-center gap-2"
                      onClick={() => setOverlaySpecOpen((o) => !o)}
                    >
                      {overlaySpecOpen ? "▼" : "▶"} Overlay Spec
                    </button>
                    {overlaySpecOpen && (
                      <div className="p-3 bg-white border-t border-amber-200">
                        <div className="flex justify-end mb-1">
                          <button
                            type="button"
                            className="px-2 py-1 text-xs rounded bg-amber-200 text-amber-900 hover:bg-amber-300"
                            onClick={() => copyToClipboard(JSON.stringify(dryOverlaySpec, null, 2))}
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-gray-800 overflow-auto max-h-48 bg-gray-50 p-2 rounded border border-amber-100">
                          {JSON.stringify(dryOverlaySpec, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-gray-600">VoiceProfile JSON</label>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs rounded border border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
                    onClick={() => {
                      setProfileJson(DEFAULT_PROFILE);
                      setPurpose("marketing_background");
                      setVariationKey("exemplar-v2");
                    }}
                    title="Reset to Ignis defaults for glyph-conditioned run"
                  >
                    Reset to Ignis
                  </button>
                </div>
                <textarea
                  className="w-full h-48 font-mono text-xs p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
                  value={profileJson}
                  onChange={(e) => setProfileJson(e.target.value)}
                />
                {profileError && (
                  <p className="text-red-600 text-xs mt-1">{profileError}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 mb-1">Purpose</label>
                  <select
                    className="w-full p-2 rounded bg-white border border-gray-300 text-black focus:border-violet-500 outline-none"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as "marketing_background" | "share_card" | "archetype_background_from_glyph")}
                  >
                    <option value="marketing_background">marketing_background</option>
                    <option value="share_card">share_card</option>
                    <option value="archetype_background_from_glyph">archetype_background_from_glyph</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">VariationKey</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
                    value={variationKey}
                    onChange={(e) => setVariationKey(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-600 mb-1">Size</label>
                  <select
                    className="w-full p-2 rounded bg-white border border-gray-300 text-black focus:border-violet-500 outline-none"
                    value={size}
                    onChange={(e) => setSize(e.target.value as "1024" | "1536")}
                  >
                    <option value="1024">1024</option>
                    <option value="1536">1536</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">TemplateId</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded bg-white border border-gray-300 text-black opacity-75"
                    value="square_card_v1"
                    readOnly
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Background (URL or base64)</label>
                <textarea
                  className="w-full h-16 font-mono text-xs p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
                  placeholder="Paste URL or base64 for compose-only testing"
                  value={backgroundSource}
                  onChange={(e) => setBackgroundSource(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" className="px-3 py-2 rounded border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canRun} onClick={drySimulateBackground}>
                  Simulate Background
                </button>
                <button type="button" className="text-xs text-gray-600 hover:text-black" onClick={() => copyToClipboard(getGeneratePayload())} title="Copy generate payload">
                  Copy payload
                </button>
                <button type="button" className="px-3 py-2 rounded border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canRun} onClick={drySimulateCompose}>
                  Simulate Compose
                </button>
                <button type="button" className="text-xs text-gray-600 hover:text-black" onClick={() => copyToClipboard(getComposePayload())} title="Copy compose payload">
                  Copy compose payload
                </button>
                <button type="button" className="px-3 py-2 rounded border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canRun} onClick={drySimulateFullPipeline}>
                  Simulate Full Pipeline
                </button>
                <button type="button" className="px-3 py-2 rounded border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canRun} onClick={drySimulate6Variations}>
                  Simulate 6 Variations
                </button>
                <button type="button" className="px-3 py-2 rounded border-2 border-dashed border-amber-400 bg-amber-50 text-amber-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canRun} onClick={drySimulateMarketing}>
                  Simulate Marketing
                </button>
              </div>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <p className="text-xs text-gray-500">LIVE mode shows actual generated images and composed output.</p>
            </div>
          </div>
        </>
      ) : (
        <>
          {status?.allowExternalWrites ? (
            <div className="mb-4 p-3 rounded border-2 border-green-300 bg-green-50 text-green-800">
              <p className="text-sm font-semibold">LIVE: API calls enabled</p>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded border-2 border-amber-400 bg-amber-100 text-amber-900">
              <p className="text-sm font-semibold">LIVE disabled by server config</p>
            </div>
          )}
          <div className="mb-4 p-4 rounded border-2 border-amber-300 bg-amber-50 space-y-3">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">LIVE CONTROLS</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">fullName</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveFullName}
                  onChange={(e) => setLiveFullName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">birthDate</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveBirthDate}
                  onChange={(e) => setLiveBirthDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">birthTime</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveBirthTime}
                  onChange={(e) => setLiveBirthTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-xs mb-0.5">birthLocation</label>
                <input
                  type="text"
                  className="w-full p-2 text-xs rounded bg-white border border-gray-300 text-black"
                  value={liveBirthLocation}
                  onChange={(e) => setLiveBirthLocation(e.target.value)}
                  placeholder="City, State"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded bg-amber-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={liveOnceLoading}
                onClick={runLiveOnce}
              >
                {liveOnceLoading ? "Running…" : "Run LIVE ONCE"}
              </button>
              <span className="text-xs text-amber-800">Dev-only. 1 request per server restart.</span>
            </div>
            {liveOnceError && (
              <p className="text-red-600 text-xs">{liveOnceError}</p>
            )}
          </div>
          <div className="mb-4 p-4 rounded border border-gray-300 bg-gray-50 space-y-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Results</p>
            {!lastReportId && !imageResult && !composeResult ? (
              <p className="text-sm text-gray-500">No results yet.</p>
            ) : (
              <div className="space-y-3">
                {lastReportId && (
                  <>
                    <div className="flex flex-wrap gap-2 items-center">
                      <a
                        href={`/beauty/view?reportId=${encodeURIComponent(lastReportId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Open Viewer
                      </a>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded bg-violet-200 text-violet-800 hover:bg-violet-300"
                        onClick={refreshResult}
                      >
                        Refresh result
                      </button>
                    </div>
                    {lastResultError && (
                      <p className="text-sm text-red-600">Error: {lastResultError}</p>
                    )}
                    {lastResultProfile && (
                      <div className="mt-2 p-3 rounded bg-white border border-gray-200 space-y-2 text-sm">
                        {lastResultProfile.dominantArchetype && (
                          <p><span className="text-gray-600">Archetype:</span> {String(lastResultProfile.dominantArchetype)}</p>
                        )}
                        {lastResultProfile.emotionalSnippet && (
                          <p><span className="text-gray-600">Snippet:</span> {String(lastResultProfile.emotionalSnippet).slice(0, 120)}{String(lastResultProfile.emotionalSnippet).length > 120 ? "…" : ""}</p>
                        )}
                        {Array.isArray(lastResultProfile.imageUrls) && lastResultProfile.imageUrls[0] && (
                          <div>
                            <p className="text-gray-600 mb-1">First image</p>
                            <img src={String(lastResultProfile.imageUrls[0])} alt="" className="max-w-[200px] h-auto rounded border" />
                          </div>
                        )}
                        {lastResultProfile.marketingCardUrl && (
                          <div>
                            <p className="text-gray-600 mb-1">Marketing card</p>
                            <img src={String(lastResultProfile.marketingCardUrl)} alt="" className="max-w-[200px] h-auto rounded border" />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {backgroundDisplayUrl && (
                  <div>
                    <p className="text-gray-600 mb-1 text-xs font-medium">Step 1: Generated Background</p>
                    <ArchetypeArtifactCard
                      imageUrl={backgroundDisplayUrl}
                      archetype={(profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype}
                      artifacts={profile ? buildArtifactsFromProfile({ ...profile, variationKey } as Record<string, unknown>) : {}}
                      imageAlt="Background"
                      showDevFields
                    />
                  </div>
                )}
                {((composeResult?.image as { b64?: string } | undefined)?.b64) && (
                  <div>
                    <p className="text-gray-600 mb-1 text-xs font-medium">Step 2: Composed Card (Marketing Overlay)</p>
                    <ArchetypeArtifactCard
                      imageUrl={`data:image/png;base64,${(composeResult!.image as { b64: string }).b64}`}
                      archetype={(profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype}
                      artifacts={profile ? buildArtifactsFromProfile({ ...profile, variationKey } as Record<string, unknown>) : {}}
                      imageAlt="Composed marketing card"
                      showDevFields
                      aspectRatio="square"
                    />
                  </div>
                )}
                {(backgroundDisplayUrl || composeResult) && (
                  <div className="p-3 rounded border border-gray-200 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Manifest URLs (after save)</p>
                    <pre className="text-[11px] font-mono text-gray-800 overflow-auto">
                      {JSON.stringify(
                        {
                          marketingBackgroundUrl: savedExemplarUrls?.marketingBackground ?? backgroundDisplayUrl ?? "—",
                          exemplarCardUrl: savedExemplarUrls?.exemplarCard ?? "—",
                          shareCardUrl: savedExemplarUrls?.shareCard ?? "—",
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
                {composeResult?.overlaySpec ? (
                  <div className="rounded border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-2"
                      onClick={() => setOverlaySpecOpen((o) => !o)}
                    >
                      {overlaySpecOpen ? "▼" : "▶"} overlaySpec JSON
                    </button>
                    {overlaySpecOpen && (
                      <div className="p-3 bg-white border-t border-gray-200">
                        <div className="flex justify-end mb-1">
                          <button
                            type="button"
                            className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                            onClick={() => copyToClipboard(JSON.stringify(composeResult.overlaySpec, null, 2))}
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-gray-800 overflow-auto max-h-48 bg-gray-50 p-2 rounded border border-gray-100">
                          {JSON.stringify(composeResult.overlaySpec, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
      {studioRunResult && (
        <LatestRunOutputPanel
          result={studioRunResult}
          verifyResult={verifyResult}
          verifyLoading={verifyLoading}
          onVerify={runVerifySaved}
          onCopy={copyToClipboard}
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="block text-gray-600">VoiceProfile JSON</label>
              <button
                type="button"
                className="px-2 py-1 text-xs rounded border border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
                onClick={() => {
                  setProfileJson(DEFAULT_PROFILE);
                  setPurpose("marketing_background");
                  setVariationKey("exemplar-v2");
                }}
                title="Reset to Ignis defaults for glyph-conditioned run"
              >
                Reset to Ignis
              </button>
            </div>
            <textarea
              className="w-full h-48 font-mono text-xs p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
              value={profileJson}
              onChange={(e) => setProfileJson(e.target.value)}
            />
            {profileError && (
              <p className="text-red-600 text-xs mt-1">{profileError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-600 mb-1">Purpose</label>
              <select
                className="w-full p-2 rounded bg-white border border-gray-300 text-black focus:border-violet-500 outline-none"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as "marketing_background" | "share_card" | "archetype_background_from_glyph")}
              >
                <option value="marketing_background">marketing_background</option>
                <option value="share_card">share_card</option>
                <option value="archetype_background_from_glyph">archetype_background_from_glyph</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">VariationKey</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
                value={variationKey}
                onChange={(e) => setVariationKey(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-600 mb-1">Size</label>
              <select
                className="w-full p-2 rounded bg-white border border-gray-300 text-black focus:border-violet-500 outline-none"
                value={size}
                onChange={(e) => setSize(e.target.value as "1024" | "1536")}
              >
                <option value="1024">1024</option>
                <option value="1536">1536</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-600 mb-1">TemplateId</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-white border border-gray-300 text-black opacity-75"
                value="square_card_v1"
                readOnly
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Background (URL or base64)</label>
            <textarea
              className="w-full h-16 font-mono text-xs p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
              placeholder="Paste URL or base64 for compose-only testing"
              value={backgroundSource}
              onChange={(e) => setBackgroundSource(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className="px-3 py-2 rounded bg-accent-violet text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading || liveBlocked}
              onClick={runGenerateBackground}
            >
              {liveBlocked ? "Blocked" : apiDisabled ? "Unavailable" : loading ? "…" : "Generate Background"}
            </button>
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-black"
              onClick={() => copyToClipboard(getGeneratePayload())}
              title="Copy generate payload"
            >
              Copy payload
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
              disabled={!canRun || loading}
              onClick={runPreviewOverlayFree}
              title="No API calls. Renders overlay (archetype image + text + CTA) on background. Use before Live compose."
            >
              {loading ? "…" : "Preview Overlay (FREE)"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-accent-violet text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading || liveBlocked}
              onClick={runCompose}
            >
              {liveBlocked ? "Blocked" : apiDisabled ? "Unavailable" : loading ? "…" : "Compose Marketing Card"}
            </button>
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-black"
              onClick={() => copyToClipboard(getComposePayload())}
              title="Copy compose payload"
            >
              Copy compose payload
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-accent-violet text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading || liveBlocked}
              onClick={runFullPipeline}
            >
              {liveBlocked ? "Blocked" : apiDisabled ? "Unavailable" : loading ? "…" : "Run Full Pipeline"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded border border-gray-300 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading || liveBlocked}
              onClick={run6Variations}
            >
              {liveBlocked ? "Blocked" : apiDisabled ? "Unavailable" : loading ? "…" : "Generate 6 Variations"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-violet-100 text-violet-800 border border-violet-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading || liveBlocked}
              onClick={runGenerateMarketing}
            >
              {liveBlocked ? "Blocked" : apiDisabled ? "Unavailable" : loading ? "…" : "Generate Marketing"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
              disabled={apiDisabled || liveBlocked || !canSaveToLanding || loading}
              onClick={() => runSaveExemplar("exemplar_card")}
              title={canSaveToLanding ? "Save composed image as exemplar card (Landing Examples)" : "Compose an image first"}
            >
              {apiDisabled || liveBlocked ? "Unavailable" : loading ? "…" : "Save as Exemplar Card (Landing)"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-teal-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700"
              disabled={apiDisabled || liveBlocked || !canSaveToLanding || loading}
              onClick={() => runSaveExemplar("share_card")}
              title={canSaveToLanding ? "Save composed image as share card (manifest.urls.shareCard)" : "Compose an image first"}
            >
              {apiDisabled || liveBlocked ? "Unavailable" : loading ? "…" : "Save as Share Card"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-amber-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-700"
              disabled={apiDisabled || liveBlocked || !canSaveMarketingBackground || loading}
              onClick={runSaveMarketingBackground}
              title={canSaveMarketingBackground ? "Save Step 1 background to manifest.urls.marketingBackground" : "Generate background first"}
            >
              {apiDisabled || liveBlocked ? "Unavailable" : loading ? "…" : "Save as Marketing Background"}
            </button>
          </div>
          {(savedExemplarUrls?.exemplarCard || savedExemplarUrls?.shareCard || savedExemplarUrls?.marketingBackground) && (
            <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-sm space-y-2">
              <p className="font-semibold text-emerald-800">Saved. Refresh /beauty to see in Examples.</p>
              {savedExemplarUrls.exemplarCard && (
                <a href={savedExemplarUrls.exemplarCard} target="_blank" rel="noopener noreferrer" className="text-emerald-700 text-xs underline block">
                  Exemplar card
                </a>
              )}
              {savedExemplarUrls.shareCard && (
                <a href={savedExemplarUrls.shareCard} target="_blank" rel="noopener noreferrer" className="text-teal-700 text-xs underline block">
                  Share card
                </a>
              )}
              {savedExemplarUrls.marketingBackground && (
                <a href={savedExemplarUrls.marketingBackground} target="_blank" rel="noopener noreferrer" className="text-amber-700 text-xs underline block">
                  Marketing background
                </a>
              )}
            </div>
          )}
          {marketingResult && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={showMarketingLayer}
                onChange={(e) => setShowMarketingLayer(e.target.checked)}
              />
              Show Marketing Layer
            </label>
          )}
        </div>
        <div className="space-y-4">
          <StatusBox imageResult={imageResult} composeResult={composeResult} />
          {marketingResult && (
            <MarketingHeader
              descriptor={marketingResult.descriptor}
              assets={marketingResult.assets}
              showMarketingLayer={showMarketingLayer}
              className="mt-4"
            />
          )}
          {imageResult && (
            <>
              <div className="p-3 rounded border-2 border-violet-200 bg-violet-50">
                <p className="text-sm font-semibold text-violet-900 mb-2">Step 1: Generated Background (1:1, 1024×1024)</p>
                {backgroundDisplayUrl ? (
                  <div className="space-y-2">
                    <img
                      src={backgroundDisplayUrl}
                      alt="Generated background"
                      className="max-w-full w-full max-h-[400px] object-contain rounded border border-gray-200 bg-white"
                    />
                    <p className="text-xs text-violet-700">
                      Use for Compose, or copy the Background URL from the field below.
                    </p>
                  </div>
                ) : (imageResult.dryRun || !(imageResult.images as unknown[])?.length) ? (
                  <p className="text-sm text-amber-800">
                    No image — server returned dry run or empty. Set <code className="bg-amber-100 px-1">ALLOW_EXTERNAL_WRITES=true</code> in .env.local and restart.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">Image loading…</p>
                )}
              </div>
              <div className="mt-2">
                <JsonPanel
                  title="Spec + Validation"
                  data={{
                    spec: imageResult.spec,
                    validation: imageResult.validation,
                  }}
                  onCopy={() => copyToClipboard(JSON.stringify(imageResult, null, 2))}
                />
              </div>
            </>
          )}
          {composeResult && ((composeResult.image as { b64?: string })?.b64) && (
            <div className="p-3 rounded border-2 border-emerald-200 bg-emerald-50">
              <p className="text-sm font-semibold text-emerald-900 mb-2">Step 2: Composed Marketing Card</p>
              {(composeResult.composedDisplayUrl as string) && (
                <p className="text-xs text-emerald-800 mb-2">
                  Composed image URL: {(composeResult.composedDisplayUrl as string).startsWith("data:") ? "data:image/png;base64,..." : (composeResult.composedDisplayUrl as string)}
                </p>
              )}
              <div className="aspect-square max-w-[400px]">
                <img
                  src={(composeResult.composedDisplayUrl as string) ?? `data:image/png;base64,${(composeResult.image as { b64: string }).b64}`}
                  alt="Composed marketing card"
                  className="w-full h-full object-contain rounded border border-gray-200 bg-white"
                />
              </div>
            </div>
          )}
          {variationHistory.length >= 1 && (
            <div>
              <p className="text-gray-600 mb-2">Compare Runs</p>
              <ArtifactCompare
                leftRun={variationHistory.length >= 2 ? variationHistory[0] : null}
                rightRun={variationHistory[variationHistory.length - 1]}
                leftLabel={variationHistory.length >= 2 ? "Previous run" : "—"}
                rightLabel="Current run"
              />
            </div>
          )}
          {composeResult && !composeResult.variationImages && (
            <JsonPanel
              title="Overlay Spec + Validation"
              data={{
                overlaySpec: composeResult.overlaySpec,
                overlayValidation: composeResult.overlayValidation,
              }}
              onCopy={() => copyToClipboard(JSON.stringify(composeResult, null, 2))}
            />
          )}
        </div>
      </div>
        </>
      )}
      </section>
    </div>
  );
}

function StatusBox({
  imageResult,
  composeResult,
}: {
  imageResult: Record<string, unknown> | null;
  composeResult: Record<string, unknown> | null;
}) {
  return (
    <div className="p-3 rounded bg-gray-100 border border-gray-300 text-gray-800 space-y-1 text-xs">
      <p className="font-semibold">Status</p>
      {imageResult && (
        <>
          <p>Image: requestId={String(imageResult.requestId)} dryRun={String(imageResult.dryRun)}</p>
          <p>Image validation: score={(imageResult.validation as { score?: number })?.score} pass={String((imageResult.validation as { pass?: boolean })?.pass)}</p>
          {imageResult.cacheHit != null && <p>cacheHit={String(imageResult.cacheHit)}</p>}
        </>
      )}
      {composeResult && (
        <>
          <p>Compose: requestId={String(composeResult.requestId)} dryRun={String(composeResult.dryRun)}</p>
          {(composeResult.composedUrl as string) && (
            <p>composedUrl: {(composeResult.composedUrl as string).startsWith("data:") ? "data:image/png;base64,..." : String(composeResult.composedUrl)}</p>
          )}
          {composeResult.logoUsed != null && <p>logoUsed={String(composeResult.logoUsed)}</p>}
          {composeResult.glyphUsed != null && <p>glyphUsed={String(composeResult.glyphUsed)}</p>}
          {composeResult.textRendered != null && <p>textRendered={String(composeResult.textRendered)}</p>}
          <p>Overlay validation: score={(composeResult.overlayValidation as { score?: number })?.score} pass={String((composeResult.overlayValidation as { pass?: boolean })?.pass)}</p>
        </>
      )}
      {!imageResult && !composeResult && <p className="text-gray-500">No results yet.</p>}
    </div>
  );
}

function JsonPanel({
  title,
  data,
  onCopy,
}: {
  title: string;
  data: Record<string, unknown>;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <p className="text-gray-600">{title}</p>
        <button
          className="text-xs text-violet-600 hover:underline"
          onClick={onCopy}
        >
          Copy response JSON
        </button>
      </div>
      <pre className="p-2 rounded bg-gray-100 border border-gray-300 text-gray-800 text-xs overflow-auto max-h-48">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
