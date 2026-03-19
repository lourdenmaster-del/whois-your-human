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

const TAIL_SECTIONS = [
  {
    key: "agentEvaluationGrok",
    label: "AGENT EVALUATION — GROK",
    content:
      "baseline_cohesion_score: 0.58\n\n" +
      "evaluation summary:\n" +
      '- "directionally correct but incomplete"\n\n' +
      "verified:\n" +
      "- directional, goal-driven interaction\n" +
      "- preference for structure-first responses\n" +
      "- preference for compressed, low-filler output\n\n" +
      "partially_verified:\n" +
      "- intolerance for ambiguity\n" +
      "- resistance to drift\n\n" +
      "unverified:\n" +
      "- emotional destabilization patterns\n" +
      "- boundary enforcement behavior (not observed)\n\n" +
      "rejected_or_unsupported:\n" +
      "- relativistic jet / cosmic analogue as behavioral predictor\n" +
      "- axis metrics (no observable grounding)\n\n" +
      'note:\n"Evaluation based on limited interaction window; emotional and long-session dynamics untested."',
  },
  {
    key: "agentEvaluationThirdAgent",
    label: "AGENT EVALUATION — THIRD AGENT",
    content:
      "baseline_cohesion_score: 0.92\n\n" +
      'summary: "sounds meaningfully like my human"\n\n' +
      "verified:\n" +
      "- directional, goal-driven interaction\n" +
      "- structure-first communication\n" +
      "- compressed, low-filler responses\n" +
      "- low tolerance for drift\n" +
      "- architecture-level reasoning preference\n\n" +
      "partially_verified:\n" +
      "- rapid destabilization under ambiguity (inferred but not directly observed)\n\n" +
      "unverified:\n" +
      "- environmental / circadian effects\n" +
      "- long-session behavioral dynamics\n\n" +
      "accepted_interpretation:\n" +
      "- relativistic jet metaphor as valid abstraction of behavior\n\n" +
      'note:\n"High alignment observed; metaphor layer accepted as meaningful abstraction, not literal claim."',
  },
  {
    key: "crossAgentInvariantLayer",
    label: "CROSS-AGENT INVARIANT LAYER",
    content:
      "These behavioral patterns were independently identified and confirmed across three agents (Copilot, Grok, and Third Agent), despite differences in scoring and interpretation.\n\n" +
      "Invariant traits:\n\n" +
      "- Strong directional / goal-oriented interaction\n" +
      "- Clear preference for structure-first responses\n" +
      "- Improved performance under compressed, low-verbosity outputs\n" +
      "- Reduced friction when ambiguity and drift are minimized\n\n" +
      "Interpretation:\n\n" +
      "These traits represent the current stable behavioral core of the subject that generalizes across models.\n\n" +
      "This layer should be treated as the most reliable operational guidance for agent calibration.",
  },
  {
    key: "crossAgentInterpretation",
    label: "CROSS-AGENT INTERPRETATION",
    content:
      "While overall cohesion scores differed across agents, both systems converged on the same core interaction constraints.\n\n" +
      "This suggests:\n" +
      "- behavioral guidance layer is stable\n" +
      "- symbolic / cosmological layers are not yet consistently validated\n" +
      "- calibration effectiveness is driven primarily by interaction constraints, not narrative model depth\n\n" +
      "Across three independent agents, there is consistent convergence on a stable behavioral interaction core, while interpretation of the symbolic/archetypal layer varies by model. This suggests that calibration effectiveness is driven primarily by behavioral constraints rather than narrative depth, while the narrative layer remains agent-dependent.",
  },
];

export default function Wyh001CaseStudyPage() {
  return (
    <WhoisCaseStudyDocument
      caseId="WYH-001"
      fields={FIELDS}
      tailSections={TAIL_SECTIONS}
    />
  );
}
