"use client";

import { useState } from "react";
import { setBeautyUnlocked } from "@/lib/landing-storage";
import { FAKE_PAY } from "@/lib/dry-run-config";
import { useApiStatus } from "@/hooks/useApiStatus";

interface BirthData {
  fullName: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  email: string;
}

interface DryRunResult {
  reportId?: string;
  beautyProfile?: {
    report: string;
    image: string;
    emotionalSnippet?: string;
    imageryPrompts?: string[];
  };
  checkout?: {
    url: string;
  };
}

interface PayUnlockProps {
  birthData: BirthData;
}

export default function PayUnlockButton({ birthData }: PayUnlockProps) {
  const { disabled: apiDisabled } = useApiStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [profile, setProfile] = useState<DryRunResult["beautyProfile"] | null>(null);
  const [reportId, setReportId] = useState<string | undefined>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePreview = async () => {
    if (apiDisabled) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/beauty/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthData: {
            fullName: birthData.fullName,
            birthDate: birthData.birthDate,
            birthTime: birthData.birthTime ?? "",
            birthLocation: birthData.birthLocation,
            email: birthData.email,
          },
          dryRun: true,
        }),
      });

      const json = (await res.json()) as {
        status?: string;
        data?: DryRunResult;
        error?: string;
      };

      if (!res.ok) {
        setError(json?.error ?? "Simulation failed. Try again.");
        setLoading(false);
        return;
      }

      const dr = json?.data ?? (json as unknown as DryRunResult);
      const rid = dr.reportId;
      if (!rid) {
        setError("Simulation failed: no report ID.");
        setLoading(false);
        return;
      }

      let nextProfile = dr.beautyProfile ?? null;
      if (
        !nextProfile?.report ||
        (!nextProfile?.image && !nextProfile?.imageryPrompts?.length)
      ) {
        const pr = await fetch(`/api/beauty/${encodeURIComponent(rid)}`);
        const pj = (await pr.json()) as {
          status?: string;
          data?: Record<string, unknown>;
          error?: string;
        };
        const pdata = (pj?.status === "ok" ? pj.data : pj) as Record<string, unknown> | undefined;
        if (!pr.ok || !pdata) {
          setError(
            pj?.error ??
              "Simulation saved server-side but preview could not be loaded. Confirm Blob is configured and retry."
          );
          setLoading(false);
          return;
        }
        const urls = (pdata.imageUrls as string[] | undefined) ?? [];
        const fullReport = (pdata.fullReport as string | undefined) ?? "";
        nextProfile = {
          report: fullReport,
          image: urls[0] ?? "",
          emotionalSnippet: pdata.emotionalSnippet as string | undefined,
          imageryPrompts: urls.length > 0 ? urls : undefined,
        };
      }

      if (!nextProfile.report || (!nextProfile.image && !nextProfile.imageryPrompts?.length)) {
        setError("Simulation failed: incomplete profile.");
        setLoading(false);
        return;
      }

      setProfile(nextProfile);
      setReportId(rid);
      setCurrentSlide(0);
      setPreviewOpen(true);
    } catch (err) {
      console.error("Error in preview", err);
      setError("Failed to generate preview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [redirecting, setRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleProceed = async () => {
    if (!reportId || apiDisabled) return;
    if (FAKE_PAY) {
      console.log("FAKE PAY MODE – no charge made");
      setBeautyUnlocked();
      window.location.href = "/whois/start";
      return;
    }
    setCheckoutError(null);
    setRedirecting(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      const json = (await res.json()) as {
        status?: string;
        data?: { url?: string };
        url?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (res.status === 404 || json?.code === "BEAUTY_PROFILE_NOT_FOUND") {
          setCheckoutError(
            "This report doesn't have the underlying profile used to generate the WHOIS record yet. Use the full flow at /beauty to generate one, then return here to unlock."
          );
        } else {
          setCheckoutError(json?.error ?? "Checkout unavailable. Try again later.");
        }
        setRedirecting(false);
        return;
      }
      const url = json?.data?.url ?? json?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
        return;
      }
      setCheckoutError("No checkout URL returned.");
    } catch (err) {
      setCheckoutError("Could not start checkout. Please try again.");
    } finally {
      setRedirecting(false);
    }
  };

  const slides =
    profile?.imageryPrompts?.length
      ? profile.imageryPrompts
      : profile?.image
        ? [profile.image]
        : [];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <>
      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={handlePreview}
          disabled={apiDisabled || loading}
          className="px-8 py-3.5 bg-[#FF3B3B] text-white text-sm font-semibold transition-all duration-300 hover:bg-[#ff5252] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderRadius: 0 }}
        >
          {apiDisabled ? "Unavailable" : loading ? "Generating Preview…" : "Preview & Pay to Unlock"}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>

      {previewOpen && slides.length > 0 && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
        >
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 space-y-4 relative shadow-xl">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 p-1"
              aria-label="Close preview"
            >
              ✕
            </button>

            <h2 id="preview-title" className="text-xl font-semibold text-center text-gray-900">
              Your WHOIS record preview
            </h2>

            {profile?.emotionalSnippet && (
              <p className="text-gray-700 italic text-center">
                &ldquo;{profile.emotionalSnippet}&rdquo;
              </p>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={prevSlide}
                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-700"
                aria-label="Previous slide"
              >
                ‹
              </button>
              <img
                src={slides[currentSlide]}
                alt={`Beauty Preview ${currentSlide + 1}`}
                className="rounded-xl max-h-80 object-contain bg-gray-100"
              />
              <button
                onClick={nextSlide}
                className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-700"
                aria-label="Next slide"
              >
                ›
              </button>
            </div>
            <p className="text-center text-sm text-gray-500">
              Slide {currentSlide + 1} of {slides.length}
            </p>

            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (profile?.report) {
                    navigator.clipboard.writeText(profile.report);
                    alert("Report text copied to clipboard!");
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Copy Report
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!profile) return;
                  const dataStr =
                    "data:text/json;charset=utf-8," +
                    encodeURIComponent(JSON.stringify(profile, null, 2));
                  const dlAnchor = document.createElement("a");
                  dlAnchor.setAttribute("href", dataStr);
                  dlAnchor.setAttribute(
                    "download",
                    `beauty-profile-${reportId ?? "preview"}.json`
                  );
                  document.body.appendChild(dlAnchor);
                  dlAnchor.click();
                  dlAnchor.remove();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Download JSON
              </button>
            </div>

            {checkoutError && (
              <p className="text-red-600 text-sm font-normal" role="alert">
                {checkoutError}
              </p>
            )}
            <p className="text-xs text-gray-500 text-center">
              Stripe test mode — no real charges
            </p>
            <div className="flex flex-col items-center gap-1 w-full">
              <button
                onClick={handleProceed}
                disabled={apiDisabled || redirecting}
                className="w-full px-6 py-3.5 bg-[#7A4FFF] text-white text-sm font-semibold rounded-xl hover:bg-[#8b5fff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {apiDisabled ? "Unavailable" : redirecting ? "Redirecting…" : "Unlock WHOIS Agent Access"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                One-time · For this report only
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
