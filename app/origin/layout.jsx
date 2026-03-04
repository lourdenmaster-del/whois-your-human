import { IGNIS_LANDING_URL } from "@/lib/exemplar-store";

export const metadata = {
  title: "(L)igs — The physics of you.",
  description: "A new scientific framework exploring how physical forces present at birth shape identity. LIGS reveals the pattern. The Light Identity Report interprets it.",
  openGraph: {
    title: "(L)igs — The physics of you.",
    description: "A new scientific framework exploring how physical forces present at birth shape identity. LIGS reveals the pattern. The Light Identity Report interprets it.",
    images: [{ url: IGNIS_LANDING_URL }],
  },
  twitter: {
    card: "summary_large_image",
    title: "(L)igs — The physics of you.",
    description: "A new scientific framework exploring how physical forces present at birth shape identity. LIGS reveals the pattern. The Light Identity Report interprets it.",
  },
};

// Use system serif to avoid font fetch failures (Google Fonts can fail in offline/sandbox)
const ORIGIN_SERIF = "Georgia, 'Times New Roman', Times, serif";

export default function OriginLayout({ children }) {
  return (
    <div
      className="beauty-theme relative min-h-screen"
      style={{
        color: "var(--text-on-dark)",
        fontFamily: ORIGIN_SERIF,
        "--font-beauty-serif": ORIGIN_SERIF,
        background: "transparent",
      }}
    >
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
