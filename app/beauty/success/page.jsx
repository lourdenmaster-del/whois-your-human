"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import FlowNav from "@/components/FlowNav";
import { track } from "@/lib/analytics";
import { setBeautyUnlocked } from "@/lib/landing-storage";

function BeautySuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("loading"); // loading | paid | error
  const [reportId, setReportId] = useState(null);
  const [prePurchase, setPrePurchase] = useState(false);
  const [entitlementToken, setEntitlementToken] = useState(null);
  const [tokenPollExhausted, setTokenPollExhausted] = useState(false);
  const [apiOrigin, setApiOrigin] = useState("");
  const pollCountRef = useRef(0);
  const handoffBlock = (
    <div className="mb-6 rounded border border-[#2a2a2e] bg-[#0a0a0b] p-4">
      <p
        className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em]"
        style={{ color: "#58d68d" }}
      >
        YOU NOW HAVE WHOIS AGENT ACCESS
      </p>
      <ul className="mb-3 space-y-1 text-sm" style={{ color: "#c8c8cc" }}>
        <li>- Your WHOIS record</li>
        <li>- Your agent calibration record (API)</li>
        <li>- Your access token for AI systems</li>
      </ul>
      <p className="text-sm" style={{ color: "#9a9aa0" }}>
        Use this to allow AI tools to adapt how they interact with you.
      </p>
    </div>
  );

  useEffect(() => {
    setApiOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    track("beauty_success_page");
    if (!sessionId) {
      queueMicrotask(() => setStatus("error"));
      return;
    }
    let cancelled = false;
    fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const data = json?.data ?? json;
        if (data?.paid === true) {
          setBeautyUnlocked();
          setReportId(data.reportId || null);
          setPrePurchase(data.prePurchase === true);
          if (data.entitlementToken) {
            setEntitlementToken(data.entitlementToken);
          }
          if (typeof data.executionKey === "string" && data.executionKey) {
            try {
              sessionStorage.setItem("ligs_execution_key", data.executionKey);
            } catch {
              /* ignore quota / private mode */
            }
          }
          setStatus("paid");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (
      status !== "paid" ||
      !sessionId ||
      prePurchase ||
      !reportId ||
      entitlementToken
    ) {
      return;
    }
    pollCountRef.current = 0;
    setTokenPollExhausted(false);
    const id = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const res = await fetch(
          `/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
        );
        const json = await res.json();
        const data = json?.data ?? json;
        if (data?.entitlementToken) {
          setEntitlementToken(data.entitlementToken);
          clearInterval(id);
          return;
        }
      } catch {
        /* ignore */
      }
      if (pollCountRef.current >= 3) {
        setTokenPollExhausted(true);
        clearInterval(id);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [status, sessionId, reportId, prePurchase, entitlementToken]);

  if (!sessionId || status === "loading" || status === "error") {
    const isError = status === "error" || !sessionId;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
        <div className="w-full max-w-2xl min-w-0">
          <div
            className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            {isError ? (
              <>
                <p
                  className="text-base mb-6"
                  style={{
                    color: "#e8e8ec",
                    fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                  }}
                >
                  {!sessionId
                    ? "Missing checkout session."
                    : "Payment verification failed."}
                </p>
                <Link
                  href="/origin"
                  className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#5a5a62] touch-manipulation"
                  style={{ color: "#c8c8cc" }}
                >
                  Back to Origin
                </Link>
              </>
            ) : (
              <p
                className="text-sm"
                style={{
                  color: "#9a9aa0",
                  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                }}
              >
                Verifying payment…
              </p>
            )}
          </div>
          <p
            className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            LIGS
          </p>
        </div>
      </div>
    );
  }

  if (prePurchase || !reportId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
        <div className="w-full max-w-2xl min-w-0">
          <div
            className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-wide mb-4"
              style={{
                color: "#e8e8ec",
                fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
              }}
            >
              You&apos;re Unlocked
            </h1>
            <div className="mb-6 rounded border border-[#2a2a2e] bg-[#0a0a0b] p-4">
              <p
                className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em]"
                style={{ color: "#58d68d" }}
              >
                NEXT: CREATE YOUR WHOIS RECORD
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#9a9aa0" }}>
                Enter your birth details to create your WHOIS record. You&apos;ll receive your agent calibration record and API token after creation.
              </p>
            </div>
            <Link
              href="/beauty/start"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#5a5a62] touch-manipulation"
              style={{ color: "#c8c8cc" }}
            >
              Create your WHOIS record
            </Link>
          </div>
          <p
            className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            LIGS
          </p>
        </div>
      </div>
    );
  }

  if (entitlementToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
        <div className="w-full max-w-2xl min-w-0">
          <div
            className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-wide mb-4"
              style={{
                color: "#e8e8ec",
                fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
              }}
            >
              WHOIS Agent Access active
            </h1>
            {handoffBlock}
            <p className="text-sm mb-4" style={{ color: "#9a9aa0" }}>
              Save these values securely. The entitlement token is secret — anyone
              with it can call the agent calibration API for this report.
            </p>
            <p className="text-xs mb-2" style={{ color: "#8a8a90" }}>
              Also save your <strong style={{ color: "#c8c8cc" }}>session_id</strong> below.
              If you lose the token, you can get it back by calling verify-session with that id
              (see example at the bottom).
            </p>
            <div className="space-y-3 mb-6">
              <p
                className="text-[11px] uppercase tracking-wider"
                style={{ color: "#8a8a90" }}
              >
                session_id (recover token anytime)
              </p>
              <pre
                className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all"
                style={{
                  color: "#e8e8ec",
                  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                }}
              >
                {sessionId}
              </pre>
              <p
                className="text-[11px] uppercase tracking-wider mt-4"
                style={{ color: "#8a8a90" }}
              >
                reportId
              </p>
              <pre
                className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all"
                style={{
                  color: "#e8e8ec",
                  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                }}
              >
                {reportId}
              </pre>
              <p
                className="text-[11px] uppercase tracking-wider mt-4"
                style={{ color: "#8a8a90" }}
              >
                entitlementToken
              </p>
              <pre
                className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all"
                style={{
                  color: "#e8e8ec",
                  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                }}
              >
                {entitlementToken}
              </pre>
            </div>
            <p
              className="text-[11px] uppercase tracking-wider mb-2"
              style={{ color: "#8a8a90" }}
            >
              Example request
            </p>
            <pre
              className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap"
              style={{
                color: "#c8c8cc",
                fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
              }}
            >
              {`GET /api/agent/whois?reportId=${reportId}
Authorization: Bearer ${entitlementToken}`}
            </pre>
            <p
              className="text-[11px] uppercase tracking-wider mt-6 mb-2"
              style={{ color: "#8a8a90" }}
            >
              Re-fetch entitlement token (same session)
            </p>
            <pre
              className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all mb-2"
              style={{
                color: "#c8c8cc",
                fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
              }}
            >
              {apiOrigin
                ? `GET ${apiOrigin}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
                : `GET /api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`}
            </pre>
            <p className="text-xs mb-6" style={{ color: "#7a7a80" }}>
              Response JSON includes <code className="text-[#9a9aa0]">entitlementToken</code> when
              payment is complete and the webhook has registered access (field may be inside{" "}
              <code className="text-[#9a9aa0]">data</code>).
            </p>
            <p className="mt-2 text-xs" style={{ color: "#7a7a80" }}>
              Store the token in a password manager or secure vault. Do not commit
              it to source control or share it in public channels.
            </p>
            <Link
              href={`/beauty/view?reportId=${encodeURIComponent(reportId)}`}
              className="inline-flex mt-8 items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors"
              style={{ color: "#c8c8cc" }}
            >
              View your WHOIS record
            </Link>
            <FlowNav variant="dark" className="mt-8" />
          </div>
          <p
            className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
            style={{ fontFamily: "inherit", color: "#8a8a90" }}
          >
            LIGS
          </p>
        </div>
      </div>
    );
  }

  const viewUrl = `/beauty/view?reportId=${encodeURIComponent(reportId)}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
      <div className="w-full max-w-2xl min-w-0">
        <div
          className="origin-terminal rounded-lg border border-[#2a2a2e] bg-[#0d0d0f] shadow-xl overflow-hidden px-6 py-12 text-left"
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <h1
            className="text-xl sm:text-2xl font-semibold tracking-wide mb-4"
            style={{
              color: "#e8e8ec",
              fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
            }}
          >
            Payment received
          </h1>
          {handoffBlock}
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#9a9aa0" }}>
            {tokenPollExhausted
              ? "WHOIS Agent Access token is not available yet. Confirm Stripe delivered the webhook and your Beauty Profile exists for this report, then reload this page or use verify-session below."
              : "Waiting for WHOIS Agent Access token (webhook). This page will update automatically…"}
          </p>
          <p
            className="text-[11px] uppercase tracking-wider mb-2"
            style={{ color: "#8a8a90" }}
          >
            session_id — copy and keep (recover token anytime)
          </p>
          <pre
            className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all mb-4"
            style={{
              color: "#e8e8ec",
              fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
            }}
          >
            {sessionId}
          </pre>
          <p
            className="text-[11px] uppercase tracking-wider mb-2"
            style={{ color: "#8a8a90" }}
          >
            Re-fetch token (browser or curl)
          </p>
          <pre
            className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all mb-4"
            style={{
              color: "#c8c8cc",
              fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
            }}
          >
            {apiOrigin
              ? `GET ${apiOrigin}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
              : `GET /api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`}
          </pre>
          <p className="text-xs mb-4" style={{ color: "#7a7a80" }}>
            After <code className="text-[#9a9aa0]">entitlementToken</code> appears in the response,
            call <code className="text-[#9a9aa0]">GET /api/agent/whois?reportId=…</code> with{" "}
            <code className="text-[#9a9aa0]">Authorization: Bearer &lt;token&gt;</code>.
          </p>
          <p className="text-xs mb-6 font-mono" style={{ color: "#8a8a90" }}>
            reportId: {reportId}
          </p>
          <Link
            href={viewUrl}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors"
            style={{ color: "#c8c8cc" }}
          >
            View your WHOIS record
          </Link>
          <FlowNav variant="dark" className="mt-8" />
        </div>
        <p
          className="mt-4 pt-3 text-left text-[10px] uppercase tracking-widest font-mono border-t border-[#2a2a2e]/80"
          style={{ fontFamily: "inherit", color: "#8a8a90" }}
        >
          LIGS
        </p>
      </div>
    </div>
  );
}

export default function BeautySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#0a0a0b]">
          <p className="text-sm font-mono" style={{ color: "#9a9aa0" }}>
            Loading…
          </p>
        </div>
      }
    >
      <BeautySuccessContent />
    </Suspense>
  );
}
