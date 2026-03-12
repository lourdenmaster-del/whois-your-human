"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parseDate, parseTime } from "@/lib/terminal-intake/parseInputs";
import { resolveArchetypeFromDate } from "@/lib/terminal-intake/resolveArchetypeFromDate";
import {
  submitToBeautySubmit,
  submitToBeautyDryRun,
  prepurchaseBeautyDraft,
} from "@/lib/engine-client";
import {
  setBeautyUnlocked,
  setBeautyDraft,
  saveLastFormData,
  saveOriginIntake,
  isBeautyUnlocked,
} from "@/lib/landing-storage";
import { FAKE_PAY, TEST_MODE } from "@/lib/dry-run-config";
import { getArchetypePreviewConfig } from "@/lib/archetype-preview-config";
import { getArchetypeStaticImagePathOrFallback } from "@/lib/archetype-static-images";

const WAITLIST_ONLY = process.env.NEXT_PUBLIC_WAITLIST_ONLY !== "0";

/** Operator-readable label for waitlist confirmationReason (API machine strings). */
function waitlistConfirmationLabel(reason) {
  if (reason == null || reason === "") return "unknown";
  const map = {
    sent: "sent",
    duplicate_skipped: "skipped (already registered)",
    provider_rejected: "failed (provider rejected)",
    provider_error: "failed (provider error)",
    provider_key_missing: "failed (provider not configured)",
    blob_not_configured: "failed (waitlist not configured)",
  };
  return map[reason] ?? "unknown";
}

/** Single active field during intake. Order: name → birthDate → birthPlace → birthTime → email. */
const INTAKE_FIELDS = ["name", "birthDate", "birthPlace", "birthTime", "email"];
const INTAKE_PROMPTS = {
  name: "WHOIS <your name>",
  birthDate: "Birth date:",
  birthPlace: "Place of birth:",
  birthTime: "Birth time (or UNKNOWN):",
  email: "Contact email:",
};

/** Sequential single-line status messages during processing (registry language). */
const PROCESSING_MESSAGES = [
  "Resolving identity request…",
  "Resolving solar signature…",
  "Mapping archetypal structure…",
];

const PROCESSING_DELAYS_MS = [900, 1200, 800];

/**
 * Cinematic reveal after registration completes (ms).
 * Preamble: terminal holds "Identity registration complete." then "Writing registry record…"
 * before first section; all section times are offset by REVEAL_PREAMBLE_TOTAL_MS.
 */
const REVEAL_TERMINAL_WRITING_MS = 550;
const REVEAL_AFTER_WRITING_MS = 750;
const REVEAL_PREAMBLE_TOTAL_MS = REVEAL_TERMINAL_WRITING_MS + REVEAL_AFTER_WRITING_MS;

const REVEAL_TIMING_MS = {
  registry: 400 + REVEAL_PREAMBLE_TOTAL_MS,
  confirmation: 900 + REVEAL_PREAMBLE_TOTAL_MS,
  artifacts: 1400 + REVEAL_PREAMBLE_TOTAL_MS,
  /** After artifact images; before registry extract preview. */
  archetypeExpression: 1700 + REVEAL_PREAMBLE_TOTAL_MS,
  reportPreview: 2100 + REVEAL_PREAMBLE_TOTAL_MS,
  cta: 2700 + REVEAL_PREAMBLE_TOTAL_MS,
};

/**
 * Human-readable archetype copy from canonical contract preview
 * (lib/archetype-preview-config → src/ligs/archetypes/contract.ts).
 * civilizationFunction + environments only — no archetypalVoice (prompt-style).
 */
function getArchetypeExpressionLines(archetype) {
  if (!archetype || archetype === "—") return null;
  const cfg = getArchetypePreviewConfig(archetype);
  const { humanExpression, civilizationFunction, environments } = cfg.teaser ?? {};
  if (!civilizationFunction || civilizationFunction === "—") return null;
  const line1 =
    humanExpression && humanExpression !== "—"
      ? `${humanExpression} — ${civilizationFunction}`
      : civilizationFunction;
  const line2 =
    environments && environments !== "—"
      ? `Typical expression contexts: ${environments}.`
      : null;
  return { line1, line2 };
}

/** Deterministic hash for seeding image selection (name + birthDate). */
function hashSeed(seed) {
  let h = 0;
  const s = String(seed ?? "");
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Arc set: arc1–arc12 from public "* arc images" folders (jpeg).
 * Prime set: prime1–prime4 from public {archetype}-images (png; Fluxionis uses fluxonis-prime on disk).
 */
const ARC_FOLDER_BY_ARCHETYPE = {
  Aequilibris: { folder: "aequilibrius arc images", prefix: "aequilibrius" },
  Duplicaris: { folder: "duplicaris arc images", prefix: "duplicaris" },
  Fluxionis: { folder: "fluxionis arc images", special: true },
  Ignispectrum: { folder: "ignispectrum arc images", prefix: "ignispectrum" },
  Innovaris: { folder: "innovaris arc images", prefix: "innovaris" },
  Obscurion: { folder: "obscurion arc images", prefix: "obscurion" },
  Precisura: { folder: "precisura arc images", prefix: "precisura" },
  Radiantis: { folder: "radiantis arc images", prefix: "radiantis" },
  Stabiliora: { folder: "stabiliora arc images", prefix: "stabiliora" },
  Structoris: { folder: "structoris arc images", prefix: "structoris" },
  Tenebris: { folder: "tenebris arc images", prefix: "tenebris" },
  Vectoris: { folder: "vectoris arc images", prefix: "vectoris" },
};

/** Prime folder + filenames (matches on-disk; Fluxionis folder uses fluxonis-prime*.png). */
const PRIME_ASSETS_BY_ARCHETYPE = {
  Aequilibris: { folder: "aequilibris-images", files: ["aequilibris-prime1.png", "aequilibris-prime2.png", "aequilibris-prime3.png", "aequilibris-prime4.png"] },
  Duplicaris: { folder: "duplicaris-images", files: ["duplicaris-prime1.png", "duplicaris-prime2.png", "duplicaris-prime3.png", "duplicaris-prime4.png"] },
  Fluxionis: { folder: "fluxionis-images", files: ["fluxonis-prime1.png", "fluxonis-prime2.png", "fluxonis-prime3.png", "fluxonis-prime4.png"] },
  Ignispectrum: { folder: "ignispectrum-images", files: ["ignispectrum-prime1.png", "ignispectrum-prime2.png", "ignispectrum-prime3.png", "ignispectrum-prime4.png"] },
  Innovaris: { folder: "innovaris-images", files: ["innovaris-prime1.png", "innovaris-prime2.png", "innovaris-prime3.png", "innovaris-prime4.png"] },
  Obscurion: { folder: "obscurion-images", files: ["obscurion-prime1.png", "obscurion-prime2.png", "obscurion-prime3.png", "obscurion-prime4.png"] },
  Precisura: { folder: "precisura-images", files: ["precisura-prime1.png", "precisura-prime2.png", "precisura-prime3.png", "precisura-prime4.png"] },
  Radiantis: { folder: "radiantis-images", files: ["radiantis-prime1.png", "radiantis-prime2.png", "radiantis-prime3.png", "radiantis-prime4.png"] },
  Stabiliora: { folder: "stabiliora-images", files: ["stabiliora-prime1.png", "stabiliora-prime2.png", "stabiliora-prime3.png", "stabiliora-prime4.png"] },
  Structoris: { folder: "structoris-images", files: ["structoris-prime1.png", "structoris-prime2.png", "structoris-prime3.png", "structoris-prime4.png"] },
  Tenebris: { folder: "tenebris-images", files: ["tenebris-prime1.png", "tenebris-prime2.png", "tenebris-prime3.png", "tenebris-prime4.png"] },
  Vectoris: { folder: "vectoris-images", files: ["vectoris-prime1.png", "vectoris-prime2.png", "vectoris-prime3.png", "vectoris-prime4.png"] },
};

const ARC_COUNT = 12;
const PRIME_COUNT = 4;

/** Fluxionis arc folder uses fluxonis1.jpeg + fluxionis2..12.jpeg (no fluxionis1). */
const FLUXIONIS_ARC_FILES = [
  "fluxonis1.jpeg",
  "fluxionis2.jpeg",
  "fluxionis3.jpeg",
  "fluxionis4.jpeg",
  "fluxionis5.jpeg",
  "fluxionis6.jpeg",
  "fluxionis7.jpeg",
  "fluxionis8.jpeg",
  "fluxionis9.jpeg",
  "fluxionis10.jpeg",
  "fluxionis11.jpeg",
  "fluxionis12.jpeg",
];

function buildArcImageUrls(archetype) {
  if (!archetype || archetype === "—") return [];
  const cfg = ARC_FOLDER_BY_ARCHETYPE[archetype];
  if (!cfg) return [];
  const enc = encodeURIComponent(cfg.folder);
  if (cfg.special && archetype === "Fluxionis") {
    return FLUXIONIS_ARC_FILES.map((f) => `/${enc}/${f}`);
  }
  const prefix = cfg.prefix;
  const urls = [];
  for (let i = 1; i <= ARC_COUNT; i++) {
    urls.push(`/${enc}/${prefix}${i}.jpeg`);
  }
  return urls;
}

function buildPrimeImageUrls(archetype) {
  if (!archetype || archetype === "—") return [];
  const cfg = PRIME_ASSETS_BY_ARCHETYPE[archetype];
  if (!cfg) return [];
  const enc = encodeURIComponent(cfg.folder);
  return cfg.files.map((f) => `/${enc}/${f}`);
}

/**
 * Deterministic artifact URLs: first = arc pool (12), second = prime pool (4).
 * seed = hash(name + birthDate); modulo per pool so sections always differ when both pools exist.
 */
function getRegistryArtifactUrls(name, birthDate, archetype) {
  const arcImages = buildArcImageUrls(archetype);
  const primeImages = buildPrimeImageUrls(archetype);
  if (arcImages.length === 0 && primeImages.length === 0) return { arcUrl: null, primeUrl: null };
  const seed = hashSeed(`${name ?? ""}|${birthDate ?? ""}`);
  const arcUrl = arcImages.length > 0 ? arcImages[seed % arcImages.length] : null;
  // Second index: offset by prime count so arc and prime indices differ when lengths align
  const primeIdx = primeImages.length > 0 ? (seed + PRIME_COUNT) % primeImages.length : 0;
  const primeUrl = primeImages.length > 0 ? primeImages[primeIdx] : null;
  return { arcUrl, primeUrl };
}

/** Basic email format validation — local part @ domain.tld */
function isValidEmail(s) {
  if (!s || typeof s !== "string") return false;
  const trimmed = s.trim().toLowerCase();
  if (!trimmed) return false;
  const at = trimmed.indexOf("@");
  if (at <= 0 || at >= trimmed.length - 1) return false;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) return false;
  return true;
}

function getDryRunFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dryRun") === "1" || params.get("dryRun") === "true";
}

/** Second artifact: prime URL 404s on live if assets not deployed — fallback to committed static. */
function PrimeArtifactImg({ primeUrl, archetype }) {
  const [src, setSrc] = useState(primeUrl);
  const fallback = getArchetypeStaticImagePathOrFallback(archetype || "Ignispectrum");
  return (
    <img
      src={src}
      alt=""
      className="w-full max-w-[200px] rounded border border-[#2a2a2e] object-cover opacity-90"
      onError={() => setSrc(fallback)}
    />
  );
}

export default function OriginTerminalIntake() {
  const inputRef = useRef(null);
  const lastEnterHandledRef = useRef(0);
  const ctaSubmittingRef = useRef(false);
  const redirectFiredRef = useRef(false);
  const formDataRef = useRef({});
  const phaseRef = useRef("idle");

  const [phase, setPhase] = useState("idle");
  /** Single visible line during handshake: prompts echo, system status, or empty when input row carries prompt via placeholder. */
  const [terminalLine, setTerminalLine] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [currentField, setCurrentField] = useState("name");
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    birthTime: "",
    birthLocation: "",
    email: "",
  });
  const [resolvedArchetypeFromDate, setResolvedArchetypeFromDate] = useState(null);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [archetypePreviewShown, setArchetypePreviewShown] = useState(false);
  const [waitlistState, setWaitlistState] = useState("idle");
  /** Observability only — last waitlist POST outcome for dev/debug; does not block reveal. */
  const [waitlistConfirmation, setWaitlistConfirmation] = useState(null);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaError, setCtaError] = useState(null);
  const [showRegistry, setShowRegistry] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showArchetypeExpression, setShowArchetypeExpression] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  /** Footer counter: only after reveal CTA + 400ms; never during handshake. */
  const [showRegistryCounter, setShowRegistryCounter] = useState(false);
  const [registryCount, setRegistryCount] = useState(null);

  const dryRun = getDryRunFromUrl();
  const [unlocked, setUnlockedState] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") setUnlockedState(isBeautyUnlocked());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const FALLBACK_COUNT = 117;
    fetch("/api/waitlist/count")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled && typeof data?.total === "number") setRegistryCount(data.total);
        else if (!cancelled) setRegistryCount(FALLBACK_COUNT);
      })
      .catch(() => {
        if (!cancelled) setRegistryCount(FALLBACK_COUNT);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Resolve base archetype from date as soon as we have a valid date (solar segment → archetype).
  useEffect(() => {
    if (formData.birthDate) {
      setResolvedArchetypeFromDate(resolveArchetypeFromDate(formData.birthDate));
    }
  }, [formData.birthDate]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** Success completion: reveal registry record in-page (no router.push). */
  const beginRegistryReveal = useCallback(() => {
    if (redirectFiredRef.current) return;
    redirectFiredRef.current = true;
    saveOriginIntake(formDataRef.current ?? {});
    setShowRegistry(false);
    setShowConfirmation(false);
    setShowArtifacts(false);
    setShowArchetypeExpression(false);
    setShowReportPreview(false);
    setShowCTA(false);
    setShowRegistryCounter(false);
    setTerminalLine("Identity registration complete.");
    setPhase("registryReveal");
  }, []);

  /** Sequential reveal timers when phase becomes registryReveal. */
  useEffect(() => {
    if (phase !== "registryReveal") return;
    const t0 = setTimeout(
      () => setTerminalLine("Writing registry record…"),
      REVEAL_TERMINAL_WRITING_MS
    );
    const t1 = setTimeout(() => setShowRegistry(true), REVEAL_TIMING_MS.registry);
    const t2 = setTimeout(() => setShowConfirmation(true), REVEAL_TIMING_MS.confirmation);
    const t3 = setTimeout(() => setShowArtifacts(true), REVEAL_TIMING_MS.artifacts);
    const t3a = setTimeout(() => setShowArchetypeExpression(true), REVEAL_TIMING_MS.archetypeExpression);
    const t3b = setTimeout(() => setShowReportPreview(true), REVEAL_TIMING_MS.reportPreview);
    const t4 = setTimeout(() => setShowCTA(true), REVEAL_TIMING_MS.cta);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t3a);
      clearTimeout(t3b);
      clearTimeout(t4);
    };
  }, [phase]);

  /** After CTA section appears, show registry footer 400ms later (not during handshake). */
  useEffect(() => {
    if (!showCTA) return;
    const t = setTimeout(() => setShowRegistryCounter(true), 400);
    return () => clearTimeout(t);
  }, [showCTA]);

  const goToErrorAndComplete = useCallback((message) => {
    setCtaError(message);
    setTerminalLine(`${message} Press ENTER to continue.`);
    setPhase("completeAwaitingEnterRedirect");
  }, []);

  const advanceToProcessing = useCallback(() => {
    setPhase("processing");
    setProcessingIndex(0);
    setTerminalLine("Registration complete. Resolving registry record…");
  }, []);

  const showInputRow =
    currentField != null &&
    phase !== "processing" &&
    phase !== "completeAwaitingEnterRedirect" &&
    phase !== "registryReveal" &&
    phase !== "executing" &&
    !terminalLine;

  useEffect(() => {
    if (showInputRow && inputRef.current) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [showInputRow, currentField, phase]);

  /* completeAwaitingEnterRedirect: error-only; no redirect on key (links only). */

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const now = Date.now();
        if (now - lastEnterHandledRef.current < 150) return;
        lastEnterHandledRef.current = now;

        if (phase === "completeAwaitingEnterRedirect") {
          return;
        }

        if (currentField != null) {
          const raw = inputValue.trim();
          if (currentField === "name") {
            if (!raw) return;
            setFormData((f) => ({ ...f, name: raw }));
            setInputValue("");
            setPhase("intake");
            setCurrentField(null);
            setTerminalLine("Resolving identity request…");
            setTimeout(() => {
              setTerminalLine("");
              setCurrentField("birthDate");
            }, 900);
            return;
          }
          if (currentField === "birthDate") {
            if (!raw) return;
            const parsed = parseDate(raw);
            if (!parsed) {
              setInputValue("");
              return;
            }
            setFormData((f) => ({ ...f, birthDate: parsed.iso }));
            setResolvedArchetypeFromDate(resolveArchetypeFromDate(parsed.iso));
            setInputValue("");
            setCurrentField(null);
            setTerminalLine("Birth date recorded.");
            setTimeout(() => {
              setTerminalLine("");
              setCurrentField("birthPlace");
            }, 800);
            return;
          }
          if (currentField === "birthPlace") {
            if (!raw) return;
            setFormData((f) => ({ ...f, birthLocation: raw }));
            setInputValue("");
            setCurrentField(null);
            setTerminalLine("Place of birth recorded.");
            setTimeout(() => {
              setTerminalLine("");
              setCurrentField("birthTime");
            }, 800);
            return;
          }
          if (currentField === "birthTime") {
            const parsed = parseTime(raw);
            setFormData((f) => ({ ...f, birthTime: parsed.api }));
            setInputValue("");
            setCurrentField(null);
            setTerminalLine("Birth time recorded.");
            setTimeout(() => {
              setTerminalLine("");
              setCurrentField("email");
            }, 800);
            return;
          }
          if (currentField === "email") {
            if (!raw) return;
            if (!isValidEmail(raw)) {
              setInputValue("");
              return;
            }
            setFormData((f) => ({ ...f, email: raw.trim().toLowerCase() }));
            setInputValue("");
            setCurrentField(null);
            advanceToProcessing();
            return;
          }
        }
      }
    },
    [phase, currentField, inputValue, advanceToProcessing]
  );

  const handleRunWhoisClick = useCallback(async () => {
    if (ctaSubmittingRef.current) return;

    const payload = {
      name: formData.name?.trim() || "—",
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      birthLocation: formData.birthLocation,
      email: formData.email?.trim?.()?.toLowerCase?.() || "",
    };

    setCtaError(null);
    setCtaLoading(true);
    ctaSubmittingRef.current = true;

    try {
      if (WAITLIST_ONLY) {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payload.email,
            source: "origin-terminal",
            birthDate: payload.birthDate || undefined,
            ...(resolvedArchetypeFromDate ? { preview_archetype: resolvedArchetypeFromDate } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (typeof window !== "undefined") {
            console.error("[waitlist] request failed status=" + res.status, data);
          }
          setTerminalLine("Registry channel unavailable.");
          setPhase("completeAwaitingEnterRedirect");
          return;
        }
        if (typeof window !== "undefined") {
          const reason = data?.confirmationReason ?? "unknown";
          const sent = data?.confirmationSent === true;
          const dup = data?.alreadyRegistered === true;
          setWaitlistConfirmation({
            confirmationSent: sent,
            confirmationReason: reason,
            alreadyRegistered: dup,
          });
          const label = waitlistConfirmationLabel(reason);
          if (dup) {
            console.info("[waitlist] already registered; confirmation skipped — " + label);
          } else if (sent) {
            console.info("[waitlist] registered + confirmation sent — " + label);
          } else {
            console.info("[waitlist] registered + confirmation not sent — " + label);
          }
        }
        beginRegistryReveal();
        return;
      }

      if (unlocked || dryRun || TEST_MODE) {
        const result = dryRun
          ? await submitToBeautyDryRun(payload)
          : await submitToBeautySubmit(payload);
        const reportId = result?.reportId;
        if (!reportId) {
          goToErrorAndComplete("Registry record generation failed.");
          return;
        }
        saveLastFormData(reportId, payload);
        beginRegistryReveal();
        return;
      }

      if (FAKE_PAY) {
        setBeautyUnlocked();
        const result = await submitToBeautySubmit(payload);
        const reportId = result?.reportId;
        if (reportId) {
          saveLastFormData(reportId, payload);
          beginRegistryReveal();
        }
        return;
      }

      setBeautyDraft(payload);
      let draftId = null;
      try {
        const prep = await prepurchaseBeautyDraft(payload);
        draftId = prep?.draftId ?? null;
      } catch {
        // fallback
      }
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prePurchase: true, ...(draftId && { draftId }) }),
      });
      const json = await res.json();
      if (!res.ok) {
        goToErrorAndComplete(json?.error ?? "Checkout unavailable.");
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
      } else {
        goToErrorAndComplete("No checkout URL returned.");
      }
    } catch (err) {
      goToErrorAndComplete(err?.message ?? "Something went wrong.");
    } finally {
      ctaSubmittingRef.current = false;
      setCtaLoading(false);
    }
  }, [formData, unlocked, dryRun, goToErrorAndComplete, resolvedArchetypeFromDate, beginRegistryReveal]);

  const executeSubmitRef = useRef(null);
  executeSubmitRef.current = handleRunWhoisClick;

  useEffect(() => {
    if (phase !== "processing") return;
    if (processingIndex >= PROCESSING_MESSAGES.length) {
      if (!archetypePreviewShown) {
        setTimeout(() => {
          if (phaseRef.current === "completeAwaitingEnterRedirect" || phaseRef.current === "registryReveal") return;
          const archetype = resolvedArchetypeFromDate ?? resolveArchetypeFromDate(formDataRef.current?.birthDate ?? "");
          setTerminalLine(`Archetype resolved: ${archetype}. Ready.`);
        }, 800);
        setArchetypePreviewShown(true);
        if (WAITLIST_ONLY) {
          const email = formDataRef.current?.email?.trim?.()?.toLowerCase?.();
          if (email && isValidEmail(email)) {
            setWaitlistState("running");
          } else {
            beginRegistryReveal();
          }
        } else {
          setTerminalLine("Executing WHOIS query…");
          setPhase("executing");
        }
      }
      return;
    }
    const delay = PROCESSING_DELAYS_MS[processingIndex] ?? 800;
    const t = setTimeout(() => {
      setTerminalLine(PROCESSING_MESSAGES[processingIndex]);
      setProcessingIndex((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, processingIndex, archetypePreviewShown, resolvedArchetypeFromDate]);

  useEffect(() => {
    if (phase !== "executing") return;
    executeSubmitRef.current?.();
  }, [phase]);

  useEffect(() => {
    if (waitlistState !== "running" || !WAITLIST_ONLY) return;
    const email = formData.email?.trim?.()?.toLowerCase?.();
    if (!email || !isValidEmail(email)) {
      beginRegistryReveal();
      setWaitlistState("done");
      return;
    }
    let cancelled = false;
    fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        source: "origin-terminal",
        birthDate: formData.birthDate || undefined,
        ...(resolvedArchetypeFromDate ? { preview_archetype: resolvedArchetypeFromDate } : {}),
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
      })
      .then(({ ok, status, data }) => {
        if (cancelled) return;
        if (ok) {
          if (typeof window !== "undefined") {
            const reason = data?.confirmationReason ?? "unknown";
            const sent = data?.confirmationSent === true;
            const dup = data?.alreadyRegistered === true;
            setWaitlistConfirmation({
              confirmationSent: sent,
              confirmationReason: reason,
              alreadyRegistered: dup,
            });
            const label = waitlistConfirmationLabel(reason);
            if (dup) {
              console.info("[waitlist] already registered; confirmation skipped — " + label);
            } else if (sent) {
              console.info("[waitlist] registered + confirmation sent — " + label);
            } else {
              console.info("[waitlist] registered + confirmation not sent — " + label);
            }
          }
          beginRegistryReveal();
        } else {
          if (typeof window !== "undefined") {
            console.error("[waitlist] request failed status=" + status, data);
          }
          setTerminalLine("Registry channel unavailable.");
          setPhase("completeAwaitingEnterRedirect");
        }
        setWaitlistState("done");
      })
      .catch((err) => {
        if (cancelled) return;
        if (typeof window !== "undefined") {
          console.error("[waitlist] request failed network error", err);
        }
        setTerminalLine("Registry channel unavailable.");
        setPhase("completeAwaitingEnterRedirect");
        setWaitlistState("done");
      });
    return () => {
      cancelled = true;
    };
  }, [waitlistState, formData.email, formData.birthDate, resolvedArchetypeFromDate, beginRegistryReveal]);

  const archetypeForCompletion = resolvedArchetypeFromDate ?? resolveArchetypeFromDate(formData.birthDate ?? "") ?? "—";
  const { arcUrl, primeUrl } = getRegistryArtifactUrls(
    formData.name,
    formData.birthDate,
    archetypeForCompletion
  );
  const archetypeExpressionLines = getArchetypeExpressionLines(archetypeForCompletion);
  /** Preview section copy: teaser from contract; fallbacks when fields are "—". Only read when registryReveal + showCTA. */
  const previewTeaser = getArchetypePreviewConfig(archetypeForCompletion).teaser;

  /** In-page reveal below terminal; router.push removed — CTA links to WHOIS Registration Report. */
  if (phase === "registryReveal") {
    const mono = "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace";
    const muted = "rgba(154,154,160,0.9)";
    const bright = "rgba(232,232,236,0.95)";
    return (
      <div
        className="min-h-screen flex flex-col items-stretch py-4 px-5 sm:py-6 sm:px-8 overflow-x-hidden whois-origin"
        style={{ background: "#000", position: "relative", fontFamily: mono }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)",
            animation: "whois-field-pulse 10s ease-in-out infinite",
          }}
        />
        <div className="relative z-10 w-full max-w-[min(100vw-2.5rem,1000px)] mx-auto flex flex-col gap-8 flex-1 min-w-0 px-4 sm:px-5">
          {/* Terminal handshake line (unchanged visual: single line) */}
          <div
            className="whois-aperture w-full min-w-0"
            style={{ borderBottom: "1px solid rgba(42,42,46,0.6)", paddingBottom: "1rem" }}
          >
            <div className="font-mono text-sm sm:text-base py-2 px-1 min-h-[2.2em] flex items-center" style={{ color: bright }}>
              <span style={{ color: muted }}>&gt;</span>
              <span className="ml-1">{terminalLine || "Identity registration complete."}</span>
            </div>
          </div>

          {showRegistry && (
            <section
              className="text-left space-y-3"
              style={{
                color: muted,
                animation: "whois-fade-in 0.5s ease-out forwards",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.15em]" style={{ color: bright }}>
                WHOIS HUMAN REGISTRY RECORD
              </p>
              <p className="text-[13px]" style={{ color: bright }}>
                Query: {formData.name || "—"}
              </p>
              <p className="text-[13px]" style={{ color: bright }}>
                Registry: LIGS Human Identity Registry
              </p>
              <p className="text-[13px]" style={{ color: bright }}>
                Registry Record
              </p>
              <hr className="border-0 border-t border-[#2a2a2e] my-2" />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[13px]">
                <dt className="text-[11px] uppercase tracking-[0.08em] opacity-80">Subject Name</dt>
                <dd style={{ color: bright }}>{formData.name || "—"}</dd>
                <dt className="text-[11px] uppercase tracking-[0.08em] opacity-80">Birth Date</dt>
                <dd style={{ color: bright }}>{formData.birthDate || "—"}</dd>
                <dt className="text-[11px] uppercase tracking-[0.08em] opacity-80">Birth Location</dt>
                <dd style={{ color: bright }}>{formData.birthLocation || "—"}</dd>
                <dt className="text-[11px] uppercase tracking-[0.08em] opacity-80">Birth Time</dt>
                <dd style={{ color: bright }}>{formData.birthTime || "—"}</dd>
              </dl>
              <p className="text-[11px] uppercase tracking-[0.08em] pt-2">Solar Signature</p>
              <p className="text-[13px]" style={{ color: bright }}>
                Archetype Classification: {archetypeForCompletion}
              </p>
              <p className="text-[13px] pt-1">Registry Status: Registered</p>
              <p className="text-[13px]">Created Date: {new Date().toISOString().slice(0, 10)}</p>
              <p className="text-[13px]">Record Authority: LIGS Human Identity Registry</p>
              <p className="text-[12px]">Registry Node</p>
            </section>
          )}

          {showConfirmation && (
            <section
              className="text-left space-y-2 pt-2 border-t border-[#2a2a2e]"
              style={{
                color: muted,
                animation: "whois-fade-in 0.5s ease-out forwards",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                Identity Registration Confirmation
              </p>
              <p className="text-[13px] leading-relaxed">
                This identity has been successfully registered within the LIGS Human Identity Registry.
              </p>
              <p className="text-[13px]">Record integrity verified.</p>
            </section>
          )}

          {showArtifacts && (
            <section
              className="text-left space-y-3 pt-2 border-t border-[#2a2a2e]"
              style={{
                color: muted,
                animation: "whois-fade-in 0.5s ease-out forwards",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                Registry Artifacts
              </p>
              {arcUrl || primeUrl ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] mb-1">Archetype Identity Mark</p>
                    {arcUrl ? (
                      <img
                        src={arcUrl}
                        alt=""
                        className="w-full max-w-[280px] rounded border border-[#2a2a2e] object-cover"
                      />
                    ) : (
                      <p className="text-[12px] opacity-80">Arc set unavailable.</p>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] mb-1">Archetype Field Visualization</p>
                    {primeUrl ? (
                      <PrimeArtifactImg
                        primeUrl={primeUrl}
                        archetype={archetypeForCompletion}
                      />
                    ) : (
                      <p className="text-[12px] opacity-80">Prime set unavailable.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[12px]">Static archetype artifacts unavailable for this record.</p>
              )}
            </section>
          )}

          {showArchetypeExpression && (
            <section
              className="text-left space-y-2 pt-2 border-t border-[#2a2a2e]"
              style={{
                color: muted,
                animation: "whois-fade-in 0.5s ease-out forwards",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                Archetype Expression
              </p>
              <hr className="border-0 border-t border-[#2a2a2e] my-2" />
              <p className="text-[13px]" style={{ color: bright }}>
                Archetype Classification: {archetypeForCompletion}
              </p>
              {archetypeExpressionLines ? (
                <>
                  <p className="text-[13px] leading-relaxed">{archetypeExpressionLines.line1}</p>
                  {archetypeExpressionLines.line2 && (
                    <p className="text-[13px] leading-relaxed">{archetypeExpressionLines.line2}</p>
                  )}
                </>
              ) : (
                <p className="text-[13px] leading-relaxed opacity-90">
                  Registry class locked. Expanded archetype interpretation deferred to full WHOIS Human Registration Report on release.
                </p>
              )}
            </section>
          )}

          {showReportPreview && (
            <section
              className="text-left space-y-2 pt-2 border-t border-[#2a2a2e]"
              style={{
                color: muted,
                animation: "whois-fade-in 0.5s ease-out forwards",
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                Registry Extract — Expanded Report Fields
              </p>
              <p className="text-[13px] leading-relaxed">
                The full WHOIS Human Registration Report will expand this node with registry extracts only:
                identity architecture; solar and environmental mapping; archetypal behavior class;
                integration notes; artifact interpretation. Release pending—no further intake required when available.
              </p>
            </section>
          )}

          {showCTA && (
            <section
              className="text-left space-y-3 pt-2 border-t border-[#2a2a2e] pb-8"
              style={{
                color: muted,
                animation: "whois-fade-in 0.5s ease-out forwards",
              }}
            >
              <p className="text-[13px] leading-relaxed">
                NOTICE: Additional registry fields are designated for the complete WHOIS Human Registration Report when released.
              </p>
              <span
                className="inline-block px-4 py-2 text-[12px] font-mono border border-[#2a2a2e] rounded opacity-80 cursor-default"
                style={{ color: muted }}
                aria-disabled="true"
              >
                Official WHOIS Human Registration Report — Not Yet Released
              </span>
              <div className="flex flex-col gap-3 pt-4 items-start sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
                <a href="/origin" className="text-[11px] font-mono text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline shrink-0">
                  ← Return to Origin
                </a>
                <a
                  href="#whois-preview"
                  className="inline-block px-4 py-2 text-[12px] font-mono border border-[#2a2a2e] rounded text-[#9a9aa0] hover:text-[#c8c8cc] hover:border-[#3a3a3e] w-fit"
                >
                  View Your Human WHOIS Record Preview
                </a>
              </div>
            </section>
          )}
        </div>

        {showRegistryCounter && (
          <footer
            className="registry-footer relative z-10 mt-auto pt-8 pb-4 text-center font-mono text-[12px] sm:text-[13px] leading-relaxed"
            style={{
              color: "rgba(154,154,160,0.72)",
              fontFamily: mono,
            }}
          >
            Registry Nodes Recorded: {registryCount ?? "—"}
            <br />
            LIGS Human Identity Registry
            {waitlistConfirmation && (
              <>
                <br />
                <span className="block mt-2 text-[11px] opacity-70">
                  Confirmation dispatch:{" "}
                  {waitlistConfirmationLabel(waitlistConfirmation.confirmationReason)}
                </span>
              </>
            )}
          </footer>
        )}

        {/* Human WHOIS preview: continuation below fold; anchor target for in-page CTA. */}
        {showCTA && (
          <section
            id="whois-preview"
            className="relative z-10 w-full max-w-[min(100vw-2.5rem,1000px)] mx-auto flex flex-col gap-4 text-left px-4 sm:px-5 pt-10 pb-12 border-t border-[#2a2a2e] mt-8"
            style={{
              color: muted,
              fontFamily: mono,
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
              WHOIS HUMAN REGISTRATION REPORT
            </p>
            <p className="text-[11px] uppercase tracking-[0.1em] opacity-80">Preview Extract</p>
            <p className="text-[13px] leading-relaxed">
              Analytical report attached to the registry record above. Extract only—full interpretive depth withheld until authorized release.
            </p>
            {/* WHOIS-style analytical report opening (not cinematic UI sequence). */}
            <div className="space-y-2 pt-4">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                IDENTITY ARCHITECTURE
              </p>
              <p className="text-[13px] leading-relaxed">
                The registry identifies a stable identity structure arising within the total field of forces present at birth.
              </p>
              <p className="text-[13px] leading-relaxed">
                Pattern resolution is observational—derived from environmental and cosmic field structure, not from a single-variable read.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                FIELD CONDITIONS
              </p>
              <p className="text-[13px] leading-relaxed">
                Classification emerges from field conditions and force structure at the birth event.
              </p>
              <p className="text-[13px] leading-relaxed">
                Expanded entropic and environmental field mapping is included in the full report release.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                ARCHETYPE EXPRESSION
              </p>
              <p className="text-[13px] leading-relaxed">
                {archetypeExpressionLines?.line1
                  ? archetypeExpressionLines.line1
                  : previewTeaser?.civilizationFunction && previewTeaser.civilizationFunction !== "—"
                    ? previewTeaser.civilizationFunction
                    : "Archetype expression expands in the authorized report; extract omitted here."}
              </p>
              {archetypeExpressionLines?.line2 ? (
                <p className="text-[13px] leading-relaxed">{archetypeExpressionLines.line2}</p>
              ) : (
                previewTeaser?.environments &&
                previewTeaser.environments !== "—" && (
                  <p className="text-[13px] leading-relaxed">
                    Typical expression contexts: {previewTeaser.environments}
                  </p>
                )
              )}
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                COSMIC TWIN RELATION
              </p>
              <p className="text-[13px] leading-relaxed">
                Connects the resolved regime to its cosmic analogue in the full report. No pairing is published in this extract.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: bright }}>
                INTERPRETIVE NOTES
              </p>
              <p className="text-[13px] leading-relaxed">
                Expanded interpretive sections—integration notes, coherence risk, stabilization—ship with the complete registration report.
              </p>
              <p className="text-[13px] leading-relaxed">
                This extract closes the analytical preview; remainder is withheld pending authorization.
              </p>
            </div>
            <div className="pt-6 border-t border-[#2a2a2e] space-y-2">
              <p className="text-[12px] leading-relaxed opacity-90">
                Identity provisionally registered. The WHOIS Human Registration Report is not yet released. No further intake will be required when available.
              </p>
              <p className="text-[12px] opacity-80">
                Registered users will be notified when full reports become available.
              </p>
            </div>
          </section>
        )}
      </div>
    );
  }

  if (phase === "completeAwaitingEnterRedirect") {
    return (
      <div
        className="min-h-screen flex flex-col items-center p-4 sm:p-6 overflow-x-hidden whois-origin"
        style={{ background: "#000", position: "relative" }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)",
            animation: "whois-field-pulse 10s ease-in-out infinite",
          }}
        />
        <div className="flex-1 flex flex-col justify-center w-full max-w-[min(100vw-2rem,1000px)] min-w-0">
          <div
            className="font-mono text-sm sm:text-base space-y-1 text-left"
            style={{
              color: "rgba(154,154,160,0.9)",
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.15em]">WHOIS HUMAN REGISTRY RECORD</p>
            <p className="text-[13px]">Identity registration complete.</p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.12em]">ARCHETYPE</p>
            <p className="text-lg font-medium" style={{ color: "rgba(232,232,236,0.95)" }}>{archetypeForCompletion.toUpperCase()}</p>
            <p className="mt-2 text-left text-[13px]" style={{ color: "rgba(154,154,160,0.9)" }}>
              {terminalLine || "Registry channel unavailable. Return to Origin to retry."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-left">
              <a href="/origin" className="text-[11px] font-mono text-[#9a9aa0] hover:text-[#c8c8cc] hover:underline">
                ← Return to Origin
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /** Single-line aperture: one row only — status line and input row are mutually exclusive where possible. */
  const showStatusOnly =
    !showInputRow &&
    (phase === "processing" || phase === "executing" || terminalLine);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden whois-origin"
      style={{
        background: "#000",
        position: "relative",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)",
          animation: "whois-field-pulse 10s ease-in-out infinite",
        }}
      />

      <div className="w-full max-w-[min(100vw-2rem,1000px)] min-w-0 flex flex-col items-stretch justify-center">
        <div
          className="whois-aperture w-full min-w-0 mx-auto"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            className="whois-aperture-inner w-full font-mono text-sm sm:text-base py-4 px-4 sm:px-5 flex flex-col justify-center min-h-[2.2em]"
            style={{
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
              lineHeight: 1.9,
            }}
          >
            {showStatusOnly && (
              <div
                className="min-h-[2.2em] flex items-center whitespace-pre-wrap break-words"
                style={{ color: "rgba(154,154,160,0.9)" }}
              >
                {terminalLine}
              </div>
            )}

            {showInputRow && (
              <div
                className="flex items-center gap-1 min-h-[2.2em]"
                aria-label={currentField ? `Enter ${currentField}` : undefined}
              >
                <span style={{ color: "rgba(232,232,236,0.95)" }}>&gt;</span>
                <input
                  key="intake-input"
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none font-mono placeholder:text-[rgba(232,232,236,0.95)]"
                  style={{
                    color: "rgba(232,232,236,0.95)",
                    font: "inherit",
                  }}
                  placeholder={currentField ? INTAKE_PROMPTS[currentField] : ""}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label={currentField ? `Enter ${currentField}` : undefined}
                />
                <span
                  className="inline-block w-2 h-4 bg-[rgba(154,154,160,0.8)] whois-cursor shrink-0"
                  style={{
                    animation: "whois-cursor-blink 1s step-end infinite",
                  }}
                  aria-hidden
                />
              </div>
            )}
          </div>
        </div>

        {/* Handshake: no protocol label, no nav, no registry footer below terminal. */}
      </div>
    </div>
  );
}
