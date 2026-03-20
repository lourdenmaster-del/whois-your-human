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
import { PROOF_ONLY, FAKE_PAY } from "@/lib/dry-run-config";
import { setBeautyUnlocked } from "@/lib/landing-storage";
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
  const [reportOnlyResult, setReportOnlyResult] = useState<{ full_report: string; reportId?: string; emotional_snippet?: string; paidWhoisText?: string } | null>(null);
  const [reportOnlyDebugOpen, setReportOnlyDebugOpen] = useState(false);

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
  /** Internal operator waitlist actions — resend/reset; not shown on /origin. */
  const [waitlistOperatorMessage, setWaitlistOperatorMessage] = useState<string | null>(null);
  const [waitlistActionEmail, setWaitlistActionEmail] = useState<string | null>(null);

  const [reportLibrary, setReportLibrary] = useState<Array<{ reportId: string; subjectName: string; emotionalSnippet: string }>>([]);
  const [reportLibraryLoading, setReportLibraryLoading] = useState(false);
  const [reportLibraryError, setReportLibraryError] = useState<string | null>(null);
  const [unlockReportId, setUnlockReportId] = useState<string | null>(null);

  const loadReportLibrary = useCallback(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setReportLibraryLoading(true);
    setReportLibraryError(null);
    fetch(`${base}/api/report/previews?maxPreviews=20`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then((json: { previewCards?: Array<{ reportId: string; subjectName: string; emotionalSnippet: string }> }) => {
        const cards = json.previewCards ?? [];
        setReportLibrary(cards.filter((c) => c.reportId && !c.reportId.startsWith("preview-")));
      })
      .catch((err) => setReportLibraryError(err?.message ?? "Failed to load"))
      .finally(() => setReportLibraryLoading(false));
  }, []);

  const handleUnlockCheckout = useCallback(async (reportId: string) => {
    if (!reportId) return;
    if (FAKE_PAY) {
      setBeautyUnlocked();
      window.location.href = "/beauty/start";
      return;
    }
    setUnlockReportId(reportId);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { url?: string }; url?: string };
      if (!res.ok) {
        setUnlockReportId(null);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
        return;
      }
    } catch {
      /* ignore */
    } finally {
      setUnlockReportId(null);
    }
  }, []);

  const loadWaitlist = useCallback(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setWaitlistLoading(true);
    setWaitlistError(null);
    fetch(`${base}/api/waitlist/list`, { credentials: "include" })
      .then((r) => {
        if (r.ok) return r.json();
        if (r.status === 403) return Promise.reject(new Error("Access denied."));
        if (r.status === 503) return Promise.reject(new Error("Blob not configured."));
        return Promise.reject(new Error("Failed to load"));
      })
      .then(setWaitlistData)
      .catch((err) => setWaitlistError(err?.message ?? "Failed to load"))
      .finally(() => setWaitlistLoading(false));
  }, []);

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

  const waitlistResend = useCallback(
    (email: string) => {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      setWaitlistActionEmail(email);
      setWaitlistOperatorMessage(null);
      fetch(`${base}/api/waitlist/resend`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (r.status === 404) {
            setWaitlistOperatorMessage("Resend: entry not found");
            return;
          }
          if (!r.ok) {
            setWaitlistOperatorMessage("Resend failed: " + (data.error || r.status));
            return;
          }
          setWaitlistOperatorMessage(
            "Resend: " + (data.confirmationSent ? "sent" : "not sent") + " (" + (data.confirmationReason ?? "—") + ")"
          );
        })
        .catch(() => setWaitlistOperatorMessage("Resend: network error"))
        .finally(() => setWaitlistActionEmail(null));
    },
    []
  );

  const waitlistReset = useCallback(
    (email: string) => {
      if (!window.confirm("Reset removes this waitlist entry from Blob. Re-register from /origin to test again. Continue?")) return;
      const base = typeof window !== "undefined" ? window.location.origin : "";
      setWaitlistActionEmail(email);
      setWaitlistOperatorMessage(null);
      fetch(`${base}/api/waitlist/reset`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            setWaitlistOperatorMessage("Reset failed: " + (data.error || r.status));
            return;
          }
          setWaitlistOperatorMessage("Reset: " + (data.deleted ? "deleted" : "no entry (already absent)") + " — list refreshed");
          loadWaitlist();
        })
        .catch(() => setWaitlistOperatorMessage("Reset: network error"))
        .finally(() => setWaitlistActionEmail(null));
    },
    [loadWaitlist]
  );

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

  useEffect(() => {
    loadReportLibrary();
  }, [loadReportLibrary]);

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
      if (effectiveDryRun) {
        // WHOIS-capable dry run: saves BeautyProfileV1, no images, reportId works with buildPaidWhoisReport
        const res = await fetch(`${getBaseUrl()}/api/beauty/dry-run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            birthData: {
              fullName: liveFullName,
              birthDate: liveBirthDate,
              birthTime: liveBirthTime,
              birthLocation: liveBirthLocation,
              email: "dev@example.com",
            },
            dryRun: true,
          }),
        });
        const json = (await res.json()) as Record<string, unknown> & {
          data?: { reportId?: string; beautyProfile?: { report?: string; emotionalSnippet?: string }; checkout?: { url?: string } };
        };
        if (!res.ok) {
          setReportOnlyError((json.error ?? json.message ?? "Dry-run failed") as string);
          return;
        }
        const data = json.data ?? json;
        const reportId = data.reportId as string | undefined;
        const beautyProfile = data.beautyProfile as { report?: string; emotionalSnippet?: string } | undefined;
        let full_report = (beautyProfile?.report ?? "") as string;
        let emotional_snippet = (beautyProfile?.emotionalSnippet ?? "") as string;
        if (reportId && !full_report) {
          try {
            const pr = await fetch(`${getBaseUrl()}/api/beauty/${encodeURIComponent(reportId)}`);
            const pj = (await pr.json()) as { status?: string; data?: Record<string, unknown> };
            const pdata = (pj?.status === "ok" ? pj.data : pj) as Record<string, unknown> | undefined;
            if (pr.ok && pdata) {
              full_report = (pdata.fullReport as string) ?? full_report;
              emotional_snippet =
                (pdata.emotionalSnippet as string) ?? emotional_snippet;
            }
          } catch {
            /* keep empty; operator can reload */
          }
        }
        setReportOnlyResult({ full_report, reportId, emotional_snippet });
        if (reportId) setLastReportId(reportId);
        // Fetch rendered paid WHOIS for primary display (operator testing)
        if (reportId) {
          try {
            const whoisRes = await fetch(`${getBaseUrl()}/api/dev/latest-paid-whois-report?reportId=${encodeURIComponent(reportId)}`);
            if (whoisRes.ok) {
              const whoisData = (await whoisRes.json()) as { paidWhoisText?: string };
              const paidWhoisText = whoisData.paidWhoisText as string | undefined;
              if (paidWhoisText) {
                setReportOnlyResult((prev) => (prev && prev.reportId === reportId ? { ...prev, paidWhoisText } : prev));
              }
            }
          } catch {
            // Keep primary as full_report if fetch fails
          }
        }
      } else {
        // Report-only (live or force-live): engine/generate only, no BeautyProfileV1
        const headers: Record<string, string> = { "Content-Type": "application/json", "X-Force-Live": "1" };
        const res = await fetch(`${getBaseUrl()}/api/engine/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            fullName: liveFullName,
            birthDate: liveBirthDate,
            birthTime: liveBirthTime,
            birthLocation: liveBirthLocation,
            email: "dev@example.com",
            dryRun: false,
            idempotencyKey: crypto.randomUUID(),
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
        if (reportId) setLastReportId(reportId);
        // In dev, fetch built WHOIS from stored report so the same panel shows paid WHOIS for both Test and Live
        if (reportId) {
          try {
            const whoisRes = await fetch(`${getBaseUrl()}/api/dev/latest-paid-whois-report?reportId=${encodeURIComponent(reportId)}`);
            if (whoisRes.ok) {
              const whoisData = (await whoisRes.json()) as { paidWhoisText?: string };
              const paidWhoisText = whoisData.paidWhoisText as string | undefined;
              if (paidWhoisText) {
                setReportOnlyResult((prev) => (prev && prev.reportId === reportId ? { ...prev, paidWhoisText } : prev));
              }
            }
          } catch {
            // Keep full_report if fetch fails (e.g. prod where dev endpoint is 403)
          }
        }
      }
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

  const shell = "min-h-screen bg-[#141418] text-[#d4d4da] p-5 md:p-8 text-base max-w-[1200px] font-sans";
  /* Phase identity: label + optional subline — readable for zero-tech operator */
  const phaseBand = (n: string, title: string, sub: string) => (
    <div className="mb-5 pl-4 border-l-4 border-[#5a5a64]">
      <p className="text-sm uppercase tracking-wider text-[#b0b0b8] font-semibold">{n} — {title}</p>
      <p className="text-sm text-[#90909a] mt-1 leading-relaxed">{sub}</p>
    </div>
  );
  const panel = "mb-5 p-5 rounded-lg border border-[#2e2e34] bg-[#1a1a20] text-[#e0e0e8]";
  const panelSubtle = "mb-5 p-4 rounded-lg border border-[#2e2e34] bg-[#16161a] text-[#c0c0c8]";

  return (
    <div className={shell}>
      {/* 00 — STUDIO HEADER (command header, not tutorial card) */}
      <header className="mb-8 pb-5 border-b border-[#2e2e34]">
        {phaseBand("00", "Studio", "All sections below: system check, people, run a test, results.")}
        <h1 className="text-xl font-semibold mb-1 text-[#e8e8ec]">LIGS Studio</h1>
        <p className="text-sm text-[#90909a] mb-4">System Check → People Entering the System → Run a Test → Results</p>
        <div className={panelSubtle}>
        <p className="text-sm font-semibold text-[#a8a8b0] mb-2">How to use</p>
        <ol className="text-sm text-[#c0c0c8] space-y-2 list-decimal list-inside leading-relaxed">
          <li><strong>Generate Background</strong> — DALL·E 3 creates the field (for Ignis: center void + radiating energy)</li>
          <li><strong>Compose Marketing Card</strong> — Adds archetype image anchor + headline/subhead/CTA over the background</li>
          <li><strong>Save</strong> — Exemplar Card (landing), Share Card, or Marketing Background</li>
        </ol>
        <p className="text-sm text-[#b0b0b8] mt-3">
          <strong className="text-[#d0d0d8]">Where do I add archetype visual?</strong> For Ignispectrum, the archetype image is added automatically in Compose. Set <code className="bg-[#25252c] px-1.5 py-0.5 rounded text-[#c8c8cc] text-sm">primary_archetype: &quot;Ignispectrum&quot;</code> in VoiceProfile; the compose step uses the Ignispectrum static image and places it in the center. No manual step.
        </p>
        </div>
      </header>

      {/* 01 — SYSTEM CHECK */}
      <section className="mb-8 pb-8 border-b border-[#2e2e34]" aria-label="System Check">
        {phaseBand("01", "System Check", "Can the system run right now? Readiness and status.")}
      <div className="mb-5 p-4 rounded-lg border border-[#2e2e34] bg-[#1a1a20] space-y-3 text-[#d0d0d8]">
        <p className="text-sm font-semibold text-[#a8a8b0]">Report mode</p>
        <label className="flex items-center gap-3 cursor-pointer text-base font-medium text-[#e0e0e8]">
          <input
            type="checkbox"
            checked={forceDryRun}
            onChange={(e) => setForceDryRun(e.target.checked)}
          />
          Test mode (safe, no image cost)
        </label>
        <p className="text-sm text-[#a0a0a8] leading-relaxed">
          {effectiveDryRun
            ? "Test mode makes a safe practice report for checking the paid WHOIS flow."
            : "Live mode uses the real report engine."}
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <span
            className={
              effectiveDryRun
                ? "px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-medium"
                : status?.allowExternalWrites
                  ? "px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-medium"
                  : "px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-medium"
            }
          >
            {effectiveDryRun ? "Test Paid Report (safe / no image cost)" : status?.allowExternalWrites ? "Live Report (uses real AI)" : "Live mode is off (server setting)"}
          </span>
          {!effectiveDryRun && !status?.allowExternalWrites && (
            <span className="block w-full mt-2 text-sm text-amber-800">
              To turn live mode on, your server must allow it. Ask your developer to enable live reports.
            </span>
          )}
          <span className="text-[#a0a0a8]">
            Provider: {status?.provider ? `DALL·E ${status.provider.replace("dall-e-", "")}` : "—"}
          </span>
          <span
            className={
              status?.logoConfigured
                ? "px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-sm"
                : status?.logoFallbackAvailable
                  ? "px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-800 text-sm"
                  : "px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm"
            }
          >
            Logo: {status ? (status.logoConfigured ? "OK" : "missing") : "—"}
          </span>
          <span className="text-[#a0a0a8]">
            Cache: {lastCacheHit === true ? "hit" : lastCacheHit === false ? "miss" : "—"}
          </span>
          <span className="text-[#a0a0a8] font-mono text-sm">Request: {lastRequestId || "—"}</span>
          {lastGenerateDebug && (
            <span className="text-sm font-mono text-[#90909a] block sm:inline" title="Last Generate Background response">
              Last: purpose={String(lastGenerateDebug.purpose ?? "—")} provider={String(lastGenerateDebug.providerUsed ?? "—")} glyphBranch={String(lastGenerateDebug.glyphBranchUsed ?? "—")} mode={lastGenerateDebug.dryRun ? "test" : "live"}
            </span>
          )}
          {lastError && (
            <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm truncate max-w-xs" title={lastError}>
              Error: {lastError}
            </span>
          )}
        </div>
      </div>
      <div className="mb-5 p-4 rounded-lg border border-[#2e2e34] bg-[#1a1a20] space-y-2 text-[#d0d0d8]">
        <p className="text-sm font-semibold text-[#a8a8b0]">Pipeline status (paid reports and delivery)</p>
        {pipelineStatusError && (
          <p className="text-sm text-amber-600">{pipelineStatusError}</p>
        )}
        {pipelineStatus && !pipelineStatusError && (
          <ul className="text-sm text-[#c8c8cc] font-mono space-y-1 list-none">
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

      {/* 02 — PEOPLE ENTERING THE SYSTEM */}
      <section className="mb-8 pb-8 border-b border-[#2e2e34]" aria-label="People">
        {phaseBand("02", "People Entering the System", "Waitlist, metrics, and recent entries.")}
      <div className="mb-5 p-5 rounded-lg border border-[#2e2e34] bg-[#1a1a20] text-[#d0d0d8]">
        <p className="text-sm font-semibold text-[#a8a8b0] mb-4">Waitlist (internal)</p>
        {waitlistLoading && <p className="text-sm text-[#8a8a90]">Loading…</p>}
        {waitlistError && <p className="text-sm text-red-400 mb-2">{waitlistError}</p>}
        {waitlistData && !waitlistLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2 rounded border border-[#2a2a2e] bg-[#141418]">
                <span className="text-[#6a6a70] block">Total</span>
                <span className="font-mono font-semibold text-[#e8e8ec]">{waitlistData.metrics.total}</span>
              </div>
              <div className="p-2 rounded border border-[#2a2a2e] bg-[#141418]">
                <span className="text-[#6a6a70] block">24h</span>
                <span className="font-mono font-semibold text-[#e8e8ec]">{waitlistData.metrics.last24h}</span>
              </div>
              <div className="p-2 rounded border border-[#2a2a2e] bg-[#141418]">
                <span className="text-[#6a6a70] block">7d</span>
                <span className="font-mono font-semibold text-[#e8e8ec]">{waitlistData.metrics.last7d}</span>
              </div>
              <div className="p-2 rounded border border-[#2a2a2e] bg-[#141418]">
                <span className="text-[#6a6a70] block">Origin %</span>
                <span className="font-mono font-semibold text-[#e8e8ec]">{waitlistData.metrics.originTerminalPct ?? "—"}%</span>
              </div>
              <div className="p-2 rounded border border-[#2a2a2e] bg-[#141418] col-span-2 sm:col-span-1">
                <span className="text-[#6a6a70] block">Nodes</span>
                <span className="font-mono font-semibold text-[#e8e8ec]">{waitlistData.metrics.total}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-[#9a9aa0] mb-2">By source</p>
                <ul className="space-y-1 text-xs font-mono">
                  {waitlistData.metrics.bySource.map(({ source, count, newestAt }) => (
                    <li key={source} className="flex justify-between gap-2 items-center">
                      <span>{source}</span>
                      <span>{count}</span>
                      {newestAt && <span className="text-sky-600 text-[10px]" title={newestAt}>{new Date(newestAt).toLocaleDateString()}</span>}
                    </li>
                  ))}
                  {waitlistData.metrics.bySource.length === 0 && <li className="text-[#6a6a70]">—</li>}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9a9aa0] mb-2">Top archetypes</p>
                <ul className="space-y-1 text-xs font-mono">
                  {waitlistData.metrics.byArchetype.slice(0, 8).map(({ archetype, count }) => (
                    <li key={archetype} className="flex justify-between gap-2">
                      <span>{archetype}</span>
                      <span>{count}</span>
                    </li>
                  ))}
                  {waitlistData.metrics.byArchetype.length === 0 && <li className="text-[#6a6a70]">—</li>}
                </ul>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium text-[#9a9aa0]">Recent entries</p>
                <select
                  value={waitlistSourceFilter}
                  onChange={(e) => setWaitlistSourceFilter(e.target.value)}
                  className="text-xs rounded border border-[#2a2a2e] bg-[#141418] text-[#e8e8ec] px-2 py-1"
                >
                  <option value="">All sources</option>
                  {waitlistData.metrics.bySource.map(({ source }) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>
              {waitlistOperatorMessage && (
                <p className="text-[11px] font-mono text-[#8a8a90] mb-2 opacity-90">{waitlistOperatorMessage}</p>
              )}
              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded border border-[#2a2a2e] bg-[#141418]">
                <table className="w-full text-xs text-[#c8c8cc]">
                  <thead className="sticky top-0 bg-[#1a1a1e] border-b border-[#2a2a2e]">
                    <tr>
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-left p-2 font-medium">Source</th>
                      <th className="text-left p-2 font-medium">Archetype</th>
                      <th className="text-left p-2 font-medium">Created</th>
                      <th className="text-left p-2 font-medium text-[#6a6a70]">Operator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlistData.recent
                      .filter((e) => !waitlistSourceFilter || e.source === waitlistSourceFilter)
                      .map((e, i) => (
                        <tr key={`${e.email}-${i}`} className="border-b border-[#2a2a2e] last:border-0">
                          <td className="p-2 font-mono truncate max-w-[160px]" title={e.email}>{e.email}</td>
                          <td className="p-2">{e.source}</td>
                          <td className="p-2">{e.preview_archetype ?? "—"}</td>
                          <td className="p-2" title={e.created_at}>
                            {new Date(e.created_at).toLocaleString()}
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <button
                              type="button"
                              disabled={waitlistActionEmail === e.email}
                              className="mr-2 text-[10px] px-1.5 py-0.5 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#8a8a90] hover:text-[#b8b8bc] disabled:opacity-50"
                              onClick={() => waitlistResend(e.email)}
                            >
                              Resend confirmation
                            </button>
                            <button
                              type="button"
                              disabled={waitlistActionEmail === e.email}
                              className="text-[10px] px-1.5 py-0.5 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#8a8a90] hover:text-[#b8b8bc] disabled:opacity-50"
                              onClick={() => waitlistReset(e.email)}
                            >
                              Reset entry
                            </button>
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

      {/* 02b — Report Library (view preview + unlock) */}
      <section className="mb-8 pb-8 border-b border-[#2e2e34]" aria-label="Report Library">
        {phaseBand("02b", "Report Library", "View existing reports, open WHOIS preview, trigger Stripe checkout. No intake required.")}
        <div className="mb-5 p-5 rounded-lg border border-[#2e2e34] bg-[#1a1a20] space-y-3 text-[#d0d0d8]">
          {reportLibraryLoading && <p className="text-sm text-[#8a8a90]">Loading reports…</p>}
          {reportLibraryError && <p className="text-sm text-red-400">{reportLibraryError}</p>}
          {!reportLibraryLoading && !reportLibraryError && reportLibrary.length === 0 && (
            <p className="text-sm text-[#8a8a90]">No reports in Blob. Run Test Paid Report to create one.</p>
          )}
          {!reportLibraryLoading && reportLibrary.length > 0 && (
            <ul className="space-y-2">
              {reportLibrary.map((r) => (
                <li key={r.reportId} className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-[#2a2a2e] bg-[#141418]">
                  <span className="font-mono text-xs text-[#a0a0a8]">{r.reportId}</span>
                  <span className="text-sm text-[#d0d0d8]">{r.subjectName}</span>
                  <span className="text-xs text-[#8a8a90] truncate max-w-[200px]" title={r.emotionalSnippet}>{r.emotionalSnippet?.slice(0, 60)}…</span>
                  <div className="flex gap-2 ml-auto">
                    <a
                      href={`/beauty/view?reportId=${encodeURIComponent(r.reportId)}`}
                      className="px-3 py-1.5 text-xs rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                    >
                      View preview
                    </a>
                    <button
                      type="button"
                      disabled={unlockReportId === r.reportId}
                      onClick={() => handleUnlockCheckout(r.reportId)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[#7A4FFF] text-white hover:bg-[#8b5fff] disabled:opacity-50"
                    >
                      {unlockReportId === r.reportId ? "Redirecting…" : "Unlock WHOIS Agent Access"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {reportLibrary.length > 0 && (
            <button
              type="button"
              className="text-xs text-[#a0a0a8] hover:text-[#d0d0d8] underline"
              onClick={loadReportLibrary}
            >
              Refresh list
            </button>
          )}
        </div>
      </section>

      {/* 03–05 — Operator console (flight → telemetry → engine notes; DOM order preserved) */}
      <section className="mb-6 pb-6 border-b border-[#2a2a2e]" aria-label="Operator console">
        {phaseBand("03–05", "Run a Test", "Report test, live controls, results, and reference — scroll for Test Paid Report, Live Report, Results, VoiceProfile grid.")}
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
        <div className="mb-4 p-4 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#c8c8cc]">
          <p className="text-xs font-semibold text-[#9a9aa0] uppercase tracking-wide mb-3">Last Response Debug (Compose)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
            <div><span className="text-[#6a6a70]">requestId</span> {String(composeResult.requestId ?? "—")}</div>
            <div><span className="text-[#6a6a70]">composedUrl</span> {(composeResult.composedUrl as string)?.startsWith("data:") ? "data:image/png;base64,..." : String(composeResult.composedUrl ?? "—")}</div>
            <div><span className="text-[#6a6a70]">logoUsed</span> {String(composeResult.logoUsed ?? "—")}</div>
            <div><span className="text-[#6a6a70]">glyphUsed</span> {String(composeResult.glyphUsed ?? "—")}</div>
            <div><span className="text-[#6a6a70]">textRendered</span> {String(composeResult.textRendered ?? "—")}</div>
            <div><span className="text-[#6a6a70]">dryRun</span> {String(composeResult.dryRun ?? "—")}</div>
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
      {phaseBand("03", "Run a Test", "Generate a report. Use Test Paid Report to check the WHOIS report without image cost.")}
      <div className="mb-5 p-5 rounded-lg border border-[#2e2e34] bg-[#1a1a20] space-y-4 text-[#d0d0d8]">
        <p className="text-base font-semibold text-[#e0e0e8]">Paid report test (recommended)</p>
        <p className="text-sm text-[#a8a8b0]">Use Test Paid Report to check the WHOIS report without image cost.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[#b0b0b8] text-sm font-medium mb-1">Full name</label>
            <input
              type="text"
              className="w-full p-2.5 text-sm rounded-lg bg-[#25252c] border border-[#3a3a42] text-[#e8e8ec] placeholder-[#707078]"
              value={liveFullName}
              onChange={(e) => setLiveFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-[#b0b0b8] text-sm font-medium mb-1">Birth date</label>
            <input
              type="text"
              className="w-full p-2.5 text-sm rounded-lg bg-[#25252c] border border-[#3a3a42] text-[#e8e8ec] placeholder-[#707078]"
              value={liveBirthDate}
              onChange={(e) => setLiveBirthDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="block text-[#b0b0b8] text-sm font-medium mb-1">Birth time</label>
            <input
              type="text"
              className="w-full p-2.5 text-sm rounded-lg bg-[#25252c] border border-[#3a3a42] text-[#e8e8ec] placeholder-[#707078]"
              value={liveBirthTime}
              onChange={(e) => setLiveBirthTime(e.target.value)}
              placeholder="HH:MM"
            />
          </div>
          <div>
            <label className="block text-[#b0b0b8] text-sm font-medium mb-1">Birth location</label>
            <input
              type="text"
              className="w-full p-2.5 text-sm rounded-lg bg-[#25252c] border border-[#3a3a42] text-[#e8e8ec] placeholder-[#707078]"
              value={liveBirthLocation}
              onChange={(e) => setLiveBirthLocation(e.target.value)}
              placeholder="City, State"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="px-4 py-2.5 rounded-lg bg-teal-600 text-white text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-700"
            disabled={!!reportOnlyLoading}
            onClick={runReportOnly}
          >
            {reportOnlyLoading ? "Generating…" : effectiveDryRun ? "Test Paid Report (safe / no image cost)" : "Live Report (uses real AI)"}
          </button>
          <span className="text-sm text-[#a0a0a8]">
            {effectiveDryRun ? "Safe practice report — no image cost. Use this to check the paid WHOIS flow." : "Uses the real report engine and may incur cost."}
          </span>
        </div>
        {reportOnlyError && (
          <p className="text-red-600 text-sm">{reportOnlyError}</p>
        )}
        {reportOnlyResult && (
          <div className="mt-4 p-4 rounded-lg border border-teal-200 bg-[#1e2428]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[#e0e0e8]">
                {effectiveDryRun && reportOnlyResult.paidWhoisText ? "Paid WHOIS report" : "Report result"}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {reportOnlyResult.reportId && (
                  <span className="text-sm text-[#a0a0a8]">ID: {reportOnlyResult.reportId}</span>
                )}
                {reportOnlyResult.reportId && (
                  <>
                    <a
                      href={`/beauty/view?reportId=${encodeURIComponent(reportOnlyResult.reportId)}`}
                      className="px-3 py-1.5 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                    >
                      View preview
                    </a>
                    <button
                      type="button"
                      disabled={unlockReportId === reportOnlyResult.reportId}
                      onClick={() => reportOnlyResult.reportId && handleUnlockCheckout(reportOnlyResult.reportId)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-[#7A4FFF] text-white hover:bg-[#8b5fff] disabled:opacity-50"
                    >
                      {unlockReportId === reportOnlyResult.reportId ? "Redirecting…" : "Unlock WHOIS Agent Access"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                  onClick={() => copyToClipboard(reportOnlyResult.paidWhoisText ?? reportOnlyResult.full_report)}
                >
                  Copy report
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-[#90909a] mb-2">
              Path: {effectiveDryRun
                ? "POST /api/beauty/dry-run → /api/engine/generate (dryRun: true)"
                : "POST /api/engine/generate (dryRun: false)"}
            </p>
            {reportOnlyResult.paidWhoisText && (
              <p className="text-xs text-[#90909a] mb-2">Rendered from stored report (buildPaidWhoisReport).</p>
            )}
            <pre className="text-sm font-mono text-[#d0d0d8] overflow-auto max-h-96 p-4 rounded-lg bg-[#25252c] border border-[#3a3a42] whitespace-pre-wrap leading-relaxed">
              {effectiveDryRun
                ? (reportOnlyResult.paidWhoisText ?? "Loading expanded paid WHOIS report…")
                : reportOnlyResult.full_report}
            </pre>
            {effectiveDryRun && reportOnlyResult.paidWhoisText && (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-xs text-[#a0a0a8] hover:text-[#d0d0d8] underline"
                  onClick={() => setReportOnlyDebugOpen((o) => !o)}
                >
                  {reportOnlyDebugOpen ? "▼" : "▶"} Debug: raw engine report
                </button>
                {reportOnlyDebugOpen && (
                  <pre className="mt-2 text-xs font-mono text-[#a0a0a8] overflow-auto max-h-64 p-3 rounded-lg bg-[#25252c] border border-[#3a3a42] whitespace-pre-wrap leading-relaxed">
                    {reportOnlyResult.full_report}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {(effectiveDryRun || PROOF_ONLY) && (
        <>
        {phaseBand("05", "Reference", "Glyph and asset checks — internal rules.")}
      <div className="mb-5 p-5 rounded-lg border border-[#2e2e34] bg-[#1a1a20] text-[#d0d0d8] space-y-3">
        <p className="text-sm font-semibold text-[#a8a8b0]">Glyph reference</p>
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
        </>
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
              {dryRunPreviewOpen ? "▼" : "▶"} Test Report Preview{dryRunPreview ? `: ${dryRunPreview.action}` : ""}
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
                  <p className="text-sm text-gray-600">Click a test button to preview the request.</p>
                )}
              </div>
            )}
          </div>
          <div className="mb-4 rounded border-2 border-amber-200 bg-amber-50 overflow-hidden">
            <p className="px-4 py-2 text-sm font-semibold text-amber-900 border-b border-amber-200 bg-amber-100">
              Test Results
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
            <div className="mb-5 p-4 rounded-lg border-2 border-green-300 bg-green-50 text-green-800">
              <p className="text-base font-semibold">Live mode is on — real report engine is available</p>
            </div>
          ) : (
            <div className="mb-5 p-4 rounded-lg border-2 border-amber-400 bg-amber-100 text-amber-900">
              <p className="text-base font-semibold">Live mode is off (server setting)</p>
              <p className="text-sm mt-1">To run live reports, your developer must enable live mode on the server.</p>
            </div>
          )}
          <div className="mb-5 p-5 rounded-lg border-2 border-amber-300 bg-amber-50 space-y-4">
            <p className="text-sm font-semibold text-amber-800">Live report (real AI)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1">Full name</label>
                <input
                  type="text"
                  className="w-full p-2.5 text-sm rounded-lg bg-white border border-gray-300 text-black"
                  value={liveFullName}
                  onChange={(e) => setLiveFullName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1">Birth date</label>
                <input
                  type="text"
                  className="w-full p-2.5 text-sm rounded-lg bg-white border border-gray-300 text-black"
                  value={liveBirthDate}
                  onChange={(e) => setLiveBirthDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1">Birth time</label>
                <input
                  type="text"
                  className="w-full p-2.5 text-sm rounded-lg bg-white border border-gray-300 text-black"
                  value={liveBirthTime}
                  onChange={(e) => setLiveBirthTime(e.target.value)}
                  placeholder="HH:MM"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm font-medium mb-1">Birth location</label>
                <input
                  type="text"
                  className="w-full p-2.5 text-sm rounded-lg bg-white border border-gray-300 text-black"
                  value={liveBirthLocation}
                  onChange={(e) => setLiveBirthLocation(e.target.value)}
                  placeholder="City, State"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-amber-600 text-white text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-700"
                disabled={liveOnceLoading}
                onClick={runLiveOnce}
              >
                {liveOnceLoading ? "Running…" : "Run live report once"}
              </button>
              <span className="text-sm text-amber-800">One live run per server restart. For developers.</span>
            </div>
            {liveOnceError && (
              <p className="text-red-600 text-xs">{liveOnceError}</p>
            )}
          </div>
          {phaseBand("04", "Results", "What just happened — viewer links, artifacts, manifest.")}
          <div className="mb-5 p-5 rounded-lg border border-[#2e2e34] bg-[#1a1a20] space-y-3 text-[#d0d0d8]">
            <p className="text-sm font-semibold text-[#a8a8b0]">Results</p>
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
                    No image — test mode or empty response. To see real images, turn on live mode (ask your developer to enable it on the server).
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
