"use client";

// CANONICAL WHOIS FLOW
// This file is part of the active WHOIS human→agent system.
// Do not introduce beauty-named dependencies here.
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import FlowNav from "@/components/FlowNav";
import { track } from "@/lib/analytics";
import { setWhoisUnlocked } from "@/lib/landing-storage";

function WhoisSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("loading");
  const [reportId, setReportId] = useState(null);
  const [prePurchase, setPrePurchase] = useState(false);
  const [entitlementToken, setEntitlementToken] = useState(null);
  const [sessionMissingReportId, setSessionMissingReportId] = useState(false);
  const [tokenPollExhausted, setTokenPollExhausted] = useState(false);
  const [apiOrigin, setApiOrigin] = useState("");
  const pollCountRef = useRef(0);
  const handoffBlock = (
    <div className="mb-6 rounded border border-[#2a2a2e] bg-[#0a0a0b] p-4">
      <p
        className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em]"
        style={{ color: "#58d68d" }}
      >
        PAYMENT COMPLETE — AGENT SURFACE ACTIVE
      </p>
      <ul className="mb-3 space-y-1 text-sm" style={{ color: "#c8c8cc" }}>
        <li>- Registry record (machine-readable)</li>
        <li>- Agent calibration record (API)</li>
        <li>- Token for AI systems</li>
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
    track("whois_success_page");
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
          if (data?.error === "SESSION_MISSING_REPORT_ID") {
            setSessionMissingReportId(true);
            setStatus("paid");
            return;
          }
          setWhoisUnlocked();
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

  if (sessionMissingReportId) {
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
              Payment completed — record link missing
            </h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#9a9aa0" }}>
              Payment completed, but the registry record link is missing. Save your session_id below and contact support.
            </p>
            <p
              className="text-[11px] uppercase tracking-wider mb-2"
              style={{ color: "#8a8a90" }}
            >
              session_id (save for support)
            </p>
            <pre
              className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all mb-6"
              style={{
                color: "#e8e8ec",
                fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
              }}
            >
              {sessionId}
            </pre>
            <Link
              href="/origin"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#5a5a62] touch-manipulation"
              style={{ color: "#c8c8cc" }}
            >
              Back to Origin
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

  // Legacy prePurchase only: old pre-purchase sessions. Canonical flow always has reportId. Do not show "create record" for paid sessions missing reportId — that case is handled above (sessionMissingReportId).
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
              Payment complete
            </h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#9a9aa0" }}>
              Your payment was received. This was a pre-payment — return to Origin to complete the intake form and generate your registry record.
            </p>
            <Link
              href="/origin"
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors focus:outline-none focus:border-[#5a5a62] touch-manipulation"
              style={{ color: "#c8c8cc" }}
            >
              Return to Origin
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
              Registry record active
            </h1>
            {handoffBlock}
            <div className="mb-6 rounded border border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="font-medium text-sm" style={{ color: "#58d68d" }}>
                Copy your Report ID and Token. You will use these with your AI.
              </p>
              <p className="mt-1 text-xs" style={{ color: "#9a9aa0" }}>
                Save them before leaving this page. Select and copy each value below.
              </p>
            </div>
            <p className="text-sm mb-4" style={{ color: "#9a9aa0" }}>
              Save these values securely. The Token is secret — anyone with it can
              call the agent calibration API for this report.
            </p>
            <div className="space-y-3 mb-6">
              <p
                className="text-[11px] uppercase tracking-wider"
                style={{ color: "#8a8a90" }}
              >
                Report ID
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
                Token
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
            <p className="mt-2 text-xs mb-6" style={{ color: "#7a7a80" }}>
              Store the Token in a password manager or secure vault. Do not commit
              it to source control or share it in public channels.
            </p>
            <details className="mt-4 rounded border border-[#2a2a2e]/60 bg-[#0a0a0b]/50 p-3">
              <summary className="text-[11px] uppercase tracking-wider cursor-pointer" style={{ color: "#6a6a70" }}>
                Recover Token if lost (session_id)
              </summary>
              <p className="text-xs mt-2 mb-2" style={{ color: "#7a7a80" }}>
                If you lose the Token, save your session_id below and call verify-session.
                Response JSON includes <code className="text-[#9a9aa0]">entitlementToken</code> in <code className="text-[#9a9aa0]">data</code>.
              </p>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#6a6a70" }}>
                session_id
              </p>
              <pre
                className="text-[11px] p-2 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all"
                style={{
                  color: "#9a9aa0",
                  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                }}
              >
                {sessionId}
              </pre>
              <pre
                className="text-[11px] mt-2 p-2 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all"
                style={{
                  color: "#9a9aa0",
                  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                }}
              >
                {apiOrigin
                  ? `GET ${apiOrigin}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
                  : `GET /api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`}
              </pre>
            </details>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/whois/view?reportId=${encodeURIComponent(reportId)}`}
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors"
                style={{ color: "#c8c8cc" }}
              >
                View your report
              </Link>
              <Link
                href={`/for-agents?reportId=${encodeURIComponent(reportId)}`}
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-emerald-500/50 font-mono text-[11px] font-medium hover:border-emerald-500 hover:text-[#e8e8ec] transition-colors"
                style={{ color: "#58d68d" }}
              >
                Use with AI
              </Link>
            </div>
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

  const viewUrl = `/whois/view?reportId=${encodeURIComponent(reportId)}`;

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
            Payment complete
          </h1>
          {handoffBlock}
          <div className="mb-6 rounded border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-medium text-sm" style={{ color: "#fbbf24" }}>
              Copy your Report ID now. You will use it with your AI.
            </p>
            <p className="mt-1 text-xs" style={{ color: "#9a9aa0" }}>
              Token will appear below when ready. Do not leave before copying both.
            </p>
          </div>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#9a9aa0" }}>
            {tokenPollExhausted
              ? "Token not yet available. Confirm webhook delivered and registry record exists for this Report ID, then reload or use verify-session below."
              : "Waiting for Token (webhook). This page will update automatically…"}
          </p>
          <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: "#8a8a90" }}>
            Report ID — copy now
          </p>
          <pre
            className="text-xs p-3 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all mb-4"
            style={{
              color: "#e8e8ec",
              fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
            }}
          >
            {reportId}
          </pre>
          <details className="mb-6 rounded border border-[#2a2a2e]/60 bg-[#0a0a0b]/50 p-3">
            <summary className="text-[11px] uppercase tracking-wider cursor-pointer" style={{ color: "#6a6a70" }}>
              Token not here yet? Recover via session_id
            </summary>
            <p className="text-xs mt-2 mb-2" style={{ color: "#7a7a80" }}>
              Save session_id below. Call verify-session; when <code className="text-[#9a9aa0]">entitlementToken</code> appears in the response, use it with Report ID.
            </p>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#6a6a70" }}>session_id</p>
            <pre
              className="text-[11px] p-2 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all mb-2"
              style={{ color: "#9a9aa0", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
            >
              {sessionId}
            </pre>
            <pre
              className="text-[11px] p-2 rounded border border-[#2a2a2e] overflow-x-auto whitespace-pre-wrap break-all"
              style={{ color: "#9a9aa0", fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace" }}
            >
              {apiOrigin
                ? `GET ${apiOrigin}/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`
                : `GET /api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`}
            </pre>
          </details>
          <div className="flex flex-wrap gap-3">
            <Link
              href={viewUrl}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-[#2a2a2e] font-mono text-[11px] font-medium hover:border-[#5a5a62] hover:text-[#e8e8ec] transition-colors"
              style={{ color: "#c8c8cc" }}
            >
              View your report
            </Link>
            <Link
              href={`/for-agents?reportId=${encodeURIComponent(reportId)}`}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded border border-emerald-500/50 font-mono text-[11px] font-medium hover:border-emerald-500 hover:text-[#e8e8ec] transition-colors"
              style={{ color: "#58d68d" }}
            >
              Use with AI
            </Link>
          </div>
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

export default function WhoisSuccessPage() {
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
      <WhoisSuccessContent />
    </Suspense>
  );
}
