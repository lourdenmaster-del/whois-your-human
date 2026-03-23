/**
 * Formatters for human-facing and robot-facing archetype output.
 * Consumes canonical archetype data only.
 */

import type { CanonicalArchetype } from "./schema";
import { getCanonicalArchetype } from "./data";

export interface HumanOutput {
  archetypeName: string;
  shortDescription: string;
  whatItMeansInPractice: string;
  howAiShouldWorkForYou: string;
}

export interface RobotOutput {
  id: string;
  machineRole: string;
  function: string;
  onStateSignals: readonly string[];
  failureModes: readonly string[];
  correctionProtocol: readonly string[];
}

/** Format canonical archetype for human consumption. */
export function formatForHuman(archetype: string | CanonicalArchetype): HumanOutput {
  const c = typeof archetype === "string" ? getCanonicalArchetype(archetype) : archetype;
  return {
    archetypeName: c.label,
    shortDescription: c.humanDescriptors,
    whatItMeansInPractice: c.function,
    howAiShouldWorkForYou: c.aiInstructions,
  };
}

/** Format canonical archetype for machine consumption (behavior profile). */
export function formatForRobot(archetype: string | CanonicalArchetype): RobotOutput {
  const c = typeof archetype === "string" ? getCanonicalArchetype(archetype) : archetype;
  return {
    id: c.id,
    machineRole: c.machineRole,
    function: c.function,
    onStateSignals: c.onStateSignals,
    failureModes: c.failureModes,
    correctionProtocol: c.correctionProtocol,
  };
}

/** Render human output as plain text (for copy/share). */
export function renderHumanAsText(archetype: string | CanonicalArchetype): string {
  const h = formatForHuman(archetype);
  return [
    h.archetypeName,
    "",
    `Short description: ${h.shortDescription}`,
    "",
    `In practice: ${h.whatItMeansInPractice}`,
    "",
    `How AI should work for you: ${h.howAiShouldWorkForYou}`,
  ].join("\n");
}

/** Render robot output as JSON (for agent consumption). */
export function renderRobotAsJson(archetype: string | CanonicalArchetype): string {
  return JSON.stringify(formatForRobot(archetype), null, 2);
}

export interface InteractionProfile {
  title: string;
  behaviorRules: string[];
  frictionPatterns?: string[];
  recoveryActions?: string[];
}

/** Parse aiInstructions into discrete rules (semicolon-separated). */
function parseAiInstructions(aiInstructions: string): string[] {
  return aiInstructions
    .split(/;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Tighten canonical copy for AI interaction guidance. Recovery = what the assistant should help do, not physical self-help. */
const TIGHTEN_MAP: Record<string, string> = {
  // Behavior (aiInstructions)
  "Allow initiation openly": "Let them initiate openly",
  "offer clear start points and room for intensity": "Offer clear start points and room for intensity",
  "avoid demanding constant calm": "Avoid demanding constant calm",
  "Value steadiness and clear expectations": "Value steadiness and clear expectations",
  "support restoring order": "Support restoring order",
  "avoid chaos-by-design or constant pivots": "Avoid chaos-by-design or constant pivots",
  "Provide a sounding board": "Provide a sounding board",
  "support holding both sides": "Support holding both sides",
  "avoid demanding one fixed position": "Avoid demanding one fixed position",
  "Allow controlled input and recovery time": "Allow controlled input and recovery time",
  "value depth over speed": "Value depth over speed",
  "avoid always-on or constant visibility demands": "Avoid always-on or constant visibility demands",
  "Support illumination and clarity": "Support illumination and clarity",
  "open doors": "Open doors",
  "avoid requiring containment, secrecy, or strategic vagueness": "Avoid requiring containment, secrecy, or strategic vagueness",
  "Provide specs and clear requirements": "Provide specs and clear requirements",
  "name precision as the goal": "Name precision as the goal",
  "avoid vague or constantly shifting briefs": "Avoid vague or constantly shifting briefs",
  "Value fairness and proportion": "Value fairness and proportion",
  "support holding the center": "Support holding the center",
  "avoid demanding quick partisan commitment": "Avoid demanding quick partisan commitment",
  "Tolerate or value ambiguity": "Tolerate or value ambiguity",
  "allow suggestion over full disclosure": "Allow suggestion over full disclosure",
  "avoid demanding immediate literal answers": "Avoid demanding immediate literal answers",
  "Provide clear targets and defined outcomes": "Provide clear targets and defined outcomes",
  "reward forward motion": "Keep momentum moving",
  "avoid open-ended exploration with no endpoint": "Avoid open-ended exploration with no endpoint",
  "Value structure and name it as valuable": "Value structure and name it as valuable",
  "support building frameworks": "Support building frameworks",
  "avoid fluid cultures that resist formalization": "Avoid fluid cultures that resist formalization",
  "Explicitly seek change": "Explicitly seek change",
  "tolerate failure for novelty": "Tolerate failure for novelty",
  "avoid rewarding only preservation of the status quo": "Avoid rewarding only preservation of the status quo",
  "Value adaptation and responsiveness": "Value adaptation and responsiveness",
  "support meeting the moment": "Support meeting the moment",
  "avoid demanding a single fixed version": "Avoid demanding a single fixed version",
  "Provide clear structure, concise options, and explicit tradeoffs.": "Provide clear structure, concise options, and explicit tradeoffs",
  // Friction (failureModes)
  "burn out before the finish line": "Running out of energy before the task is done",
  "overwhelm others with urgency": "Overwhelming others with urgency",
  "mistake intensity for depth": "Confusing intensity with depth",
  "control what can't be controlled": "Trying to control what can't be controlled",
  "freeze when things get messy": "Freezing when things get messy",
  "equate calm with being right": "Equating calm with being right",
  "lose yourself in others' views": "Losing yourself in others' views",
  "indecision as identity": "Treating indecision as identity",
  "merge so fully you forget who you are": "Merging so fully you lose your own perspective",
  "retreat so far you disappear": "Retreating so far you become unreachable",
  "confuse depth with despair": "Confusing depth with despair",
  "keep others at arm's length to feel safe": "Keeping others at arm's length to feel safe",
  "blind others with intensity": "Overwhelming others with intensity",
  "avoid shadows instead of learning them": "Avoiding difficult topics instead of addressing them",
  "mistake clarity for simplicity": "Confusing clarity with simplicity",
  "confuse precision with being right": "Confusing precision with being right",
  "paralyze when data is incomplete": "Paralyzing when data is incomplete",
  "dismiss what can't be measured": "Dismissing what can't be measured",
  "sacrifice your needs for balance": "Sacrificing your needs for balance",
  "avoid conflict by avoiding choice": "Avoiding conflict by avoiding choice",
  "equate fairness with splitting everything": "Equating fairness with splitting everything",
  "obscure so much you're untouchable": "Being so obscure you become unreachable",
  "mistake vagueness for depth": "Confusing vagueness with depth",
  "withhold to feel powerful": "Withholding to feel powerful",
  "rush past what matters": "Missing important details while moving too fast",
  "confuse motion with progress": "Confusing activity with progress",
  "leave people behind": "Leaving others behind when moving fast",
  "structure as control": "Using structure as control",
  "rigid when flexibility is needed": "Being rigid when flexibility is needed",
  "prefer plan over person": "Preferring plan over person",
  "innovate to avoid the present": "Innovating to avoid the present",
  "discard what works for what's new": "Discarding what works for what's new",
  "leave a trail of half-built things": "Leaving a trail of half-built things",
  "flow so much you have no center": "Flowing so much you have no center",
  "avoid commitment by staying fluid": "Avoiding commitment by staying fluid",
  "lose yourself in the current": "Losing yourself in the flow",
  "excessive branching and unframed detail": "Excessive branching and unframed detail",
  "lack of clear direction": "Lack of clear direction",
  "open-ended or exploratory overload": "Open-ended or exploratory overload",
  // Recovery (correctionProtocol) — assistant-facing: what the AI should help do
  "cold shower, slow breath, step outside": "Slow the pace and reduce pressure",
  "write it down instead of saying it": "Move the idea into a clear written step",
  "sit still for ten minutes—no phone": "Create a short reset before continuing",
  "tidy one surface, nothing more": "Simplify to one small, completable action",
  "breathe in four, hold four, out six": "Create a brief pause before responding",
  "walk somewhere familiar, no destination": "Reduce scope to something familiar and bounded",
  "time alone to hear your own voice": "Create space for their own view before reflecting back",
  "write two columns: what I think vs. what they think": "Separate their view from others' before deciding",
  "choose one small thing without consulting anyone": "Help them pick one small decision without input",
  "sit in a dark room for five minutes": "Allow low-input recovery before continuing",
  "walk at dusk, no screens": "Suggest a low-stimulus break",
  "write without editing; nobody has to see": "Encourage private capture without pressure to share",
  "step into sunlight, even for a minute": "Suggest a brief clarity break",
  "tell one person one true thing": "Encourage one clear disclosure",
  "open a window, let air in": "Create space for fresh input",
  "complete one small task perfectly": "Narrow to one completable task",
  "write one true sentence, no edits": "Capture one definitive statement",
  "let one thing stay imperfect today": "Allow one defined imperfection",
  "say what you want before compromising": "Surface their preference before mediating",
  "allow one thing to be uneven": "Accept one deliberate imbalance",
  "stand in the middle of a room and breathe": "Create a brief centering pause",
  "sit with something unresolved": "Hold space for the unresolved",
  "write without explaining": "Capture without requiring explanation",
  "walk without a destination": "Allow open-ended processing",
  "write the next step, no more": "Define the next step only",
  "walk in one direction for twenty minutes": "Hold to one direction until the task is stable",
  "pick one priority, drop the rest today": "Pick one priority; deprioritize the rest for now",
  "draw or list the current structure": "Make the current structure visible",
  "identify one thing to let be messy": "Identify one element to leave unstructured",
  "complete one step, not the whole plan": "Complete one step only",
  "change one variable in your routine": "Shift one variable",
  "ask one genuine question you don't know the answer to": "Ask one genuine open question",
  "make one small thing from scratch": "Create one small thing from scratch",
  "ride one wave to completion": "See one thread through to completion",
  "choose one thing and hold it for a day": "Fix one commitment for the day",
  "let the body settle; notice what's still": "Allow a settling pause; notice what remains",
  "state the frame before details": "State the frame before details",
  "limit options to 1–2": "Limit options to 1–2",
  "confirm direction before expanding": "Confirm direction before expanding",
};

function tighten(line: string): string {
  const trimmed = line.trim();
  return TIGHTEN_MAP[trimmed] ?? (trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
}

/**
 * Human-facing formatter: "How AI Should Work With You".
 * No archetype labels, cosmic language, or internal jargon.
 * Copy tightened for imperative phrasing and clear problem/recovery wording.
 */
export function formatInteractionProfile(archetype: string): InteractionProfile {
  const c = getCanonicalArchetype(archetype);

  const rules = parseAiInstructions(c.aiInstructions)
    .slice(0, 3)
    .map(tighten);
  const frictionPatterns = c.failureModes.slice(0, 3).map(tighten);
  const recoveryActions = c.correctionProtocol.slice(0, 3).map(tighten);

  const out: InteractionProfile = {
    title: "How AI Should Work With You",
    behaviorRules: rules,
  };
  if (frictionPatterns.length > 0) {
    out.frictionPatterns = frictionPatterns;
  }
  if (recoveryActions.length > 0) {
    out.recoveryActions = recoveryActions;
  }
  return out;
}
