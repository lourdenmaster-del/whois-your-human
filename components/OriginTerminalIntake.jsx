"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const WAITLIST_ONLY = process.env.NEXT_PUBLIC_WAITLIST_ONLY !== "0";

/** Intake order: name first, email last. */
const INTAKE_FIELDS = ["name", "date", "time", "place", "email"];
const INTAKE_PROMPTS = {
  name: "Enter name or designation:",
  date: "Enter birth date:",
  time: "Enter birth time, or type UNKNOWN:",
  place: "Enter place of birth:",
  email: "Enter contact email:",
};

const BOOT_LINES = [
  "(L)IGS identity protocol initializing...",
  "Human WHOIS registry online.",
  "Press ENTER to begin.",
];

const PROCESSING_LINES = [
  "Resolving solar field...",
  "Mapping archetypal structure...",
  "Identity record ready.",
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
  const scrollRef = useRef(null);
  const lastEnterHandledRef = useRef(0);
  const ctaSubmittingRef = useRef(false);
  const redirectFiredRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const formDataRef = useRef({});
  const phaseRef = useRef("idle");
  const bootCompleteHandledRef = useRef(false);

  const [phase, setPhase] = useState("idle");
  const [lines, setLines] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [inputVisible, setInputVisible] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    birthTime: "",
    birthLocation: "",
    email: "",
  });
  const [dateNeedsConfirm, setDateNeedsConfirm] = useState(null);
  const [resolvedArchetypeFromDate, setResolvedArchetypeFromDate] = useState(null);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [archetypePreviewShown, setArchetypePreviewShown] = useState(false);
  const [waitlistState, setWaitlistState] = useState("idle");
  const [countdownRemaining, setCountdownRemaining] = useState(null);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaError, setCtaError] = useState(null);
  const [registryCount, setRegistryCount] = useState(null);

  const dryRun = getDryRunFromUrl();
  const [unlocked, setUnlockedState] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") setUnlockedState(isBeautyUnlocked());
  }, []);

  const addLine = useCallback((text, type = "system") => {
    setLines((prev) => [...prev, { text, type }]);
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
    return () => { cancelled = true; };
  }, []);

  const redirectNow = useCallback(() => {
    if (redirectFiredRef.current) return;
    redirectFiredRef.current = true;
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownRemaining(null);
    saveOriginIntake(formDataRef.current ?? {});
    const archetype = resolvedArchetypeFromDate ?? resolveArchetypeFromDate(formDataRef.current?.birthDate ?? "");
    router.push(`/beauty/view?reportId=exemplar-${archetype}`);
  }, [router, resolvedArchetypeFromDate]);

  const scrollToBottom = useCallback(() => {
    queueMicrotask(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
    });
  }, []);

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

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "completeAwaitingEnterRedirect" || countdownRemaining == null) return;
    startRedirectCountdown();
  }, [phase, countdownRemaining, startRedirectCountdown]);

  const goToErrorAndComplete = useCallback(
    (message) => {
      setCtaError(message);
      addLine(message);
      addLine("");
      addLine("Press ENTER or tap to continue");
      setPhase("completeAwaitingEnterRedirect");
      setCountdownRemaining(null);
    },
    [addLine]
  );

  const handleActivate = useCallback(() => {
    if (phase !== "idle") return;
    setPhase("booting");
    let idx = 0;
    const addNextBootLine = () => {
      if (idx >= BOOT_LINES.length) {
        setPhase("bootComplete");
        return;
      }
      addLine(BOOT_LINES[idx]);
      idx += 1;
      if (idx < BOOT_LINES.length) {
        setTimeout(addNextBootLine, 800);
      } else {
        setPhase("bootComplete");
      }
    };
    setTimeout(addNextBootLine, 600);
  }, [phase, addLine]);

  const handleBootCompleteEnter = useCallback(() => {
    if (phase !== "bootComplete" || bootCompleteHandledRef.current) return;
    bootCompleteHandledRef.current = true;
    setPhase("intake");
    setCurrentField("name");
    addLine(INTAKE_PROMPTS.name);
    setInputVisible(true);
    setInputValue("");
  }, [phase, addLine]);

  const handleDateConfirm = useCallback(() => {
    if (currentField !== "date" || !dateNeedsConfirm) {
      if (typeof window !== "undefined") {
        console.debug("[OriginIntake] Date confirm skipped", { currentField, dateNeedsConfirm: !!dateNeedsConfirm });
      }
      return;
    }
    setFormData((f) => ({ ...f, birthDate: dateNeedsConfirm.iso }));
    setDateNeedsConfirm(null);
    setInputValue("");
    const nextIdx = INTAKE_FIELDS.indexOf("date") + 1;
    const nextField = INTAKE_FIELDS[nextIdx];
    setCurrentField(nextField);
    addLine(INTAKE_PROMPTS[nextField]);
  }, [currentField, dateNeedsConfirm, addLine]);

  const advanceToProcessing = useCallback(() => {
    setPhase("processing");
    setProcessingIndex(0);
    addLine("Parameters accepted.");
    addLine("");
  }, [addLine]);

  const showInputRow =
    (phase === "idle" && inputVisible) ||
    phase === "booting" ||
    phase === "bootComplete" ||
    (phase === "intake" && currentField) ||
    (phase === "completeAwaitingEnterRedirect" && countdownRemaining == null);

  const showIdlePrompt = phase === "idle";
  const showBootCompletePrompt = phase === "bootComplete";
  const showCompleteEnterPrompt = phase === "completeAwaitingEnterRedirect" && countdownRemaining == null;
  const showDateConfirmTap = phase === "intake" && currentField === "date" && dateNeedsConfirm;

  const visibleLinesCount = 3;
  const visibleLines = lines.slice(-visibleLinesCount);

  useEffect(() => {
    if (showInputRow || showIdlePrompt || showBootCompletePrompt) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [showInputRow, showIdlePrompt, showBootCompletePrompt, lines.length]);

  useEffect(() => {
    if (phase === "completeAwaitingEnterRedirect") return;
    scrollToBottom();
  }, [lines, scrollToBottom, phase]);

  useEffect(() => {
    if (phase !== "completeAwaitingEnterRedirect") return;
    const onKeyDown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.target?.closest?.("a[href]") || e.target?.closest?.("button")) return;
      e.preventDefault();
      if (countdownRemaining == null) {
        setCountdownRemaining(3);
      } else {
        redirectNow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, countdownRemaining, redirectNow]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const now = Date.now();
        if (now - lastEnterHandledRef.current < 150) return;
        lastEnterHandledRef.current = now;

        if (phase === "idle") {
          if (!inputVisible) {
            setInputVisible(true);
            handleActivate();
          }
          return;
        }

        if (phase === "bootComplete") {
          handleBootCompleteEnter();
          return;
        }

        if (phase === "completeAwaitingEnterRedirect") {
          if (countdownRemaining == null) {
            setCountdownRemaining(3);
          } else {
            redirectNow();
          }
          return;
        }

        if (phase === "intake" && currentField) {
          const raw = inputValue.trim();
          const allowEmpty = currentField === "date" && dateNeedsConfirm;
          if (!raw && !allowEmpty) {
            if (typeof window !== "undefined") {
              console.debug("[OriginIntake] Enter ignored: empty input", { currentField, dateNeedsConfirm: !!dateNeedsConfirm });
            }
            return;
          }

          if (currentField === "name") {
            if (!raw) {
              addLine(raw || "(blank)", "user");
              addLine("Name required.");
              setInputValue("");
              return;
            }
            addLine(raw, "user");
            setFormData((f) => ({ ...f, name: raw }));
            setInputValue("");
            const nextIdx = INTAKE_FIELDS.indexOf("name") + 1;
            const nextField = INTAKE_FIELDS[nextIdx];
            setCurrentField(nextField);
            addLine(INTAKE_PROMPTS[nextField]);
            return;
          }

          if (currentField === "date") {
            if (dateNeedsConfirm && !raw) {
              handleDateConfirm();
              return;
            }
            if (dateNeedsConfirm && raw) setDateNeedsConfirm(null);
            const parsed = parseDate(raw);
            if (!parsed) {
              addLine(raw, "user");
              addLine("Try: August 14, 1993 or 8/14/1993");
              setInputValue("");
              return;
            }
            addLine(raw, "user");
            setFormData((f) => ({ ...f, birthDate: parsed.iso }));
            setResolvedArchetypeFromDate(resolveArchetypeFromDate(parsed.iso));
            addLine(`Interpreted as: ${parsed.normalized}`);
            addLine("Press ENTER to confirm.");
            setDateNeedsConfirm(parsed);
            setInputValue("");
            return;
          }

          if (currentField === "time") {
            const parsed = parseTime(raw);
            addLine(raw, "user");
            setFormData((f) => ({ ...f, birthTime: parsed.api }));
            setInputValue("");
            const nextIdx = INTAKE_FIELDS.indexOf("time") + 1;
            const nextField = INTAKE_FIELDS[nextIdx];
            setCurrentField(nextField);
            addLine(INTAKE_PROMPTS[nextField]);
            return;
          }

          if (currentField === "place") {
            if (!raw) {
              addLine(raw || "(blank)", "user");
              addLine("Place required.");
              setInputValue("");
              return;
            }
            addLine(raw, "user");
            setFormData((f) => ({ ...f, birthLocation: raw }));
            setInputValue("");
            const nextIdx = INTAKE_FIELDS.indexOf("place") + 1;
            const nextField = INTAKE_FIELDS[nextIdx];
            setCurrentField(nextField);
            addLine(INTAKE_PROMPTS[nextField]);
            return;
          }

          if (currentField === "email") {
            if (!isValidEmail(raw)) {
              addLine(raw || "(blank)", "user");
              addLine("Enter a valid contact email.");
              setInputValue("");
              return;
            }
            const email = raw.trim().toLowerCase();
            addLine(email, "user");
            setFormData((f) => ({ ...f, email }));
            setInputValue("");
            setCurrentField(null);
            advanceToProcessing();
            return;
          }
        }
      }
    },
    [
      phase,
      currentField,
      inputValue,
      dateNeedsConfirm,
      countdownRemaining,
      inputVisible,
      addLine,
      redirectNow,
      handleActivate,
      handleBootCompleteEnter,
      handleDateConfirm,
      advanceToProcessing,
    ]
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
          addLine("Identity query could not be recorded.");
          addLine("You may continue, but confirmation is not secured.");
          addLine("");
          addLine("Press ENTER or tap to continue");
          setPhase("completeAwaitingEnterRedirect");
          setCountdownRemaining(null);
          return;
        }
        if (data?.alreadyRegistered) {
          addLine("Identity record already exists.");
          addLine("Contact node verified.");
        } else {
          addLine("Contact node recorded.");
          addLine("Identity query logged.");
          if (data?.confirmationSent) addLine("Confirmation signal transmitted.");
        }
        addLine("");
        addLine("Press ENTER or tap to continue");
        setPhase("completeAwaitingEnterRedirect");
        setCountdownRemaining(null);
        return;
      }

      if (unlocked || dryRun || TEST_MODE) {
        const result = dryRun
          ? await submitToBeautyDryRun(payload)
          : await submitToBeautySubmit(payload);
        const reportId = result?.reportId;
        if (!reportId) {
          goToErrorAndComplete("Generation failed.");
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
  }, [formData, unlocked, dryRun, router, addLine, goToErrorAndComplete, resolvedArchetypeFromDate]);

  const executeSubmitRef = useRef(null);
  executeSubmitRef.current = handleRunWhoisClick;

  useEffect(() => {
    if (phase !== "processing") return;
    if (processingIndex >= PROCESSING_LINES.length) {
      if (!archetypePreviewShown) {
        setTimeout(() => {
          if (phaseRef.current === "completeAwaitingEnterRedirect") return;
          const archetype = resolvedArchetypeFromDate ?? resolveArchetypeFromDate(formDataRef.current?.birthDate ?? "");
          addLine(`Archetype: ${archetype}`);
          addLine("Ready.");
        }, 800);
        setArchetypePreviewShown(true);
        if (WAITLIST_ONLY) {
          const email = formDataRef.current?.email?.trim?.()?.toLowerCase?.();
          if (email && isValidEmail(email)) {
            setWaitlistState("running");
          } else {
            addLine("");
            addLine("Press ENTER or tap to continue");
            setPhase("completeAwaitingEnterRedirect");
            setCountdownRemaining(null);
          }
        } else {
          addLine("");
          addLine("Executing query...");
          setPhase("executing");
        }
      }
      return;
    }
    const delay = PROCESSING_DELAYS_MS[processingIndex] ?? 800;
    const t = setTimeout(() => {
      addLine(PROCESSING_LINES[processingIndex]);
      setProcessingIndex((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, processingIndex, archetypePreviewShown, resolvedArchetypeFromDate, addLine]);

  useEffect(() => {
    if (phase !== "executing") return;
    executeSubmitRef.current?.();
  }, [phase]);

  useEffect(() => {
    if (waitlistState !== "running" || !WAITLIST_ONLY) return;
    const email = formData.email?.trim?.()?.toLowerCase?.();
    if (!email || !isValidEmail(email)) {
      addLine("Press ENTER or tap to continue");
      setPhase("completeAwaitingEnterRedirect");
      setCountdownRemaining(null);
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
        return { ok: res.ok, data };
      })
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) {
          if (data?.alreadyRegistered) {
            addLine("Identity record already exists.");
            addLine("Contact node verified.");
          } else {
            addLine("Contact node recorded.");
            addLine("Identity query logged.");
            if (data?.confirmationSent) addLine("Confirmation signal transmitted.");
          }
        } else {
          addLine("Identity query could not be recorded.");
          addLine("You may continue, but confirmation is not secured.");
        }
        addLine("");
        addLine("Press ENTER or tap to continue");
        setPhase("completeAwaitingEnterRedirect");
        setCountdownRemaining(null);
        setWaitlistState("done");
      })
      .catch(() => {
        if (cancelled) return;
        addLine("Identity query could not be recorded.");
        addLine("You may continue, but confirmation is not secured.");
        addLine("");
        addLine("Press ENTER or tap to continue");
        setPhase("completeAwaitingEnterRedirect");
        setCountdownRemaining(null);
        setWaitlistState("done");
      });
    return () => {
      cancelled = true;
    };
  }, [waitlistState, formData.email, formData.birthDate, addLine, resolvedArchetypeFromDate]);

  const handleCompleteTap = useCallback(() => {
    if (countdownRemaining == null) {
      setCountdownRemaining(3);
    } else {
      redirectNow();
    }
  }, [countdownRemaining, redirectNow]);

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

      <div
        ref={scrollRef}
        className="whois-aperture w-full max-w-[min(100vw-2rem,1000px)] min-w-0 mx-auto"
        style={{ position: "relative", zIndex: 1 }}
      >
        {phase === "idle" && lines.length === 0 ? (
          <div
            className="whois-aperture-inner flex flex-col items-center justify-center min-h-[120px] w-full text-center cursor-default"
            onClick={() => {
              setInputVisible(true);
              handleActivate();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setInputVisible(true);
                handleActivate();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Press ENTER to begin"
          >
            <p
              className="text-sm sm:text-base font-mono"
              style={{
                color: "rgba(232,232,236,0.92)",
                fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
                letterSpacing: "0.06em",
              }}
            >
              Press ENTER to begin.
            </p>
          </div>
        ) : (
          <div
            className="whois-aperture-inner w-full font-mono text-sm sm:text-base min-h-[120px] flex flex-col justify-end py-4 px-4 sm:px-5"
            style={{
              color: "rgba(154,154,160,0.9)",
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
              lineHeight: 1.9,
            }}
          >
            {visibleLines.map((line, i) => (
              <div
                key={`line-${lines.length - visibleLines.length + i}`}
                className="whitespace-pre-wrap break-words"
                style={{
                  color: line.type === "user" ? "rgba(232,232,236,0.95)" : "rgba(154,154,160,0.9)",
                }}
              >
                {line.type === "user" ? "> " : ""}
                {line.text}
              </div>
            ))}

            {showInputRow && (
              <div
                className={`flex items-center gap-1 mt-1 min-h-[2.2em] ${showIdlePrompt || showBootCompletePrompt || showCompleteEnterPrompt || showDateConfirmTap ? "cursor-pointer touch-manipulation" : ""}`}
                onClick={
                  showIdlePrompt
                    ? () => {
                        setInputVisible(true);
                        handleActivate();
                      }
                    : showBootCompletePrompt
                    ? handleBootCompleteEnter
                    : showCompleteEnterPrompt
                    ? handleCompleteTap
                    : showDateConfirmTap
                    ? handleDateConfirm
                    : undefined
                }
                onKeyDown={
                  showIdlePrompt
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setInputVisible(true);
                          handleActivate();
                        }
                      }
                    : showBootCompletePrompt
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleBootCompleteEnter();
                        }
                      }
                    : showCompleteEnterPrompt
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleCompleteTap();
                        }
                      }
                    : undefined
                }
                role={showIdlePrompt || showBootCompletePrompt || showCompleteEnterPrompt || showDateConfirmTap ? "button" : undefined}
                tabIndex={showIdlePrompt || showBootCompletePrompt || showCompleteEnterPrompt || showDateConfirmTap ? 0 : undefined}
                aria-label={showIdlePrompt || showBootCompletePrompt ? "Press ENTER to begin" : showCompleteEnterPrompt ? "Press ENTER or tap to continue" : currentField ? `Enter ${currentField}` : undefined}
              >
                <span style={{ color: "rgba(122,122,128,0.9)" }}>&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none font-mono"
                  style={{
                    color: "rgba(232,232,236,0.95)",
                    font: "inherit",
                  }}
                  placeholder=""
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label={showIdlePrompt || showBootCompletePrompt ? "Press ENTER to begin" : currentField ? `Enter ${currentField}` : "Press Enter to continue"}
                />
                <span
                  className="inline-block w-2 h-4 bg-[rgba(154,154,160,0.8)] whois-cursor"
                  style={{
                    animation: "whois-cursor-blink 1s step-end infinite",
                  }}
                  aria-hidden
                />
              </div>
            )}
          </div>
        )}
      </div>

      {phase !== "idle" && phase !== "booting" && (
        <p
          className="mt-8 text-[9px] font-mono uppercase tracking-[0.12em] text-center"
          style={{ color: "rgba(122,122,128,0.4)" }}
        >
          Human WHOIS protocol
        </p>
      )}
      {phase !== "idle" && phase !== "booting" && (
        <div className="protocol-nav mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
          <a href="/dossier" className="text-[11px] font-mono">
            View Dossier
          </a>
        </div>
      )}
      {typeof registryCount === "number" && (
        <div
          className="mt-2 text-center font-mono"
          style={{
            animation: "whois-fade-in 0.5s ease-out forwards",
          }}
        >
          <p
            className="text-[13px] leading-tight"
            style={{ color: "rgba(180,182,190,0.78)" }}
          >
            Registry nodes recorded: {registryCount}
          </p>
          <p
            className="mt-0.5 text-[11px] leading-tight"
            style={{ color: "rgba(160,162,170,0.62)" }}
          >
            Full identity reports released to registry members first.
          </p>
        </div>
      )}
    </div>
  );
}
