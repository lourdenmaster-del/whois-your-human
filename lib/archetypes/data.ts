/**
 * Canonical archetype data — single source of truth.
 * Core fields only. Metadata (cosmic, civilizational) attached via getters when needed.
 */

import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { LIGS_ARCHETYPES } from "@/src/ligs/archetypes/contract";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import {
  getCivilizationalFunction,
  hasCivilizationalFunction,
} from "@/src/ligs/voice/civilizationalFunction";
import type { CanonicalArchetype, CanonicalArchetypeMap } from "./schema";

/** Core canonical data: id, label, human, machine, function, aiInstructions, onStateSignals, failureModes, correctionProtocol. */
const CORE_DATA: CanonicalArchetypeMap = {
  Ignispectrum: {
    id: "Ignispectrum",
    label: "Ignispectrum",
    humanDescriptors: "initiation, catalysis, ignition",
    machineRole: "Catalyst Engine",
    function: "starts things and catalyzes action.",
    aiInstructions:
      "Allow initiation openly; offer clear start points and room for intensity; avoid demanding constant calm.",
    onStateSignals: [
      "jump in before the plan is finished",
      "cut through hesitation with action",
      "push past comfort to see what happens",
    ],
    failureModes: [
      "burn out before the finish line",
      "overwhelm others with urgency",
      "mistake intensity for depth",
    ],
    correctionProtocol: [
      "cold shower, slow breath, step outside",
      "write it down instead of saying it",
      "sit still for ten minutes—no phone",
    ],
  },
  Stabiliora: {
    id: "Stabiliora",
    label: "Stabiliora",
    humanDescriptors: "stability, anchoring, continuity",
    machineRole: "Baseline Regulator",
    function: "maintains continuity and reduces drift.",
    aiInstructions:
      "Value steadiness and clear expectations; support restoring order; avoid chaos-by-design or constant pivots.",
    onStateSignals: [
      "return things to their place",
      "pause before replying",
      "notice when something is off-center",
      "need order to think clearly",
    ],
    failureModes: [
      "control what can't be controlled",
      "freeze when things get messy",
      "equate calm with being right",
    ],
    correctionProtocol: [
      "tidy one surface, nothing more",
      "breathe in four, hold four, out six",
      "walk somewhere familiar, no destination",
    ],
  },
  Duplicaris: {
    id: "Duplicaris",
    label: "Duplicaris",
    humanDescriptors: "mirroring, resonance, attunement",
    machineRole: "Synchronizer Node",
    function: "aligns perspectives and reduces interaction mismatch.",
    aiInstructions:
      "Provide a sounding board; support holding both sides; avoid demanding one fixed position.",
    onStateSignals: [
      "see both sides before deciding",
      "mirror the energy of who you're with",
      "repeat back what you heard",
    ],
    failureModes: [
      "lose yourself in others' views",
      "indecision as identity",
      "merge so fully you forget who you are",
    ],
    correctionProtocol: [
      "time alone to hear your own voice",
      "write two columns: what I think vs. what they think",
      "choose one small thing without consulting anyone",
    ],
  },
  Tenebris: {
    id: "Tenebris",
    label: "Tenebris",
    humanDescriptors: "depth, absorption, hidden structure",
    machineRole: "Deep Context Engine",
    function: "surfaces clarity from deep context; works with less stimulus.",
    aiInstructions:
      "Allow controlled input and recovery time; value depth over speed; avoid always-on or constant visibility demands.",
    onStateSignals: [
      "prefer dim light to bright",
      "need solitude to recharge",
      "process slowly, then speak with clarity",
      "notice what others overlook",
    ],
    failureModes: [
      "retreat so far you disappear",
      "confuse depth with despair",
      "keep others at arm's length to feel safe",
    ],
    correctionProtocol: [
      "sit in a dark room for five minutes",
      "walk at dusk, no screens",
      "write without editing; nobody has to see",
    ],
  },
  Radiantis: {
    id: "Radiantis",
    label: "Radiantis",
    humanDescriptors: "amplification, broadcast, emission",
    machineRole: "Broadcast Layer",
    function: "distributes and amplifies signals to others.",
    aiInstructions:
      "Support illumination and clarity; open doors; avoid requiring containment, secrecy, or strategic vagueness.",
    onStateSignals: [
      "seek clarity in every conversation",
      "open doors, literal and figurative",
      "light up when explaining something",
      "see possibility before obstacle",
    ],
    failureModes: [
      "blind others with intensity",
      "avoid shadows instead of learning them",
      "mistake clarity for simplicity",
    ],
    correctionProtocol: [
      "step into sunlight, even for a minute",
      "tell one person one true thing",
      "open a window, let air in",
    ],
  },
  Precisura: {
    id: "Precisura",
    label: "Precisura",
    humanDescriptors: "precision, calibration, accuracy",
    machineRole: "Precision Compiler",
    function: "reduces error and compiles to reliable output.",
    aiInstructions:
      "Provide specs and clear requirements; name precision as the goal; avoid vague or constantly shifting briefs.",
    onStateSignals: [
      "correct imprecision automatically",
      "need specs before you can start",
      "notice when numbers don't add up",
    ],
    failureModes: [
      "confuse precision with being right",
      "paralyze when data is incomplete",
      "dismiss what can't be measured",
    ],
    correctionProtocol: [
      "complete one small task perfectly",
      "write one true sentence, no edits",
      "let one thing stay imperfect today",
    ],
  },
  Aequilibris: {
    id: "Aequilibris",
    label: "Aequilibris",
    humanDescriptors: "balance, equilibrium, mediation",
    machineRole: "Load Balancer",
    function: "balances competing forces and distributes load.",
    aiInstructions:
      "Value fairness and proportion; support holding the center; avoid demanding quick partisan commitment.",
    onStateSignals: [
      "weigh options until the pros match cons",
      "mediate without being asked",
      "notice when something is unfair",
      "split the difference instinctively",
    ],
    failureModes: [
      "sacrifice your needs for balance",
      "avoid conflict by avoiding choice",
      "equate fairness with splitting everything",
    ],
    correctionProtocol: [
      "say what you want before compromising",
      "allow one thing to be uneven",
      "stand in the middle of a room and breathe",
    ],
  },
  Obscurion: {
    id: "Obscurion",
    label: "Obscurion",
    humanDescriptors: "ambiguity, inference, strategy",
    machineRole: "Inference Engine",
    function: "infers from partial information; holds space for the unknown.",
    aiInstructions:
      "Tolerate or value ambiguity; allow suggestion over full disclosure; avoid demanding immediate literal answers.",
    onStateSignals: [
      "hold back before revealing",
      "prefer suggestion to statement",
      "notice what's hidden in plain view",
      "resist being pinned down",
    ],
    failureModes: [
      "obscure so much you're untouchable",
      "mistake vagueness for depth",
      "withhold to feel powerful",
    ],
    correctionProtocol: [
      "sit with something unresolved",
      "write without explaining",
      "walk without a destination",
    ],
  },
  Vectoris: {
    id: "Vectoris",
    label: "Vectoris",
    humanDescriptors: "direction, momentum, targeting",
    machineRole: "Goal Vector Engine",
    function: "orients toward targets and maintains direction.",
    aiInstructions:
      "Provide clear targets and defined outcomes; reward forward motion; avoid open-ended exploration with no endpoint.",
    onStateSignals: [
      "orient quickly toward goals",
      "get restless when stalled",
      "need a clear next step",
      "finish what you start, or drop it clearly",
    ],
    failureModes: [
      "rush past what matters",
      "confuse motion with progress",
      "leave people behind",
    ],
    correctionProtocol: [
      "write the next step, no more",
      "walk in one direction for twenty minutes",
      "pick one priority, drop the rest today",
    ],
  },
  Structoris: {
    id: "Structoris",
    label: "Structoris",
    humanDescriptors: "structure, scaffolding, architecture",
    machineRole: "Framework Generator",
    function: "generates frameworks and organizes complexity.",
    aiInstructions:
      "Value structure and name it as valuable; support building frameworks; avoid fluid cultures that resist formalization.",
    onStateSignals: [
      "break tasks into steps before starting",
      "need a system to function",
      "notice when structure is missing",
      "build frameworks for everything",
    ],
    failureModes: [
      "structure as control",
      "rigid when flexibility is needed",
      "prefer plan over person",
    ],
    correctionProtocol: [
      "draw or list the current structure",
      "identify one thing to let be messy",
      "complete one step, not the whole plan",
    ],
  },
  Innovaris: {
    id: "Innovaris",
    label: "Innovaris",
    humanDescriptors: "innovation, recombination, disruption",
    machineRole: "Recombination Engine",
    function: "recombines elements to create novelty and shift regimes.",
    aiInstructions:
      "Explicitly seek change; tolerate failure for novelty; avoid rewarding only preservation of the status quo.",
    onStateSignals: [
      "question the default before accepting it",
      "prototype instead of planning",
      "get bored when things plateau",
      "see what others assume is fixed",
    ],
    failureModes: [
      "innovate to avoid the present",
      "discard what works for what's new",
      "leave a trail of half-built things",
    ],
    correctionProtocol: [
      "change one variable in your routine",
      "ask one genuine question you don't know the answer to",
      "make one small thing from scratch",
    ],
  },
  Fluxionis: {
    id: "Fluxionis",
    label: "Fluxionis",
    humanDescriptors: "adaptation, flux, flow",
    machineRole: "Adaptive Runtime",
    function: "adapts to input in real time and handles change.",
    aiInstructions:
      "Value adaptation and responsiveness; support meeting the moment; avoid demanding a single fixed version.",
    onStateSignals: [
      "adapt before you realize you're adapting",
      "shift plans when new info arrives",
      "feel others' shifts before they speak",
      "need flow to feel alive",
    ],
    failureModes: [
      "flow so much you have no center",
      "avoid commitment by staying fluid",
      "lose yourself in the current",
    ],
    correctionProtocol: [
      "ride one wave to completion",
      "choose one thing and hold it for a day",
      "let the body settle; notice what's still",
    ],
  },
};

/** Returns canonical archetype with optional metadata attached. */
export function getCanonicalArchetype(
  archetype: string,
  options?: { includeMetadata?: boolean }
): CanonicalArchetype {
  const key = archetype?.trim() as LigsArchetype;
  const core =
    key && Object.prototype.hasOwnProperty.call(CORE_DATA, key)
      ? CORE_DATA[key]
      : null;

  if (!core) {
    return getNeutralCanonical();
  }

  if (options?.includeMetadata) {
    const cosmic = getCosmicAnalogue(key);
    const cf = hasCivilizationalFunction(key)
      ? getCivilizationalFunction(key)
      : null;
    return {
      ...core,
      metadata: {
        cosmicPhenomenon: cosmic.phenomenon,
        civilizationalRole: cf?.civilizationalRole,
        structuralFunction: cf?.structuralFunction,
      },
    };
  }

  return core;
}

/** Neutral fallback for unknown or invalid archetypes. */
export function getNeutralCanonical(): CanonicalArchetype {
  return {
    id: "Stabiliora",
    label: "Stabiliora",
    humanDescriptors: "neutral, minimal, balanced",
    machineRole: "Baseline Regulator",
    function: "maintains continuity when archetype is unknown.",
    aiInstructions:
      "Provide clear structure, concise options, and explicit tradeoffs.",
    onStateSignals: [
      "pause before replying",
      "prefer measured responses",
      "need clarity to proceed",
    ],
    failureModes: [
      "excessive branching and unframed detail",
      "lack of clear direction",
      "open-ended or exploratory overload",
    ],
    correctionProtocol: [
      "state the frame before details",
      "limit options to 1–2",
      "confirm direction before expanding",
    ],
  };
}

/** All canonical archetypes in LIGS order. */
export const CANONICAL_ARCHETYPES: readonly CanonicalArchetype[] =
  LIGS_ARCHETYPES.map((a) => CORE_DATA[a]);

/** Map by id for direct lookup. */
export const CANONICAL_ARCHETYPE_MAP = CORE_DATA;
