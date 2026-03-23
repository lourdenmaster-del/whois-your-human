"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseDate, parseTime } from "@/lib/terminal-intake/parseInputs";
import { resolveArchetypeFromDate } from "@/lib/terminal-intake/resolveArchetypeFromDate";
import {
  submitToWhoisSubmit,
  submitToWhoisDryRun,
} from "@/lib/engine-client";
import {
  setWhoisUnlocked,
  saveLastFormData,
  saveOriginIntake,
  loadLastFormData,
  isWhoisUnlocked,
} from "@/lib/landing-storage";
import { FAKE_PAY, TEST_MODE } from "@/lib/dry-run-config";

/** Single active field during intake. Order: name → birthDate → birthPlace → birthTime → email. */
const INTAKE_FIELDS = ["name", "birthDate", "birthPlace", "birthTime", "email"];
const INTAKE_PROMPTS = {
  name: "WHOIS <your name>",
  birthDate: "Birth date:",
  birthPlace: "Place of birth:",
  birthTime: "Birth time (or UNKNOWN):",
  email: "Contact email:",
};

/** Sequential single-line status messages during processing (registry protocol). */
const PROCESSING_MESSAGES = [
  "Registry record created…",
  "Resolving solar segment…",
  "Mapping archetypal structure…",
];

const PROCESSING_DELAYS_MS = [900, 1200, 800];

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

export default function OriginTerminalIntake() {
  const router = useRouter();
  const inputRef = useRef(null);
  const lastEnterHandledRef = useRef(0);
  const ctaSubmittingRef = useRef(false);
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
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaError, setCtaError] = useState(null);
  const [aiWhoisCopied, setAiWhoisCopied] = useState(false);
  const aiCopyFeedbackRef = useRef(0);
  const [lastReportId, setLastReportId] = useState(null);
  const [purchaseRedirecting, setPurchaseRedirecting] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const [registryCount, setRegistryCount] = useState(null);
  const [stanceCounts, setStanceCounts] = useState(null);

  useEffect(() => {
    fetch("/api/registry/count")
      .then((r) => r.json())
      .then((data) => {
        const total = data?.total;
        if (typeof total === "number" && total >= 0) setRegistryCount(total);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch("/api/agent/stance")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.endorse === "number" && typeof data.decline === "number" && typeof data.abstain === "number") {
          setStanceCounts({ endorse: data.endorse, decline: data.decline, abstain: data.abstain });
        }
      })
      .catch(() => {});
  }, []);

  const dryRun = getDryRunFromUrl();
  const [unlocked, setUnlockedState] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") setUnlockedState(isWhoisUnlocked());
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

  const goToErrorAndComplete = useCallback((message) => {
    setCtaError(message);
    setTerminalLine(`${message} Press ENTER to continue.`);
    setPhase("completeAwaitingEnterRedirect");
  }, []);

  const advanceToProcessing = useCallback(() => {
    setPhase("processing");
    setProcessingIndex(0);
    setTerminalLine("Resolution initiated. Creating registry record…");
  }, []);

  const showInputRow =
    currentField != null &&
    phase !== "processing" &&
    phase !== "completeAwaitingEnterRedirect" &&
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
      if (unlocked || dryRun || TEST_MODE) {
        const result = dryRun
          ? await submitToWhoisDryRun(payload)
          : await submitToWhoisSubmit(payload);
        const reportId = result?.reportId;
        if (!reportId) {
          goToErrorAndComplete("Registry record generation failed.");
          return;
        }
        saveLastFormData(reportId, payload);
        setLastReportId(reportId);
        router.replace(`/whois/view?reportId=${encodeURIComponent(reportId)}`);
        return;
      }

      if (FAKE_PAY) {
        setWhoisUnlocked();
        const result = await submitToWhoisSubmit(payload);
        const reportId = result?.reportId;
        if (reportId) {
          saveLastFormData(reportId, payload);
          setLastReportId(reportId);
          router.replace(`/whois/view?reportId=${encodeURIComponent(reportId)}`);
        }
        return;
      }

      const existingReportId = loadLastFormData()?.reportId;
      if (existingReportId) {
        // Show WHOIS result screen first; user clicks Unlock there to go to Stripe.
        setLastReportId(existingReportId);
        router.replace(`/whois/view?reportId=${encodeURIComponent(existingReportId)}`);
        return;
      }
      // Canonical rule: record MUST exist before checkout. Create it now.
      // FREE flow: use dryRun so protocol-only path; engine runs only after payment.
      // Show WHOIS result screen first; user clicks Unlock there to go to Stripe.
      const result = await submitToWhoisSubmit(payload, { dryRun: true });
      const reportId = result?.reportId;
      if (!reportId) {
        goToErrorAndComplete("Registry record generation failed.");
        return;
      }
      saveLastFormData(reportId, payload);
      setLastReportId(reportId);
      router.replace(`/whois/view?reportId=${encodeURIComponent(reportId)}`);
    } catch (err) {
      goToErrorAndComplete(err?.message ?? "Something went wrong.");
    } finally {
      ctaSubmittingRef.current = false;
      setCtaLoading(false);
    }
  }, [formData, unlocked, dryRun, goToErrorAndComplete, resolvedArchetypeFromDate, router]);

  const executeSubmitRef = useRef(null);
  executeSubmitRef.current = handleRunWhoisClick;

  const handlePurchaseClick = useCallback(async () => {
    if (purchaseRedirecting) return;
    setPurchaseError(null);
    setPurchaseRedirecting(true);
    try {
      let reportIdToUse = lastReportId || loadLastFormData()?.reportId;
      if (!reportIdToUse) {
        // Canonical rule: record MUST exist before checkout. Create it now from formData.
        const payload = formDataRef.current
          ? {
              name: formDataRef.current.name?.trim() || "—",
              birthDate: formDataRef.current.birthDate,
              birthTime: formDataRef.current.birthTime,
              birthLocation: formDataRef.current.birthLocation,
              email: formDataRef.current.email?.trim?.()?.toLowerCase?.() || "",
            }
          : null;
        if (!payload?.email || !payload.birthDate) {
          setPurchaseError("Complete intake before unlocking.");
          setPurchaseRedirecting(false);
          return;
        }
        // FREE flow: create protocol-only record before checkout; engine runs after payment.
        const result = await submitToWhoisSubmit(payload, { dryRun: true });
        reportIdToUse = result?.reportId;
        if (!reportIdToUse) {
          setPurchaseError("Registry record generation failed.");
          setPurchaseRedirecting(false);
          return;
        }
        saveLastFormData(reportIdToUse, payload);
        setLastReportId(reportIdToUse);
      }
      if (FAKE_PAY) {
        setWhoisUnlocked();
        window.location.href = `/whois/view?reportId=${encodeURIComponent(reportIdToUse)}`;
        return;
      }
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: reportIdToUse }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPurchaseError(json?.message ?? json?.error ?? "Mint unavailable.");
        setPurchaseRedirecting(false);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
        return;
      }
        setPurchaseError("No mint URL returned.");
    } catch {
      setPurchaseError("Could not start mint.");
    } finally {
      setPurchaseRedirecting(false);
    }
  }, [lastReportId, purchaseRedirecting]);

  useEffect(() => {
    if (phase !== "processing") return;
    if (processingIndex >= PROCESSING_MESSAGES.length) {
      if (!archetypePreviewShown) {
        setTimeout(() => {
          if (phaseRef.current === "completeAwaitingEnterRedirect") return;
          const archetype = resolvedArchetypeFromDate ?? resolveArchetypeFromDate(formDataRef.current?.birthDate ?? "");
          setTerminalLine(`Archetype resolved: ${archetype}. Ready.`);
        }, 800);
        setArchetypePreviewShown(true);
        setTerminalLine("Resolution initiated…");
        setPhase("executing");
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

  const archetypeForCompletion = resolvedArchetypeFromDate ?? resolveArchetypeFromDate(formData.birthDate ?? "") ?? "—";

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
            {(phase === "idle" || phase === "intake") && (
              <>
                <p
                  className="mb-3 w-full font-mono text-[10px] uppercase tracking-[0.14em] sm:text-[11px] sm:tracking-[0.15em]"
                  style={{ color: "rgba(154,154,160,0.85)" }}
                >
                  LIGS HUMAN WHOIS REGISTRY — register your human
                </p>
                <p
                  className="mb-3 w-full font-mono text-[10px] leading-relaxed tracking-[0.06em] sm:text-[11px]"
                  style={{ color: "rgba(154,154,160,0.72)" }}
                >
                  Creates your registry record. Mint required for agent surface.
                </p>
              </>
            )}
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

        {(registryCount != null || stanceCounts != null) && (
          <div
            className="mt-8 pt-6 border-t border-white/[0.08] font-mono text-[11px] text-[rgba(154,154,160,0.8)]"
            style={{ fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace" }}
          >
            <p className="uppercase tracking-[0.12em] text-[rgba(154,154,160,0.6)] mb-2">Protocol signal</p>
            {registryCount != null && (
              <p className="mb-1">Registry nodes recorded: {registryCount}</p>
            )}
            {stanceCounts != null && (
              <p>
                Agents evaluated: {stanceCounts.endorse + stanceCounts.decline + stanceCounts.abstain} — endorse: {stanceCounts.endorse}, decline: {stanceCounts.decline}, abstain: {stanceCounts.abstain}
              </p>
            )}
          </div>
        )}

        <div
          className="mt-6 pt-6 border-t border-white/[0.08] font-mono text-[11px] text-[rgba(154,154,160,0.8)]"
          style={{ fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace" }}
        >
          <p className="uppercase tracking-[0.12em] text-[rgba(154,154,160,0.6)] mb-2">Case studies</p>
          <div className="flex flex-col gap-1 text-left">
            <a href="/whois-your-human/case-studies/wyh-001" className="text-[rgba(154,154,160,0.8)] hover:text-[rgba(200,200,205,0.95)] hover:underline">wyh-001</a>
            <a href="/whois-your-human/case-studies/wyh-004" className="text-[rgba(154,154,160,0.8)] hover:text-[rgba(200,200,205,0.95)] hover:underline">wyh-004</a>
            <a href="/whois-your-human/case-studies/wyh-005" className="text-[rgba(154,154,160,0.8)] hover:text-[rgba(200,200,205,0.95)] hover:underline">wyh-005</a>
            <a href="/whois-your-human/case-studies/wyh-006" className="text-[rgba(154,154,160,0.8)] hover:text-[rgba(200,200,205,0.95)] hover:underline">wyh-006</a>
          </div>
        </div>
      </div>
    </div>
  );
}
