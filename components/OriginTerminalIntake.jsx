"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseDate, parseTime, normalizePlace } from "@/lib/terminal-intake/parseInputs";
import {
  submitToBeautySubmit,
  submitToBeautyDryRun,
  prepurchaseBeautyDraft,
} from "@/lib/engine-client";
import { setBeautyUnlocked, setBeautyDraft, saveLastFormData, saveOriginIntake, isBeautyUnlocked } from "@/lib/landing-storage";
import { FAKE_PAY, TEST_MODE } from "@/lib/dry-run-config";

// LOCKDOWN: WAITLIST_ONLY=1 (default) = terminal-only, no CTA button; Enter → exemplar-Ignispectrum. Set to "0" to re-enable purchase.
const WAITLIST_ONLY = process.env.NEXT_PUBLIC_WAITLIST_ONLY !== "0";

const BOOT_LINES = [
  "(L)IGS SYSTEM INITIALIZING",
  "",
  "Initializing Human WHOIS Resolution Engine…",
  "Loading query interface…",
  "Preparing identity query…",
  "",
  "SYSTEM READY",
];

const INTAKE_PROMPTS = {
  name: "Enter name or designation, then press ENTER:",
  date: "Enter birth date in any format, then press ENTER:",
  time: "Enter birth time (or type \"unknown\"), then press ENTER:",
  place: "Enter place of birth, then press ENTER:",
  email: "Enter contact email, then press ENTER:",
};

const PROCESSING_LINES = [
  "Input parameters accepted.",
  "",
  "Resolving solar field conditions...",
  "Resolving planetary environment...",
  "Calculating light interaction vectors...",
  "Mapping archetypal structure...",
  "",
  "Identity classification stabilized.",
];

/** Staggered delays (ms) before each boot line. Index i = delay before showing line i. */
const BOOT_DELAYS_MS = [
  0,     // (L)IGS SYSTEM INITIALIZING
  600,   // blank
  1200,  // Initializing Human WHOIS Resolution Engine…
  900,   // Loading query interface…
  1600,  // Preparing identity query…
  700,   // blank
  1800,  // SYSTEM READY (dramatic pause)
];

/** Staggered delays (ms) before each processing line. Action→[think]→next. Longer dwell for meaningful steps. */
const PROCESSING_DELAYS_MS = [
  0,     // Input parameters accepted.
  700,   // blank
  1400,  // Resolving solar field conditions...
  1800,  // Resolving planetary environment...
  1700,  // Calculating light interaction vectors...
  2100,  // Mapping archetypal structure...
  900,   // blank
  1800,  // Identity classification stabilized.
];

function getDryRunFromUrl() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dryRun") === "1" || params.get("dryRun") === "true";
}

export default function OriginTerminalIntake() {
  const router = useRouter();
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const lastEnterHandledRef = useRef(0);
  const ctaSubmittingRef = useRef(false);
  const redirectFiredRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const formDataRef = useRef({});
  const intakeStartedRef = useRef(false);
  const phaseRef = useRef("boot");

  const [phase, setPhase] = useState("boot");
  const [bootIndex, setBootIndex] = useState(0);
  const [lines, setLines] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [currentField, setCurrentField] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    birthTime: "",
    birthLocation: "",
    email: "",
  });
  const [dateNeedsConfirm, setDateNeedsConfirm] = useState(null);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [archetypePreviewShown, setArchetypePreviewShown] = useState(false);
  const [waitlistState, setWaitlistState] = useState("idle"); // idle | running | done
  const [countdownRemaining, setCountdownRemaining] = useState(null); // 3 | 2 | 1 | null
  const [ctaVisible, setCtaVisible] = useState(false);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaError, setCtaError] = useState(null);

  const dryRun = getDryRunFromUrl();
  const [unlocked, setUnlockedState] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") setUnlockedState(isBeautyUnlocked());
  }, []);

  const addLine = useCallback((text, type = "system") => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const handleInitialContinue = useCallback(() => {
    if (intakeStartedRef.current) return;
    intakeStartedRef.current = true;
    addLine("Human WHOIS query initiated.");
    setPhase("intake");
    setCurrentField("name");
    addLine(INTAKE_PROMPTS.name);
  }, [addLine]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const redirectNow = useCallback(() => {
    if (redirectFiredRef.current) return;
    redirectFiredRef.current = true;
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownRemaining(null);
    saveOriginIntake(formDataRef.current ?? {});
    router.push("/beauty/view?reportId=exemplar-Ignispectrum");
  }, [router]);

  const scrollToBottom = useCallback(() => {
    queueMicrotask(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
    });
  }, []);

  // Start countdown: chained setTimeout, one timer ref, explicit cleanup. Called when entering completion phase.
  const startRedirectCountdown = useCallback(() => {
    if (countdownTimerRef.current) return;
    let remaining = 3;
    const tick = () => {
      remaining--;
      if (remaining === 0) {
        redirectNow();
        return;
      }
      addLine(`${remaining}…`);
      setCountdownRemaining(remaining);
      countdownTimerRef.current = setTimeout(tick, 1000);
    };
    countdownTimerRef.current = setTimeout(tick, 1000);
  }, [addLine, redirectNow]);

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  // When we enter completion phase with countdown, start it once
  useEffect(() => {
    if (phase !== "completeAwaitingEnterRedirect" || countdownRemaining == null) return;
    startRedirectCountdown();
  }, [phase, countdownRemaining, startRedirectCountdown]);

  // Boot sequence — staggered timing: quick steps, longer for resolution work, pause before SYSTEM READY
  useEffect(() => {
    if (phase !== "boot") return;
    if (bootIndex >= BOOT_LINES.length) {
      setPhase("waiting_enter");
      return;
    }
    const delay = BOOT_DELAYS_MS[bootIndex] ?? 500;
    const t = setTimeout(() => {
      addLine(BOOT_LINES[bootIndex]);
      setBootIndex((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, bootIndex, addLine]);

  // Explicit, mutually exclusive prompt/input rules. No overlap.
  const showInitialContinuePrompt = phase === "waiting_enter";
  const showInputRow = phase === "waiting_enter" || (phase === "intake" && currentField);
  const isCountdownActive = phase === "completeAwaitingEnterRedirect" && countdownRemaining != null && countdownRemaining > 0;
  useEffect(() => {
    if (showInputRow) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [showInputRow, lines.length]);

  // Scroll on new lines — skip during countdown to avoid interruption
  useEffect(() => {
    if (phase === "completeAwaitingEnterRedirect") return;
    scrollToBottom();
  }, [lines, scrollToBottom, phase]);

  // Document-level keydown fallback: Enter works even when input lacks focus (e.g. after navigation).
  useEffect(() => {
    if (phase !== "completeAwaitingEnterRedirect") return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target?.closest?.("a[href]") || e.target?.closest?.("button")) return;
      e.preventDefault();
      redirectNow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, redirectNow]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const now = Date.now();
        if (now - lastEnterHandledRef.current < 150) return;
        lastEnterHandledRef.current = now;

        if (phase === "completeAwaitingEnterRedirect") {
          redirectNow();
          return;
        }

        if (phase === "waiting_enter") {
          handleInitialContinue();
          return;
        }

        if (phase === "intake" && currentField) {
          const raw = inputValue.trim();
          const allowEmpty = currentField === "email" || (currentField === "date" && dateNeedsConfirm);
          if (!raw && !allowEmpty) return;

          if (currentField === "name") {
            const normalized = raw || "—";
            addLine(normalized, "user");
            addLine(`Name received: ${normalized}`);
            setFormData((f) => ({ ...f, name: raw }));
            setInputValue("");
            setCurrentField("date");
            addLine(INTAKE_PROMPTS.date);
            return;
          }

          if (currentField === "date") {
            if (dateNeedsConfirm && !raw) {
              setFormData((f) => ({ ...f, birthDate: dateNeedsConfirm.iso }));
              setDateNeedsConfirm(null);
              setInputValue("");
              setCurrentField("time");
              addLine(INTAKE_PROMPTS.time);
              return;
            }
            if (dateNeedsConfirm && raw) setDateNeedsConfirm(null);
            const parsed = parseDate(raw);
            if (!parsed) {
              addLine(raw, "user");
              addLine("Interpretation unclear. Try format: August 14, 1993 or 8/14/1993");
              setInputValue("");
              return;
            }
            addLine(raw, "user");
            addLine(`Interpreted as: ${parsed.normalized}`);
            addLine("Press ENTER to confirm");
            addLine("or type a new date and press ENTER");
            setDateNeedsConfirm(parsed);
            setInputValue("");
            return;
          }

          if (currentField === "time") {
            const parsed = parseTime(raw);
            addLine(raw, "user");
            if (parsed.unknown) {
              addLine("Birth time unavailable.");
              addLine("Temporal precision reduced.");
            } else {
              addLine(`Time parsed: ${parsed.normalized}`);
            }
            setFormData((f) => ({ ...f, birthTime: parsed.api }));
            setInputValue("");
            setCurrentField("place");
            addLine(INTAKE_PROMPTS.place);
            return;
          }

          if (currentField === "place") {
            const resolved = normalizePlace(raw);
            addLine(raw, "user");
            addLine(`Location received: ${resolved || raw}`);
            setFormData((f) => ({ ...f, birthLocation: raw }));
            setInputValue("");
            setCurrentField("email");
            addLine(INTAKE_PROMPTS.email);
            return;
          }

          if (currentField === "email") {
            const email = raw.trim().toLowerCase();
            if (!email || !email.includes("@")) {
              addLine(raw, "user");
              addLine("Valid email required.");
              setInputValue("");
              return;
            }
            addLine(raw, "user");
            addLine(`Email received: ${email}`);
            setFormData((f) => ({ ...f, email }));
            setInputValue("");
            setCurrentField(null);
            setPhase("processing");
            setProcessingIndex(0);
            return;
          }
        }
      }
    },
    [phase, currentField, inputValue, dateNeedsConfirm, addLine, redirectNow, handleInitialContinue]
  );

  // Processing sequence — when done, add archetype lines and proceed to waitlist/CTA (no carousel)
  useEffect(() => {
    if (phase !== "processing") return;
    if (processingIndex >= PROCESSING_LINES.length) {
      if (!archetypePreviewShown) {
        setTimeout(() => {
          if (phaseRef.current === "completeAwaitingEnterRedirect") return;
          addLine("Primary archetype detected: —");
          addLine("Identity record ready.");
        }, 900);
        setArchetypePreviewShown(true);
        if (WAITLIST_ONLY) {
          setWaitlistState("running");
        } else {
          setCtaVisible(true);
        }
      }
      return;
    }
    const delay = PROCESSING_DELAYS_MS[processingIndex] ?? 550;
    const t = setTimeout(() => {
      addLine(PROCESSING_LINES[processingIndex]);
      setProcessingIndex((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, processingIndex, archetypePreviewShown, addLine]);

  // WAITLIST_ONLY: auto-call waitlist when processing completes, then show Enter prompt (no button)
  useEffect(() => {
    if (waitlistState !== "running" || !WAITLIST_ONLY) return;
    const email = formData.email?.trim?.()?.toLowerCase?.();
    if (!email || !email.includes("@")) {
      addLine("Identity query logged.");
      addLine("Sample identity artifacts available.");
      addLine("Opening registry preview in 3…");
      addLine("");
      addLine("Press ENTER or tap to continue");
      setPhase("completeAwaitingEnterRedirect");
      setCountdownRemaining(3);
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
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
      })
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          addLine("Contact node recorded.");
          addLine("Early registry status confirmed.");
          if (data?.confirmationSent) addLine("Registry confirmation transmitted.");
        } else {
          addLine("Identity query logged.");
          addLine("Sample identity artifacts available.");
        }
        addLine("Opening registry preview in 3…");
        addLine("");
        addLine("Press ENTER or tap to continue");
        setPhase("completeAwaitingEnterRedirect");
        setCountdownRemaining(3);
        setWaitlistState("done");
      })
      .catch(() => {
        if (cancelled) return;
        addLine("Identity query logged.");
        addLine("Sample identity artifacts available.");
        addLine("Opening registry preview in 3…");
        addLine("");
        addLine("Press ENTER or tap to continue");
        setPhase("completeAwaitingEnterRedirect");
        setCountdownRemaining(3);
        setWaitlistState("done");
      });
    return () => { cancelled = true; };
  }, [waitlistState, formData.email, addLine]);

  const handleCtaClick = useCallback(async () => {
    if (ctaSubmittingRef.current) return;
    ctaSubmittingRef.current = true;
    const payload = {
      name: formData.name,
      birthDate: formData.birthDate,
      birthTime: formData.birthTime,
      birthLocation: formData.birthLocation,
      email: formData.email,
    };
    setCtaError(null);
    setCtaLoading(true);

    try {
      if (WAITLIST_ONLY) {
        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payload.email.trim().toLowerCase(),
            source: "origin-terminal",
            birthDate: payload.birthDate || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setCtaError(data?.error ?? "Something went wrong. Try again.");
          return;
        }
        addLine("Contact node recorded.");
        addLine("Early registry status confirmed.");
        if (data?.confirmationSent) addLine("Registry confirmation transmitted.");
        addLine("Opening registry preview in 3…");
        addLine("");
        addLine("Press ENTER or tap to continue");
        setCtaVisible(false);
        setPhase("completeAwaitingEnterRedirect");
        setCountdownRemaining(3);
        return;
      }

      if (unlocked || dryRun || TEST_MODE) {
        const result = dryRun
          ? await submitToBeautyDryRun(payload)
          : await submitToBeautySubmit(payload);
        const reportId = result?.reportId;
        if (!reportId) {
          setCtaError("Generation failed: No report ID returned.");
          return;
        }
        saveLastFormData(reportId, payload);
        router.push(`/beauty/view?reportId=${encodeURIComponent(reportId)}`);
        return;
      }
      if (FAKE_PAY) {
        setBeautyUnlocked();
        const result = await submitToBeautySubmit(payload);
        const reportId = result?.reportId;
        if (reportId) {
          saveLastFormData(reportId, payload);
          router.push(`/beauty/view?reportId=${encodeURIComponent(reportId)}`);
        }
        return;
      }

      setBeautyDraft(payload);
      let draftId = null;
      try {
        const prep = await prepurchaseBeautyDraft(payload);
        draftId = prep?.draftId ?? null;
      } catch {
        // fallback to localStorage
      }
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prePurchase: true, ...(draftId && { draftId }) }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errMsg = json?.error ?? "Checkout unavailable. Try again later.";
        setCtaError(errMsg === "STRIPE_NOT_CONFIGURED"
          ? "Stripe not configured. Add STRIPE_SECRET_KEY to enable checkout."
          : errMsg);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
      } else {
        setCtaError("No checkout URL returned.");
      }
    } catch (err) {
      setCtaError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      ctaSubmittingRef.current = false;
      setCtaLoading(false);
    }
  }, [formData, unlocked, dryRun, router, addLine]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b] overflow-x-hidden">
      <div className="w-full max-w-2xl min-w-0 overflow-hidden">
        <div
          className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden"
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="px-4 py-2.5 border-b border-[#2a2a2e] flex items-center gap-2"
            style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#4a4a4e]" />
            <span className="ml-2 text-[10px] uppercase tracking-widest font-mono" style={{ color: "#a8a8b0" }}>
              (L)IGS Human WHOIS Resolution Engine
            </span>
          </div>

          <div
            ref={scrollRef}
            className="h-[min(70vh,480px)] overflow-x-hidden overflow-y-auto px-5 py-4 font-mono text-sm sm:text-base"
            style={{
              color: "#c8c8cc",
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace",
              lineHeight: 1.7,
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className="whitespace-pre-wrap break-words"
                style={{
                  color: line.type === "user" ? "#e8e8ec" : "#9a9aa0",
                }}
              >
                {line.type === "user" ? "> " : ""}
                {line.text}
              </div>
            ))}

            {showInputRow && (
              <div
                className={`flex items-center gap-1 mt-1 min-h-[44px] ${showInitialContinuePrompt ? "cursor-pointer touch-manipulation" : ""}`}
                onClick={showInitialContinuePrompt ? handleInitialContinue : undefined}
                onKeyDown={showInitialContinuePrompt ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleInitialContinue(); } } : undefined}
                role={showInitialContinuePrompt ? "button" : undefined}
                tabIndex={showInitialContinuePrompt ? 0 : undefined}
                aria-label={showInitialContinuePrompt ? "Press ENTER or tap to continue" : undefined}
              >
                <span className="text-[#7a7a80]">&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-[#e8e8ec] font-mono placeholder-[#5a5a60]"
                  style={{ font: "inherit" }}
                  placeholder={showInitialContinuePrompt ? "Press ENTER or tap to continue" : ""}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label={showInitialContinuePrompt ? "Press ENTER or tap to continue" : currentField ? `Enter ${currentField}` : "Press Enter to continue"}
                />
                <span
                  className="inline-block w-2 h-4 bg-[#7a7a80] animate-pulse"
                  style={{ animationDuration: "1s" }}
                  aria-hidden
                />
              </div>
            )}
          </div>

          {ctaVisible && !WAITLIST_ONLY && (
            <div className="px-5 py-4 border-t border-[#2a2a2e] bg-[#0a0a0b]">
              <button
                onClick={handleCtaClick}
                disabled={ctaLoading}
                className="w-full py-3 px-4 rounded-md font-medium text-sm tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #4a3a8a 0%, #3a2a6a 100%)",
                  color: "#f0f0f4",
                  border: "1px solid rgba(122,79,255,0.3)",
                }}
              >
                {ctaLoading ? "Redirecting…" : "Generate Human WHOIS Record"}
              </button>
              {ctaError && (
                <p className="mt-2 text-xs text-[#c06060]" style={{ fontFamily: "inherit" }}>
                  {ctaError}
                </p>
              )}
            </div>
          )}
        </div>

        <p
          className="mt-4 pt-3 text-center text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
          style={{ fontFamily: "inherit", color: "#8a8a90" }}
        >
          (L)IGS — Human WHOIS Resolution Engine
        </p>
      </div>
    </div>
  );
}
