export const metadata = {
  title: "WHOIS YOUR HUMAN | Agent identity layer",
  description:
    "Machine-readable identity layer for AI—structure, patterns, and decision style. Register, unlock, GET /api/agent/whois.",
};

export default function WhoisYourHumanLayout({ children }) {
  return (
    <div className="beauty-theme relative min-h-screen" style={{ background: "#050508" }}>
      {children}
    </div>
  );
}
