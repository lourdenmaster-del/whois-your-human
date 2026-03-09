export const metadata = {
  title: "Origin",
  description: "Your Light Signature begins here. LIGS reveals the pattern. The Light Identity Report interprets it.",
};

// Use system serif to avoid font fetch failures (Google Fonts can fail in offline/sandbox)
const ORIGIN_SERIF = "Georgia, 'Times New Roman', Times, serif";

export default function OriginLayout({ children }) {
  return (
    <div
      className="beauty-theme whois-origin relative min-h-screen"
      style={{
        color: "var(--text-on-dark)",
        fontFamily: ORIGIN_SERIF,
        "--font-beauty-serif": ORIGIN_SERIF,
        background: "#000",
      }}
    >
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
