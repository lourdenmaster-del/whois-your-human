"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { safeParseVoiceProfile } from "@/src/ligs/voice/schema";
import { FALLBACK_PRIMARY_ARCHETYPE } from "@/src/ligs/archetypes/contract";
import { pickBackgroundSource, backgroundToInputString } from "@/lib/ligs-studio-utils";
import { getMarketingDescriptor } from "@/lib/marketing/descriptor";
import { buildOverlaySpecWithCopy, getLogoStyleWithDefaults, type MarketingOverlaySpec } from "@/src/ligs/marketing";
import MarketingHeader from "./MarketingHeader";
import ArtifactCompare from "./ArtifactCompare";
import ArchetypeArtifactCard, { buildArtifactsFromProfile } from "./ArchetypeArtifactCard";
import { useApiStatus } from "@/hooks/useApiStatus";

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

function renderDryComposeFromSpec(
  backgroundDataUrl: string,
  spec: MarketingOverlaySpec,
  size: number
): Promise<string> {
  return new Promise((resolve) => {
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

      const tb = spec.placement.textBlock.box;
      const tbPx = {
        x: Math.round(tb.x * size),
        y: Math.round(tb.y * size),
        w: Math.round(tb.w * size),
        h: Math.round(tb.h * size),
      };
      const headlineLines = wrapText(spec.copy.headline, 25, 2);
      const subheadLines = spec.copy.subhead ? wrapText(spec.copy.subhead, 35, 3) : [];
      const lineHeight = 48;
      const headlineSize = spec.styleTokens.typography.headlineSize === "xl" ? 56 : 44;
      const subheadSize = spec.styleTokens.typography.subheadSize === "md" ? 32 : 28;
      const centerX = tbPx.x + tbPx.w / 2;
      let yOffset = tbPx.y + 36;

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(tbPx.x, tbPx.y, tbPx.w, tbPx.h);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${spec.styleTokens.typography.weight === "semibold" ? "600" : "400"} ${headlineSize}px system-ui, sans-serif`;
      for (const line of headlineLines) {
        ctx.fillText(line, centerX, yOffset);
        yOffset += lineHeight;
      }
      ctx.font = `${subheadSize}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
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
    };
    img.onerror = () => resolve(backgroundDataUrl);
    img.src = backgroundDataUrl;
  });
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
    ligs: { primary_archetype: "Fluxionis", secondary_archetype: null, blend_weights: {} },
    descriptors: ["flow", "adapt", "evolve", "fluent"],
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

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQHwAEBgIApD5fRAAAAABJRU5ErkJggg==";

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
  const [purpose, setPurpose] = useState("marketing_background");
  const [variationKey, setVariationKey] = useState("exemplar-v1");
  const [size, setSize] = useState<"1024" | "1536">("1024");
  const imageAspectRatio =
    purpose === "marketing_background" || purpose === "share_card" ? "16:9" : "1:1";
  const [backgroundSource, setBackgroundSource] = useState("");
  const [loading, setLoading] = useState(false);

  const [imageResult, setImageResult] = useState<Record<string, unknown> | null>(null);
  const [composeResult, setComposeResult] = useState<Record<string, unknown> | null>(null);
  const [savedExemplarUrls, setSavedExemplarUrls] = useState<{ exemplarCard?: string } | null>(null);
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
  const [forceDryRun, setForceDryRun] = useState(false);
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

  useEffect(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    fetch(`${base}/api/ligs/status`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const effectiveDryRun = forceDryRun;

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
      if (stored.purpose) setPurpose(stored.purpose);
      if (stored.variationKey) setVariationKey(stored.variationKey);
      if (stored.size) setSize(stored.size);
    } else {
      setProfileJson(DEFAULT_PROFILE);
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
      JSON.stringify({ profile, purpose, image: { aspectRatio: "1:1", size, count: 1 }, variationKey }, null, 2)
    );
    const sz = size === "1536" ? 1536 : 1024;
    const dataUrl = createDryBackgroundPlaceholder(archetype, sz);
    setDryBackgroundDataUrl(dataUrl);
    setDryRunResults({ lastAction: "Simulate Background", imageDataUrl: dataUrl, marketingCopy: undefined });
  }, [profile, purpose, size, variationKey, performDryRunExit]);

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
      JSON.stringify({ profile, purpose, image: { aspectRatio: "1:1", size, count: 1 }, variationKey }, null, 2)
    );
  }, [profile, purpose, size, variationKey, performDryRunExit]);

  const drySimulate6Variations = useCallback(() => {
    if (!profile) return;
    performDryRunExit(
      "Simulate 6 Variations",
      `${getBaseUrl()}/api/image/generate`,
      "POST",
      JSON.stringify({ profile, purpose, image: { aspectRatio: "1:1", size, count: 1 }, variationKey: "demo-1" }, null, 2)
    );
  }, [profile, purpose, size, performDryRunExit]);

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

  const dryRerenderCompose = useCallback(async () => {
    if (!profile) return;
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
    setDryRunResults({ lastAction: "Re-render Compose (Dry)", imageDataUrl: composedUrl, marketingCopy: undefined });
  }, [profile, purpose, size, variationKey, dryBackgroundDataUrl, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

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

  const runGenerateBackground = useCallback(async () => {
    if (!profile || apiDisabled) return;
    setLoading(true);
    setImageResult(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/image/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          purpose,
          image: { aspectRatio: imageAspectRatio, size, count: 1 },
          variationKey,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      setImageResult(data);
      setLastRequestId((data.requestId as string) ?? "");
      if (!res.ok) {
        setLastError((data.message as string) ?? (data.error as string) ?? "Request failed");
        return;
      }
      setLastError(null);
      const bg = pickBackgroundSource(data as Record<string, unknown>);
      if (bg) setBackgroundSource(backgroundToInputString(bg));
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, purpose, size, variationKey, imageAspectRatio]);

  const runCompose = useCallback(async () => {
    if (!profile || apiDisabled) return;
    let bg: { url?: string; b64?: string } = {};
    if (backgroundSource.trim().startsWith("http")) {
      bg = { url: backgroundSource.trim() };
    } else if (backgroundSource.trim().length > 50) {
      const b64 = backgroundSource.replace(/^data:image\/\w+;base64,/, "").trim();
      bg = { b64 };
    } else {
      bg = { b64: TINY_PNG_B64 };
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
      if (!res.ok) setLastError((data.message as string) ?? (data.error as string) ?? "Request failed");
      else setLastError(null);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, purpose, size, variationKey, backgroundSource, dryOverlaySpec, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

  const runFullPipeline = useCallback(async () => {
    if (!profile || apiDisabled) return;
    setLoading(true);
    setImageResult(null);
    setComposeResult(null);
    try {
      const genRes = await fetch(`${getBaseUrl()}/api/image/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          purpose,
          image: { aspectRatio: imageAspectRatio, size, count: 1 },
          variationKey,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const genData = await genRes.json();
      setImageResult(genData);
      setLastRequestId((genData.requestId as string) ?? "");
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
      if (!compRes.ok) setLastError((compData.message as string) ?? (compData.error as string) ?? "Compose failed");
      setBackgroundSource(backgroundToInputString(bg));
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, purpose, size, variationKey, imageAspectRatio, dryOverlaySpec, overlayDraftHeadline, overlayDraftSubhead, overlayDraftCta]);

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
            image: { aspectRatio: imageAspectRatio, size, count: 1 },
            variationKey: kv,
            idempotencyKey: crypto.randomUUID(),
          }),
        });
        const genData = (await genRes.json()) as Record<string, unknown>;
        setLastRequestId(String(genData.requestId ?? ""));
        if (!genRes.ok) setLastError(String(genData.message ?? genData.error ?? "Generate failed"));
        else setLastError(null);
        const bg = pickBackgroundSource(genData) ?? { b64: TINY_PNG_B64 };
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
  }, [apiDisabled, profile, purpose, size, imageAspectRatio]);

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

  const runSaveToLanding = useCallback(async () => {
    if (!profile || !canSaveToLanding || apiDisabled) return;
    const arch = (profile as { ligs?: { primary_archetype?: string } }).ligs?.primary_archetype ?? FALLBACK_PRIMARY_ARCHETYPE;
    const exemplarCardB64 = (composeResult!.image as { b64: string }).b64.replace(/^data:image\/\w+;base64,/, "").trim();
    const spec = composeResult!.overlaySpec as { copy?: { headline?: string; subhead?: string; cta?: string } } | undefined;
    setLoading(true);
    setSavedExemplarUrls(null);
    setLastError(null);
    try {
      const res = await fetch(`${getBaseUrl()}/api/exemplars/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype: arch,
          version: "v1",
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
      setSavedExemplarUrls((data.urls as { exemplarCard?: string }) ?? null);
    } catch (e) {
      setLastError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }, [apiDisabled, profile, composeResult, canSaveToLanding]);

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
            image: { aspectRatio: imageAspectRatio, size, count: 1 },
            variationKey,
          },
          null,
          2
        )
      : "";
  };

  const getComposePayload = () => {
    const p = profile;
    let bg: { url?: string; b64?: string } = {};
    if (backgroundSource.trim().startsWith("http")) {
      bg = { url: backgroundSource.trim() };
    } else if (backgroundSource.trim().length > 50) {
      const b64 = backgroundSource.replace(/^data:image\/\w+;base64,/, "").trim();
      bg = { b64 };
    } else {
      bg = { b64: TINY_PNG_B64 };
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

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-6 text-sm">
      <h1 className="text-xl font-semibold mb-4 text-black">LIGS Studio</h1>
      <div className="mb-4 p-3 rounded border border-gray-300 bg-gray-50 space-y-2">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Warning Lights</p>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
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
          <span className="text-gray-600">
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
          <span className="text-gray-600">
            Cache: {lastCacheHit === true ? "hit" : lastCacheHit === false ? "miss" : "—"}
          </span>
          <span className="text-gray-600 font-mono">Request: {lastRequestId || "—"}</span>
          {lastError && (
            <span className="px-2 py-1 rounded bg-red-50 text-red-700 truncate max-w-xs" title={lastError}>
              Error: {lastError}
            </span>
          )}
        </div>
      </div>
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
                      setVariationKey("exemplar-v1");
                    }}
                    title="Reset to Fluxionis defaults for exemplar run"
                  >
                    Reset to Fluxionis
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
                  <input
                    type="text"
                    className="w-full p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
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
                {((composeResult?.image as { b64?: string } | undefined)?.b64) && (
                  <div>
                    <p className="text-gray-600 mb-1 text-xs font-medium">Composed image</p>
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
                {backgroundDisplayUrl && !(composeResult?.image as { b64?: string } | undefined)?.b64 && (
                  <div>
                    <p className="text-gray-600 mb-1 text-xs font-medium">Background image</p>
                    <ArchetypeArtifactCard
                      imageUrl={backgroundDisplayUrl}
                      archetype={(profile as { ligs?: { primary_archetype?: string } })?.ligs?.primary_archetype}
                      artifacts={profile ? buildArtifactsFromProfile({ ...profile, variationKey } as Record<string, unknown>) : {}}
                      imageAlt="Background"
                      showDevFields
                    />
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
                  setVariationKey("exemplar-v1");
                }}
                title="Reset to Fluxionis defaults for exemplar run"
              >
                Reset to Fluxionis
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
              <input
                type="text"
                className="w-full p-2 rounded bg-white border border-gray-300 text-black placeholder-gray-400 focus:border-violet-500 outline-none"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
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
              disabled={apiDisabled || !canRun || loading}
              onClick={runGenerateBackground}
            >
              {apiDisabled ? "Unavailable" : loading ? "…" : "Generate Background"}
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
              className="px-3 py-2 rounded bg-accent-violet text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading}
              onClick={runCompose}
            >
              {apiDisabled ? "Unavailable" : loading ? "…" : "Compose Marketing Card"}
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
              disabled={apiDisabled || !canRun || loading}
              onClick={runFullPipeline}
            >
              {apiDisabled ? "Unavailable" : loading ? "…" : "Run Full Pipeline"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded border border-gray-300 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading}
              onClick={run6Variations}
            >
              {apiDisabled ? "Unavailable" : loading ? "…" : "Generate 6 Variations"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-violet-100 text-violet-800 border border-violet-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={apiDisabled || !canRun || loading}
              onClick={runGenerateMarketing}
            >
              {apiDisabled ? "Unavailable" : loading ? "…" : "Generate Marketing"}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
              disabled={apiDisabled || !canSaveToLanding || loading}
              onClick={runSaveToLanding}
              title={canSaveToLanding ? "Save composed image to Blob and wire to landing Examples" : "Compose an image first"}
            >
              {apiDisabled ? "Unavailable" : loading ? "…" : "Save to Landing"}
            </button>
          </div>
          {savedExemplarUrls?.exemplarCard && (
            <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-sm">
              <p className="font-semibold text-emerald-800 mb-2">Saved. Refresh /beauty to see it in Examples.</p>
              <a href={savedExemplarUrls.exemplarCard} target="_blank" rel="noopener noreferrer" className="text-emerald-700 text-xs underline">
                View saved image
              </a>
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
                <p className="text-sm font-semibold text-violet-900 mb-2">Generated Image</p>
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
              <p className="text-sm font-semibold text-emerald-900 mb-2">Composed Marketing Card</p>
              <div className="aspect-square max-w-[400px]">
                <img
                  src={`data:image/png;base64,${(composeResult.image as { b64: string }).b64}`}
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
