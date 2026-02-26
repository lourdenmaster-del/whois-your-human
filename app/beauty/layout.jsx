export const metadata = {
  title: "Beauty",
  description: "Your Beauty Signature begins here. Beauty is coherent aliveness.",
};

// Use system serif to avoid font fetch failures (Google Fonts can fail in offline/sandbox)
const BEAUTY_SERIF = "Georgia, 'Times New Roman', Times, serif";

export default function BeautyLayout({ children }) {
  return (
    <div
      className="beauty-theme relative min-h-screen"
      style={{
        color: "var(--beauty-text, #0d0b10)",
        fontFamily: BEAUTY_SERIF,
        "--font-beauty-serif": BEAUTY_SERIF,
        background: "transparent",
      }}
    >
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
