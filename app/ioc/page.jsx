"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const IOC_FULL_KEY = "ioc_ioc_full_v1";
const IOC_PRE_CHECKOUT_KEY = "ioc_pre_checkout";

function IocPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutSessionId = searchParams.get("ioc_checkout_session");

  const [birthdate, setBirthdate] = useState("");
  const [archetype, setArchetype] = useState("");
  const [iocFree, setIocFree] = useState("");
  const [iocFull, setIocFull] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const clipboardText = unlocked && iocFull ? iocFull : iocFree;

  const applyPreCheckoutFromStorage = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(IOC_PRE_CHECKOUT_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (typeof p.birthdate === "string") setBirthdate(p.birthdate);
      if (typeof p.iocFree === "string") setIocFree(p.iocFree);
      if (typeof p.archetype === "string") setArchetype(p.archetype);
      setUnlocked(false);
      setIocFull("");
    } catch {
      /* ignore */
    }
  }, []);

  useLayoutEffect(() => {
    try {
      if (checkoutSessionId?.trim()) {
        const raw = sessionStorage.getItem(IOC_PRE_CHECKOUT_KEY);
        if (raw) {
          const p = JSON.parse(raw);
          if (typeof p.birthdate === "string") setBirthdate(p.birthdate);
          if (typeof p.iocFree === "string") setIocFree(p.iocFree);
          if (typeof p.archetype === "string") setArchetype(p.archetype);
          setUnlocked(false);
          setIocFull("");
        }
        return;
      }
      const full = sessionStorage.getItem(IOC_FULL_KEY);
      if (full && full.length > 0) {
        setIocFull(full);
        setIocFree("");
        setUnlocked(true);
      }
    } catch {
      /* ignore */
    }
  }, [checkoutSessionId]);

  useEffect(() => {
    const sid = checkoutSessionId?.trim();
    if (!sid) return;
    let cancelled = false;
    setVerifying(true);
    void fetch(`/api/ioc/verify-session?ioc_checkout_session=${encodeURIComponent(sid)}`)
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (cancelled) return;
        if (d?.ok === true && typeof d.iocFull === "string" && d.iocFull.length > 0) {
          try {
            sessionStorage.setItem(IOC_FULL_KEY, d.iocFull);
            sessionStorage.removeItem(IOC_PRE_CHECKOUT_KEY);
          } catch {
            /* ignore */
          }
          setIocFull(d.iocFull);
          setIocFree("");
          setUnlocked(true);
          setArchetype(typeof d.archetype === "string" ? d.archetype : "");
        } else {
          applyPreCheckoutFromStorage();
        }
      })
      .catch(() => {
        if (!cancelled) applyPreCheckoutFromStorage();
      })
      .finally(() => {
        if (cancelled) return;
        setVerifying(false);
        queueMicrotask(() => {
          router.replace("/ioc", { scroll: false });
        });
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutSessionId, router, applyPreCheckoutFromStorage]);

  const generate = useCallback(async () => {
    setLoading(true);
    setUnlocked(false);
    setIocFull("");
    try {
      try {
        sessionStorage.removeItem(IOC_FULL_KEY);
        sessionStorage.removeItem(IOC_PRE_CHECKOUT_KEY);
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/ioc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthdate }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.iocFree && typeof data.iocFree === "string") {
        setIocFree(data.iocFree);
        setArchetype(typeof data.archetype === "string" ? data.archetype : "");
      } else {
        setIocFree("");
        setArchetype("");
      }
    } finally {
      setLoading(false);
    }
  }, [birthdate]);

  const copy = useCallback(() => {
    if (!clipboardText || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(clipboardText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [clipboardText]);

  const unlock = useCallback(async () => {
    if (!archetype) return;
    setUnlocking(true);
    try {
      try {
        sessionStorage.setItem(
          IOC_PRE_CHECKOUT_KEY,
          JSON.stringify({ birthdate, iocFree, archetype })
        );
      } catch {
        /* ignore */
      }
      const res = await fetch("/api/ioc/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archetype }),
      });
      const json = await res.json().catch(() => ({}));
      const url = json?.data?.url;
      if (typeof url === "string" && url.length > 0) {
        window.location.href = url;
      }
    } finally {
      setUnlocking(false);
    }
  }, [archetype, birthdate, iocFree]);

  const showBlock = (unlocked && iocFull) || (!unlocked && iocFree);
  const isPaidDelivery = Boolean(unlocked && iocFull);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "clamp(2rem, 9vh, 5rem) 1.25rem 3rem",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "26rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <header style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#888",
              margin: isPaidDelivery ? "0 0 0.75rem" : "0 0 0.35rem",
              fontWeight: 500,
            }}
          >
            LIGS / IOC
          </p>
          {!isPaidDelivery ? (
            <h1
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                lineHeight: 1.35,
                margin: "0 0 0.75rem",
                letterSpacing: "-0.02em",
              }}
            >
              Initial Operating Conditions
            </h1>
          ) : null}
          {!isPaidDelivery ? (
            <p
              style={{
                fontSize: "0.8125rem",
                lineHeight: 1.55,
                color: "#b3b3b3",
                margin: "0 0 0.75rem",
                fontWeight: 400,
              }}
            >
              Stop using generic AI. Use yours.
            </p>
          ) : null}
          {!isPaidDelivery ? (
            <p
              style={{
                fontSize: "0.8125rem",
                lineHeight: 1.55,
                color: "#b3b3b3",
                margin: 0,
                fontWeight: 400,
              }}
            >
              Enter your birthdate. Generate. Copy. Paste this into your AI chat. Then continue normally.
            </p>
          ) : null}
        </header>

        {!isPaidDelivery ? (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.625rem",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                style={{
                  background: "#111",
                  color: "#fff",
                  border: "1px solid #3a3a3a",
                  padding: "0.55rem 0.75rem",
                  fontFamily: "inherit",
                  fontSize: "0.8125rem",
                  borderRadius: "2px",
                }}
              />
              <button
                type="button"
                onClick={generate}
                disabled={loading || verifying}
                style={{
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  padding: "0.55rem 1rem",
                  fontFamily: "inherit",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: loading || verifying ? "wait" : "pointer",
                  borderRadius: "2px",
                }}
              >
                Generate IOC
              </button>
            </div>

            <p
              style={{
                fontSize: "0.6875rem",
                color: "#666",
                margin: "0.5rem 0 0.25rem",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              Initial conditions matter.
            </p>
            <p
              style={{
                fontSize: "0.6875rem",
                color: "#666",
                margin: 0,
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              Used once. Not stored.
            </p>
          </>
        ) : null}

        {showBlock ? (
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              marginTop: isPaidDelivery ? 0 : "0.25rem",
              paddingTop: isPaidDelivery ? 0 : "0.75rem",
              borderTop: isPaidDelivery ? "none" : "1px solid #262626",
            }}
          >
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: "0.6875rem",
                lineHeight: 1.55,
                margin: 0,
                padding: "1rem 1.1rem",
                border: "1px solid #333",
                background: "#0d0d0d",
                borderRadius: "4px",
                color: "#e8e8e8",
              }}
            >
              {clipboardText}
            </pre>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem",
                margin: 0,
                padding: 0,
              }}
            >
              <button
                type="button"
                onClick={copy}
                style={{
                  margin: 0,
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid #666",
                  padding: "0.5rem 1rem",
                  fontFamily: "inherit",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  borderRadius: "2px",
                }}
              >
                Copy
              </button>
              {copied ? (
                <span style={{ fontSize: "0.75rem", color: "#888", margin: 0 }}>Copied</span>
              ) : null}
            </div>
            <p style={{ fontSize: "0.75rem", color: "#999", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
              Paste into your AI chat window, then keep talking.
            </p>
            {!unlocked ? (
              <>
                <p style={{ fontSize: "0.8125rem", color: "#ccc", margin: "0 0 0.35rem", fontWeight: 500 }}>
                  Unlock full control
                </p>
                <button
                  type="button"
                  onClick={unlock}
                  disabled={unlocking || !archetype}
                  style={{
                    margin: 0,
                    alignSelf: "flex-start",
                    background: "#fff",
                    color: "#000",
                    border: "none",
                    padding: "0.5rem 1rem",
                    fontFamily: "inherit",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: unlocking || !archetype ? "not-allowed" : "pointer",
                    borderRadius: "2px",
                    opacity: !archetype ? 0.5 : 1,
                  }}
                >
                  Unlock
                </button>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
      <p
        aria-hidden
        style={{
          position: "fixed",
          right: "0.75rem",
          bottom: "0.75rem",
          margin: 0,
          fontSize: "0.625rem",
          color: "#888",
          opacity: 0.28,
          lineHeight: 1.2,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        ioc-spec ✓
      </p>
    </main>
  );
}

export default function IocPage() {
  return (
    <Suspense fallback={null}>
      <IocPageInner />
    </Suspense>
  );
}
