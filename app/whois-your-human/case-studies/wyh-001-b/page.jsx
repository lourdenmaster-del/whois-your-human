import WhoisCaseStudyDocument from "@/components/WhoisCaseStudyDocument";

export const metadata = {
  title: "WYH-001-B | Case study",
  description:
    "WYH-001-B: static audit write-up (n=1); subject-reported usability, not measured at scale.",
};

const FIELDS = {
  question:
    "Same subject and record as WYH-001—does an explicit “COPY: Use this with AI” block in the Origin success strip change first-turn assistant behavior?",
  subject:
    "Same as WYH-001; second session separated by ≥24h; no thread carryover.",
  setup:
    "Identical agent calibration record payload; assistant reset; user pastes only the provided copy block plus “Use my WHOIS.”",
  procedure:
    "1. Paste copy block from Origin success UI.\n2. Ask the same three scripted prompts as WYH-001.\n3. Compare opening sentence structure and option count in responses.",
  observations:
    "Opening turns more often led with a one-line frame when the paste block preceded the first user task. Observed in this run only.",
  result:
    "Subject-reported qualitative change in “immediate usability”; observed effect, not yet generalized.",
  limits:
    "Same as WYH-001; paste path depends on UI copy remaining stable; assistant self-reports not verified.",
  nextQuestion:
    "Should the copy block be versioned in-repo alongside these case IDs for audit traceability?",
};

export default function Wyh001BCaseStudyPage() {
  return <WhoisCaseStudyDocument caseId="WYH-001-B" fields={FIELDS} />;
}
