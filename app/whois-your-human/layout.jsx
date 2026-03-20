export const metadata = {
  title: "WHOIS YOUR HUMAN | Agent-readable WHOIS record",
  description:
    "Agent-readable WHOIS record and agent calibration record (API)—hypothesis-style calibration for structure, patterns, and decision style. Early-stage; limited validation. Register, unlock, GET /api/agent/whois.",
};

export default function WhoisYourHumanLayout({ children }) {
  return (
    <div className="beauty-theme relative min-h-screen" style={{ background: "#050508" }}>
      {children}
    </div>
  );
}
