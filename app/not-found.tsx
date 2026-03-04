import Link from "next/link";

/**
 * 404 — offer link to landing.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0A0F1C] text-white">
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-white/70 text-sm mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/origin"
        className="px-6 py-2 bg-[#7A4FFF] text-white rounded-lg hover:bg-[#8b5fff] transition-colors"
      >
        Go to home
      </Link>
    </div>
  );
}
