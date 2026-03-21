export const metadata = {
  title: "WHOIS record",
  description: "Your WHOIS record begins here. LIGS Human WHOIS Registry.",
};

const WHOIS_SERIF = "Georgia, 'Times New Roman', Times, serif";

export default function WhoisLayout({ children }) {
  return (
    <div
      className="beauty-theme relative min-h-screen"
      style={{
        color: "var(--beauty-text, #0d0b10)",
        fontFamily: WHOIS_SERIF,
        "--font-beauty-serif": WHOIS_SERIF,
        background: "transparent",
      }}
    >
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
