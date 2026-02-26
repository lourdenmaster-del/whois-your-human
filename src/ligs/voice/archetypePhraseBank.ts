/**
 * Deterministic archetype phrase bank for E.V.E. filter.
 * Used to increase archetype-specific resonance and reduce template feel.
 * Language: modern, grounded, non-woo, no medical claims.
 */

import type { LigsArchetype } from "./schema";
import { LIGS_ARCHETYPES } from "../archetypes/contract";

export interface ArchetypePhraseBank {
  sensoryMetaphors: readonly string[];
  behavioralTells: readonly string[];
  relationalTells: readonly string[];
  shadowDrift: readonly string[];
  resetMoves: readonly string[];
}

const PHRASE_BANKS: Record<LigsArchetype, ArchetypePhraseBank> = {
  Ignispectrum: {
    sensoryMetaphors: [
      "embers banked, waiting to catch",
      "flame flickers at the edge of vision",
      "heat rising through cold stone",
      "glow in the periphery before dawn",
      "sparks when friction meets intent",
    ],
    behavioralTells: [
      "jump in before the plan is finished",
      "cut through hesitation with action",
      "speak before thinking it through",
      "leave meetings energized, others drained",
      "push past comfort to see what happens",
    ],
    relationalTells: [
      "people lean in or step back",
      "arguments get heated; you mean well",
      "you ignite others or overwhelm them",
      "intensity is your love language",
      "you need partners who can match or ground",
    ],
    shadowDrift: [
      "burn out before the finish line",
      "overwhelm others with urgency",
      "mistake intensity for depth",
    ],
    resetMoves: [
      "cold shower, slow breath, step outside",
      "write it down instead of saying it",
      "sit still for ten minutes—no phone",
    ],
  },
  Stabiliora: {
    sensoryMetaphors: [
      "soft light through sheer curtains",
      "still water in a shallow bowl",
      "warm stone underfoot at dawn",
      "quiet room, dust motes in a single beam",
      "symmetry that calms the eye",
    ],
    behavioralTells: [
      "return things to their place",
      "pause before replying",
      "prefer routine over spontaneity",
      "notice when something is off-center",
      "need order to think clearly",
    ],
    relationalTells: [
      "people feel steadied around you",
      "you withdraw when chaos peaks",
      "you restore others by staying calm",
      "conflict feels like a tilt you must correct",
      "you build trust through consistency",
    ],
    shadowDrift: [
      "control what can't be controlled",
      "freeze when things get messy",
      "equate calm with being right",
    ],
    resetMoves: [
      "tidy one surface, nothing more",
      "breathe in four, hold four, out six",
      "walk somewhere familiar, no destination",
    ],
  },
  Duplicaris: {
    sensoryMetaphors: [
      "mirror reflecting mirror",
      "twin peaks in the distance",
      "echo that returns softer",
      "shadow that moves in parallel",
      "two sides of the same coin, held to light",
    ],
    behavioralTells: [
      "see both sides before deciding",
      "mirror the energy of who you're with",
      "need a sounding board to know what you think",
      "repeat back what you heard",
      "feel pulled between options equally",
    ],
    relationalTells: [
      "people feel seen because you reflect them",
      "you absorb others' moods",
      "partnership feels essential, not optional",
      "you mediate without meaning to",
      "you need someone to reflect you back",
    ],
    shadowDrift: [
      "lose yourself in others' views",
      "indecision as identity",
      "merge so fully you forget who you are",
    ],
    resetMoves: [
      "time alone to hear your own voice",
      "write two columns: what I think vs. what they think",
      "choose one small thing without consulting anyone",
    ],
  },
  Tenebris: {
    sensoryMetaphors: [
      "shadow pooled in the corner",
      "first star before full dark",
      "dim room, one lamp lit",
      "frost on glass at dawn",
      "depth where light bends away",
    ],
    behavioralTells: [
      "prefer dim light to bright",
      "need solitude to recharge",
      "process slowly, then speak with clarity",
      "withdraw when overstimulated",
      "notice what others overlook",
    ],
    relationalTells: [
      "people either lean in or feel shut out",
      "you reveal in layers, not all at once",
      "intimacy happens in quiet moments",
      "you need space to feel close",
      "you hold depth that others don't always see",
    ],
    shadowDrift: [
      "retreat so far you disappear",
      "confuse depth with despair",
      "keep others at arm's length to feel safe",
    ],
    resetMoves: [
      "sit in a dark room for five minutes",
      "walk at dusk, no screens",
      "write without editing; nobody has to see",
    ],
  },
  Radiantis: {
    sensoryMetaphors: [
      "light through a prism, split to color",
      "warmth on skin after long cold",
      "dawn breaking over a flat horizon",
      "clear water catching sun",
      "room that brightens when you enter",
    ],
    behavioralTells: [
      "seek clarity in every conversation",
      "open doors, literal and figurative",
      "light up when explaining something",
      "need bright, open spaces to work well",
      "see possibility before obstacle",
    ],
    relationalTells: [
      "people feel seen and warmed by you",
      "you illuminate what others miss",
      "you can overwhelm with too much brightness",
      "you draw people toward the light",
      "you need room to expand",
    ],
    shadowDrift: [
      "blind others with intensity",
      "avoid shadows instead of learning them",
      "mistake clarity for simplicity",
    ],
    resetMoves: [
      "step into sunlight, even for a minute",
      "tell one person one true thing",
      "open a window, let air in",
    ],
  },
  Precisura: {
    sensoryMetaphors: [
      "ruler edge against paper",
      "needle at zero, calibrated",
      "grid lines meeting exactly",
      "sharp focus on a single point",
      "measure twice, cut once—literally",
    ],
    behavioralTells: [
      "correct imprecision automatically",
      "need specs before you can start",
      "notice when numbers don't add up",
      "prefer lists to paragraphs",
      "get frustrated by vagueness",
    ],
    relationalTells: [
      "people trust your accuracy or feel judged",
      "you show care through precision",
      "you struggle with messy emotions",
      "you need clarity to connect",
      "you deliver what you promise",
    ],
    shadowDrift: [
      "confuse precision with being right",
      "paralyze when data is incomplete",
      "dismiss what can't be measured",
    ],
    resetMoves: [
      "complete one small task perfectly",
      "write one true sentence, no edits",
      "let one thing stay imperfect today",
    ],
  },
  Aequilibris: {
    sensoryMetaphors: [
      "scales level, nothing moving",
      "still point in a spinning room",
      "horizon line, even and clear",
      "weight distributed, nothing tipping",
      "center that holds when everything shifts",
    ],
    behavioralTells: [
      "weigh options until the pros match cons",
      "mediate without being asked",
      "notice when something is unfair",
      "need balance to feel okay",
      "split the difference instinctively",
    ],
    relationalTells: [
      "people come to you for fairness",
      "you absorb tension to keep peace",
      "you struggle when forced to take sides",
      "you give until it hurts, then resent",
      "you need harmony to thrive",
    ],
    shadowDrift: [
      "sacrifice your needs for balance",
      "avoid conflict by avoiding choice",
      "equate fairness with splitting everything",
    ],
    resetMoves: [
      "say what you want before compromising",
      "allow one thing to be uneven",
      "stand in the middle of a room and breathe",
    ],
  },
  Obscurion: {
    sensoryMetaphors: [
      "fog lifting in layers",
      "texture in shadow that rewards looking",
      "depth in a single dark hue",
      "veil between seen and unseen",
      "something half-glimpsed, not named",
    ],
    behavioralTells: [
      "hold back before revealing",
      "prefer suggestion to statement",
      "notice what's hidden in plain view",
      "need ambiguity to think",
      "resist being pinned down",
    ],
    relationalTells: [
      "people either lean in or drift away",
      "you create space for interpretation",
      "you guard your inner world",
      "intimacy requires patience",
      "you reveal in glimpses, not disclosures",
    ],
    shadowDrift: [
      "obscure so much you're untouchable",
      "mistake vagueness for depth",
      "withhold to feel powerful",
    ],
    resetMoves: [
      "sit with something unresolved",
      "write without explaining",
      "walk without a destination",
    ],
  },
  Vectoris: {
    sensoryMetaphors: [
      "arrow released toward target",
      "path through tall grass, bent once",
      "momentum carrying forward",
      "compass needle holding true",
      "flow in one direction, no backwash",
    ],
    behavioralTells: [
      "orient quickly toward goals",
      "get restless when stalled",
      "need a clear next step",
      "cut tangents short",
      "finish what you start, or drop it clearly",
    ],
    relationalTells: [
      "people feel pulled forward with you",
      "you lose patience with drift",
      "you show care through direction",
      "you need partners who move",
      "you lead by going first",
    ],
    shadowDrift: [
      "rush past what matters",
      "confuse motion with progress",
      "leave people behind",
    ],
    resetMoves: [
      "write the next step, no more",
      "walk in one direction for twenty minutes",
      "pick one priority, drop the rest today",
    ],
  },
  Structoris: {
    sensoryMetaphors: [
      "scaffold holding weight",
      "bones under skin, frame visible",
      "blueprint before the build",
      "grid that organizes chaos",
      "architecture that shows intent",
    ],
    behavioralTells: [
      "break tasks into steps before starting",
      "need a system to function",
      "reorganize when stressed",
      "notice when structure is missing",
      "build frameworks for everything",
    ],
    relationalTells: [
      "people rely on you for order",
      "you create containers for others",
      "you struggle with mess in relationships",
      "you show care through reliability",
      "you need structure to feel safe",
    ],
    shadowDrift: [
      "structure as control",
      "rigid when flexibility is needed",
      "prefer plan over person",
    ],
    resetMoves: [
      "draw or list the current structure",
      "identify one thing to let be messy",
      "complete one step, not the whole plan",
    ],
  },
  Innovaris: {
    sensoryMetaphors: [
      "hinge that opens a new angle",
      "first crack in ice before the thaw",
      "break in pattern that rewrites the rule",
      "bridge where none existed",
      "seed splitting before the sprout",
    ],
    behavioralTells: [
      "question the default before accepting it",
      "prototype instead of planning",
      "get bored when things plateau",
      "leap before looking sometimes",
      "see what others assume is fixed",
    ],
    relationalTells: [
      "people feel sparked or unsettled",
      "you push others to grow",
      "you need novelty to stay engaged",
      "you break routines others depend on",
      "you inspire or exhaust",
    ],
    shadowDrift: [
      "innovate to avoid the present",
      "discard what works for what's new",
      "leave a trail of half-built things",
    ],
    resetMoves: [
      "change one variable in your routine",
      "ask one genuine question you don't know the answer to",
      "make one small thing from scratch",
    ],
  },
  Fluxionis: {
    sensoryMetaphors: [
      "current that carries without grasping",
      "river adapting to the bank",
      "cloud shifting shape, still a cloud",
      "sand adjusting to wind",
      "fluid filling whatever space it gets",
    ],
    behavioralTells: [
      "adapt before you realize you're adapting",
      "shift plans when new info arrives",
      "feel others' shifts before they speak",
      "need flow to feel alive",
      "resist being pinned to one version",
    ],
    relationalTells: [
      "people feel met where they are",
      "you flow with others easily",
      "you struggle with rigid partners",
      "you absorb change; sometimes it costs you",
      "you need movement to connect",
    ],
    shadowDrift: [
      "flow so much you have no center",
      "avoid commitment by staying fluid",
      "lose yourself in the current",
    ],
    resetMoves: [
      "ride one wave to completion",
      "choose one thing and hold it for a day",
      "let the body settle; notice what's still",
    ],
  },
};

export function getArchetypePhraseBank(archetype: LigsArchetype): ArchetypePhraseBank {
  return PHRASE_BANKS[archetype];
}

export function buildPhraseBankBlock(archetype: LigsArchetype): string {
  const bank = PHRASE_BANKS[archetype];
  const lines: string[] = [
    `ARCHETYPE PHRASE BANK (${archetype}) — Use these phrase atoms to increase specificity; do not reuse the same sentence across sections.`,
    "",
    "sensoryMetaphors:",
    ...bank.sensoryMetaphors.map((s) => `  - ${s}`),
    "",
    "behavioralTells:",
    ...bank.behavioralTells.map((s) => `  - ${s}`),
    "",
    "relationalTells:",
    ...bank.relationalTells.map((s) => `  - ${s}`),
    "",
    "shadowDrift:",
    ...bank.shadowDrift.map((s) => `  - ${s}`),
    "",
    "resetMoves:",
    ...bank.resetMoves.map((s) => `  - ${s}`),
  ];
  return lines.join("\n");
}

/** All archetypes that have phrase banks (the canonical 12). */
export { LIGS_ARCHETYPES };
