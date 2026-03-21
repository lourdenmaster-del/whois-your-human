/**
 * GET /api/agent/prior-format — Public machine-readable free prior format.
 * No auth. JSON only. For agents that cannot call out; portable prior surface.
 * Does not expose WHOIS records, deep model, or derivation logic.
 */

import { NextResponse } from "next/server";

const EXAMPLE_PRIOR = {
  interaction_prior: {
    label: "Vectoris",
    axes: { lateral: 0.7, vertical: 0.75, depth: 0.7 },
    coherence: 0.85,
    strategy:
      "Drive toward clear direction quickly using structured, high-signal responses. Minimize drift and ambiguity.",
    rules: [
      "lead with structure immediately",
      "limit options to 1–2 max",
      "eliminate ambiguity and filler",
      "confirm direction before expanding",
      "operate at architecture level first, details second",
    ],
    failure_modes: [
      "open-ended or exploratory responses",
      "too many options or branches",
      "lack of clear direction",
      "soft or hedged language",
    ],
    confidence: "hypothesis",
  },
};

export async function GET() {
  try {
    const body = {
    schema: "whois-your-human/prior-format/v1",
    what: "Compressed interaction prior derived from the Vector Zero layer. A structured starting hypothesis for how to interact with a human—not a total human model.",
    hypothesis_statement:
      "It is a starting hypothesis, not a total human model. Treat as context; update based on observed behavior.",
    fields: {
      label: "Archetype name (e.g. Vectoris, Fluxionis)",
      axes: "{ lateral, vertical, depth } in 0–1",
      coherence: "0–1",
      strategy: "One-line interaction strategy",
      rules: "Array of interaction rules",
      failure_modes: "Array of patterns to avoid",
      confidence: "e.g. hypothesis",
    },
    example: EXAMPLE_PRIOR,
    agent_instructions: [
      "Use the prior as context; do not override the user's explicit goals",
      "Prefer structure-first, bounded options, clear direction",
      "Avoid failure_modes; lean into rules where plausible",
      "Re-check fit as the thread evolves",
    ],
    protected_layer: {
      description: "The following require a paid wyh_ token and are not exposed here",
      items: [
        "Full WHOIS record (human metadata, measured_context, verification)",
        "Deep model output (civilizational_function, three_voice, cosmic_twin, full agent_guidance)",
        "Derivation logic (how the prior is computed from birth data)",
      ],
    },
  };

    return NextResponse.json(body);
  } catch (err) {
    console.error("[agent/prior-format] GET failed:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", schema: "whois-your-human/prior-format/v1" },
      { status: 500 }
    );
  }
}
