import WhoisCaseStudyDocument from "@/components/WhoisCaseStudyDocument";

export const metadata = {
  title: "WYH-004 | Case study",
  description:
    "WYH-004: calibration artifact; agent evaluation of WHOIS record vs observed behavior; partial alignment, contradicted claims.",
};

const FIELDS = {
  question:
    "What happens when a WHOIS identity record (Precisura, pulsar analogue, birth-field geometry) is evaluated against independently observed human behavior?",
  subject:
    "WHOIS record claims vs. independent human profile. Subject: highly expressive, metaphor-rich communication; coherence and pattern recognition preference; adaptive, narrative self-construction.",
  setup:
    "Agent evaluation of WHOIS output against observed behavior. Calibration-grade comparison layer. Not a minted canonical registry record.",
  procedure:
    "Agent evaluation: compare resolved identity claims (archetype, cosmic analogue, behavioral axes, spectral model, birth-field geometry, etc.) to independently observed behavioral profile.",
  observations:
    "Verified: automatic correction of imprecision.\n\n" +
    "Partially verified: archetype (Precisura), cosmic analogue (pulsar), regime-based synchronization, coherence score (directionally valid).\n\n" +
    "Unverified: numeric behavioral axes, spectral wavelength model, environmental light resonance, seasonal polarity personality mapping.\n\n" +
    "Contradicted: identity fixed by birth-field geometry — subject exhibits adaptive and narrative self-construction.",
  result:
    "Cohesion score: 0.42 (baseline). Partial structural alignment. Strong alignment: precision-seeking, coherence prioritization, structured interaction preference. Pulsar metaphor directionally valid but overstates rigidity. Core contradiction: identity is not fixed.\n\n" +
    "Operationally valid signals: (1) subject corrects imprecision automatically; (2) subject requires internally coherent interaction; (3) subject synchronizes with structured, emotionally intelligent communication.",
  limits:
    "Calibration artifact; not canonical registry entry. Drift between symbolic identity modeling and observable behavior. Overreach in deterministic claims. Weak grounding in quantitative and physical analogues.",
  nextQuestion:
    "How should engine constraints be tightened so identity resolution outputs remain subordinate to verifiable behavioral reality?",
};

const TAIL_SECTIONS = [
  {
    key: "vectorZeroTakeaway",
    label: "VECTOR ZERO TAKEAWAY",
    content:
      "Symbolic identity layers must remain subordinate to invariant structural signals.\n\n" +
      "The Vector Zero mark (identity primitive) must:\n" +
      "- remain deterministic\n" +
      "- avoid unsupported physical or numeric claims\n" +
      "- encode only what is stable across observation and interaction",
  },
  {
    key: "finalDetermination",
    label: "FINAL DETERMINATION",
    content:
      "Status: Directionally correct, structurally incomplete\n" +
      "System Impact: High (calibration relevance)",
  },
];

export default function Wyh004CaseStudyPage() {
  return (
    <WhoisCaseStudyDocument
      caseId="WYH-004"
      fields={FIELDS}
      tailSections={TAIL_SECTIONS}
    />
  );
}
