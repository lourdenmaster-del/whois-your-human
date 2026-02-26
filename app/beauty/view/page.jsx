import { Suspense } from "react";
import { headers } from "next/headers";
import LigsFooter from "@/components/LigsFooter";
import BeautyViewClient from "./BeautyViewClient";
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
  log("info", "ssr_metadata", { route: "/beauty/view", requestId, timestamp: new Date().toISOString() });

  let profile = null;
  let origin = null;
  let reportId = null;

  try {
    const resolved = typeof searchParams?.then === "function" ? await searchParams : searchParams;
    reportId = resolved?.reportId != null
      ? (Array.isArray(resolved.reportId) ? resolved.reportId[0] : resolved.reportId)
      : null;

    if (!reportId) {
      return { title: "Light Identity Report" };
    }

    origin = await getOrigin();
    if (!origin) {
      return { title: "Light Identity Report" };
    }

    const res = await fetch(`${origin}/api/beauty/${encodeURIComponent(reportId)}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (json?.status === "ok" && json.data) {
      profile = json.data;
    }
  } catch {
    return { title: "Light Identity Report" };
  }

  if (!profile) {
    return { title: "Light Identity Report" };
  }

  const title = profile.subjectName ?? "Light Identity Report";
  const description = profile.emotionalSnippet ?? "Your Light Identity Report";
  const firstImage = profile.imageUrls?.[0];
  const absoluteImage = firstImage?.startsWith("http")
    ? firstImage
    : firstImage
      ? `${origin}${firstImage.startsWith("/") ? "" : "/"}${firstImage}`
      : undefined;
  const ogImages = absoluteImage ? [{ url: absoluteImage }] : undefined;
  const url = `/beauty/view?reportId=${encodeURIComponent(reportId)}`;

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

export default function BeautyViewPage() {
  return (
    <>
      <Suspense fallback={
        <main className="beauty-theme beauty-page min-h-screen font-sans relative flex flex-col items-center justify-center px-6 py-24" style={{ background: "var(--beauty-cream, #fdf8f5)" }}>
          <p className="beauty-body beauty-text-muted">Loading…</p>
        </main>
      }>
        <BeautyViewClient />
      </Suspense>
      <LigsFooter />
    </>
  );
}
