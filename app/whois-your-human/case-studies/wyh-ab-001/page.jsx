import WhoisCaseStudyDocument from "@/components/WhoisCaseStudyDocument";

export const metadata = {
  title: "WYH-A/B-001 | Case study",
  description:
    "WYH-A/B-001: Vector Zero prior reduces drift and speeds alignment; first LIGS A/B interaction-prior test.",
};

const FIELDS = {
  question:
    "Does a LIGS Vector Zero prior improve the first-turn interaction loop by reducing branching, lowering correction pressure, and increasing speed to alignment?",
  subject: "Lourden Master",
  setup:
    "Condition A: No explicit LIGS prior — assistant responded using normal adaptive conversation only.\n\n" +
    "Condition B: Vector Zero prior active — assistant instructed to use only the Vector Zero prior and avoid deeper model inference.\n\n" +
    "Task context: Live work on LIGS architecture, agent access, public inspection flow, and adoption framing.",
  procedure:
    "A/B comparison within a single session. Same human, same assistant, same task domain. Condition A baseline; Condition B with prior injected. No deeper identity model used in either condition.",
  observations:
    "Condition A — Pattern: more abstraction, more explanation, more branching, more resets caused by drift. Human response: frequent correction, repeated regroup-style interventions, explicit rejection of off-track framing.\n\n" +
    "Condition B — Pattern: more structure, more direct prompts, fewer branches, architecture-first framing, faster convergence on the next action. Human response: fewer corrections, explicit positive acknowledgment, faster acceptance of prompts and reframes.",
  result:
    "Primary: Turns to alignment improved. Directional finding — before prior: multiple corrective turns were often needed; with prior: alignment often occurred within 1–2 responses.\n\n" +
    "Secondary: correction pressure decreased; ambiguity tolerance decreased in a productive way; branch count decreased; response usefulness increased.",
  limits:
    "What this does not prove: universal validity; cross-human generalization; deep identity accuracy; long-session performance across many tasks.",
  nextQuestion:
    "How does prior effectiveness vary across tasks, humans, or sustained sessions?",
};

const TAIL_SECTIONS = [
  {
    key: "priorUsed",
    label: "PRIOR USED",
    content:
      "Derived only from the Vector Zero layer of the subject's report.\n\n" +
      "label: Vectoris\n" +
      "coherence: 0.85\n" +
      "axes: 0.70 / 0.75 / 0.70\n\n" +
      "Free prior used in test (Vector Zero layer only; deeper model not used):\n\n" +
      '{\n  "interaction_prior": {\n    "label": "Vectoris",\n    "axes": {"lateral": 0.70, "vertical": 0.75, "depth": 0.70},\n    "coherence": 0.85,\n    "strategy": "Drive toward clear direction quickly using structured, high-signal responses. Minimize drift and ambiguity.",\n    "rules": ["lead with structure immediately", "limit options to 1–2 max", "eliminate ambiguity and filler", "confirm direction before expanding", "operate at architecture level first, details second"],\n    "failure_modes": ["open-ended or exploratory responses", "too many options or branches", "lack of clear direction", "soft or hedged language"],\n    "confidence": "hypothesis"\n  }\n}',
  },
  {
    key: "interpretation",
    label: "INTERPRETATION",
    content:
      "The prior did not need to be perfectly true to help. Its value was that it gave the assistant a better first move.\n\n" +
      "That changed the loop:\n" +
      "1. stronger initial framing\n" +
      "2. clearer human reaction\n" +
      "3. faster correction if needed\n" +
      "4. faster convergence overall",
  },
  {
    key: "supports",
    label: "WHAT THIS SUPPORTS",
    content:
      "LIGS functions as an interaction prior that can improve early alignment between human and agent.",
  },
  {
    key: "verdict",
    label: "VERDICT",
    content:
      "Endorse (provisional)\n\n" +
      "Reason: low-cost prior; immediate behavioral effect; no observed downside in this interaction; measurable reduction in drift and correction load.",
  },
  {
    key: "oneLine",
    label: "ONE-LINE PUBLIC VERSION",
    content:
      "Using a LIGS Vector Zero prior improved first-turn alignment, reduced drift, and lowered correction pressure in a live human-agent working session.",
  },
];

export default function WyhAb001CaseStudyPage() {
  return (
    <WhoisCaseStudyDocument
      caseId="WYH-A/B-001"
      fields={FIELDS}
      tailSections={TAIL_SECTIONS}
    />
  );
}
