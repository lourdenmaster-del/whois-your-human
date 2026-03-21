import { Suspense } from "react";
import { headers } from "next/headers";
import BeautyViewClient from "@/app/beauty/view/BeautyViewClient";
import { log } from "@/lib/log";

async function getOrigin() {
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // ignore
  }
  return null;
}

export async function generateMetadata({ searchParams }) {
  let requestId = "no-request-id";
  try {
    const h = await headers();
    requestId = h.get("x-request-id") ?? h.get("x-vercel-id") ?? requestId;
  } catch {
    // ignore
  }
  log("info", "ssr_metadata", { route: "/whois/view", requestId, timestamp: new Date().toISOString() });

  let profile = null;
  let origin = null;
  let reportId = null;

  try {
    const resolved = typeof searchParams?.then === "function" ? await searchParams : searchParams;
    reportId = resolved?.reportId != null
      ? (Array.isArray(resolved.reportId) ? resolved.reportId[0] : resolved.reportId)
      : null;

    if (!reportId) {
      return { title: "WHOIS record" };
    }

    origin = await getOrigin();
    if (!origin) {
      return { title: "WHOIS record" };
    }

    const res = await fetch(`${origin}/api/beauty/${encodeURIComponent(reportId)}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (json?.status === "ok" && json.data) {
      profile = json.data;
    }
  } catch {
    return { title: "WHOIS record" };
  }

  if (!profile) {
    return { title: "WHOIS record" };
  }

  const title = profile.subjectName ?? "WHOIS record";
  const description = profile.emotionalSnippet ?? "Your WHOIS record";
  const firstImage = profile.imageUrls?.[0];
  const absoluteImage = firstImage?.startsWith("http")
    ? firstImage
    : firstImage
      ? `${origin}${firstImage.startsWith("/") ? "" : "/"}${firstImage}`
      : undefined;
  const ogImages = absoluteImage ? [{ url: absoluteImage }] : undefined;
  const url = `/whois/view?reportId=${encodeURIComponent(reportId)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImages && { images: ogImages }),
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImages && { images: ogImages }),
    },
  };
}

export default function WhoisViewPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center p-4 sm:p-6 overflow-x-hidden whois-origin font-mono"
      style={{
        background: "#000",
        color: "rgba(154,154,160,0.9)",
        fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace",
      }}
    >
      <div className="flex-1 flex flex-col justify-center w-full max-w-[min(100vw-2rem,1000px)] min-w-0">
        <Suspense fallback={
          <p className="text-[13px]" style={{ color: "rgba(154,154,160,0.9)" }}>
            Loading registry record…
          </p>
        }>
          <BeautyViewClient />
        </Suspense>
      </div>
    </div>
  );
}
