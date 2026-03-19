import WhoisCaseStudyDocument from "@/components/WhoisCaseStudyDocument";

export const metadata = {
  title: "WYH-001 | Case study",
  description:
    "WYH-001: static audit write-up (n=1, limited scope); observed session, not generalized.",
};

const FIELDS = {
  question:
    "What happens when a single user completes Origin intake, unlocks agent access, and points a generic assistant at the agent calibration record (JSON) without custom instructions?",
  subject:
    "One adult subject; birth data and email on file; consent for registry-backed calibration only.",
  setup:
    "Production-style agent calibration record (`whois-your-human/v1`); entitlement token issued post-pay; assistant with no prior thread history.",
  procedure:
    "1. Fetch agent calibration record via documented GET + Bearer.\n2. Inject a short system preamble (structure-first, two-option bias).\n3. Run three scripted prompts (explanation, decision, interpersonal).\n4. Log assistant responses verbatim (local).",
  observations:
    "Branching reduced after frame line; subject reported less “essay” tone when decision_support-shaped prompts were used. Archetype name surfaced once unless subject used it first. Observed in this run only.",
  result:
    "Session completed without contradiction of registry fields; no deterministic identity claims in assistant output when adherence to AGENT_RESPONSE_PATTERN-style rules was enforced manually. Observed effect, not yet generalized.",
  limits:
    "n=1; no blind scoring; assistant model/version not frozen in this document; clipboard and UI not instrumented here.",
  nextQuestion:
    "Does repeating the run with `archetype: null` in the record change observed framing if agent_guidance alone is applied?",
};

export default function Wyh001CaseStudyPage() {
  return <WhoisCaseStudyDocument caseId="WYH-001" fields={FIELDS} />;
}
