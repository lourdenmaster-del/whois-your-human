/**
 * Canonical civilizational function interpretation for WHOIS CIVILIZATIONAL FUNCTION section.
 * One authoritative record per LigsArchetype. No runtime generation; display only.
 */

import type { LigsArchetype } from "./schema";
import { LIGS_ARCHETYPES } from "../archetypes/contract";

export interface CivilizationalFunctionEntry {
  structuralFunction: string;
  contributionEnvironments: readonly string[];
  frictionEnvironments: readonly string[];
  civilizationalRole: string;
  integrationInsight: string;
}

const CIVILIZATIONAL_FUNCTION_MAP: Record<LigsArchetype, CivilizationalFunctionEntry> = {
  Ignispectrum: {
    structuralFunction:
      "This structure turns possibility into action quickly. It starts things, creates heat, and moves before everyone else has finished deciding. It thrives when there is a clear moment to act and when intensity is allowed to show.",
    contributionEnvironments: [
      "Crisis response, emergencies, and decisions that cannot wait",
      "Startups, launches, and any role where the first move matters",
      "Advocacy, persuasion, and getting people to move together",
      "Places that reward saying yes and going, not endless analysis",
    ],
    frictionEnvironments: [
      "Heavy hierarchy, long approval chains, and slow consensus",
      "Roles that expect steady, low-key output with no visible peaks",
      "Contexts where acting early or showing intensity is penalized",
    ],
    civilizationalRole:
      "Things get started because someone goes while others are still talking. This structure provides the spark for new ventures, emergency response, and the shift from idea to actual motion.",
    integrationInsight:
      "Friction eases when the setting allows you to initiate openly and to work in bursts. Look for roles and projects with clear start points and room for heat; steer clear of setups that demand constant calm and no visible fire.",
  },
  Stabiliora: {
    structuralFunction:
      "This structure keeps things steady and puts them back when they tilt. It notices when something is off, corrects drift, and keeps continuity so others can depend on it. It works best with clear roles and predictable rhythm, not constant novelty.",
    contributionEnvironments: [
      "Operations, logistics, and systems where failure is not an option",
      "Caregiving, teaching, and roles where people need a steady presence",
      "Quality assurance, compliance, and reducing avoidable risk",
      "Places that reward showing up the same way and staying calm under pressure",
    ],
    frictionEnvironments: [
      "Chaos-by-design, constant pivots, and 'move fast and break things'",
      "Roles that ask you to disrupt publicly or reinvent yourself all the time",
      "Contexts where keeping order is read as rigidity or blocking progress",
    ],
    civilizationalRole:
      "Society holds together because some people hold the line. This structure is the baseline others lean on—the reliability that makes risk and innovation possible for everyone else.",
    integrationInsight:
      "Friction eases when your role explicitly values steadiness and clear expectations. Look for contexts where restoring order is named as the job; avoid places that treat stability as a lack of ambition or drive.",
  },
  Duplicaris: {
    structuralFunction:
      "This structure holds more than one perspective at once and reflects whoever is in the room. It mediates, translates, and sits in the tension between options instead of closing it too soon. It contributes most when the job is to bridge, not to own a single fixed take.",
    contributionEnvironments: [
      "Negotiation, diplomacy, and getting different groups to work together",
      "Translation, editing, and roles that sit between disciplines or languages",
      "Work that depends on a real partner or a sounding board",
      "Places that need someone who can mirror the room instead of one strong voice",
    ],
    frictionEnvironments: [
      "Contexts that demand one clear position, one brand, one story",
      "Solo roles with no partner and no one to reflect you back",
      "Places that treat reflection and flexibility as having no core",
    ],
    civilizationalRole:
      "Coordination happens because someone can hold more than one view without collapsing. This structure makes agreement possible, carries meaning across boundaries, and turns 'both sides' into something workable.",
    integrationInsight:
      "Friction eases when partnership or mediation is part of the job description. Look for roles where reflecting and holding both sides is the deliverable; avoid contexts that require a single, unchanging persona.",
  },
  Tenebris: {
    structuralFunction:
      "This structure works in depth and does best with less stimulus. It holds onto what gets lost in bright, noisy, high-speed settings and surfaces clarity after it has had time to absorb. The contribution is in what emerges when the field is quiet.",
    contributionEnvironments: [
      "Research, analysis, and problems that need long cycles, not quick wins",
      "Creative work that depends on solitude and sustained focus",
      "Labs, archives, night shifts, and roles in controlled or low-stimulus settings",
      "Places that reward insight and depth over speed and visibility",
    ],
    frictionEnvironments: [
      "Open-plan, high-stimulus, always-on offices and roles",
      "Jobs that demand constant presence and instant response",
      "Contexts where contribution is measured by how much you are seen",
    ],
    civilizationalRole:
      "What would otherwise be lost is kept because someone can work in the quiet. This structure holds depth and nuance and the kind of insight that only appears when the field is not shouting.",
    integrationInsight:
      "Friction eases when the setting allows controlled input and real recovery time. Look for roles that value depth and permit retreat; avoid setups that tie contribution to being constantly visible.",
  },
  Radiantis: {
    structuralFunction:
      "This structure amplifies and clarifies. It takes in what is there and gives it back in a form others can use—making the next step visible, opening doors, and turning possibility into something people can act on. It favors clarity and expansion over staying contained.",
    contributionEnvironments: [
      "Communication, teaching, and explaining things so others get it",
      "Roles that literally or figuratively open doors for others",
      "Places that reward being clear and warm, not cryptic",
      "Settings where possibility has to be shown before anyone can move",
    ],
    frictionEnvironments: [
      "Contexts that require long-term containment, secrecy, or holding back",
      "Roles that reward obscurity, spin, or strategic vagueness",
      "Places that punish visibility or treat clarity as too much",
    ],
    civilizationalRole:
      "Progress spreads when someone makes the next step visible. This structure turns insight into shared light so that others can actually move.",
    integrationInsight:
      "Friction eases when the setting wants things opened and clarified. Look for roles where illumination is the job; avoid contexts that ask you to stay dim or hold back what you see.",
  },
  Precisura: {
    structuralFunction:
      "This structure reduces error and holds the standard. It calibrates, measures, and corrects so that outputs are reliable and repeatable. It works best when exactness is the point, not approximation or 'close enough.'",
    contributionEnvironments: [
      "Engineering, finance, law, and any role where the output must be exact",
      "Standards, calibration, and quality control",
      "Spec-driven work, contracts, and making requirements unambiguous",
      "Places where small errors add up and have to be prevented",
    ],
    frictionEnvironments: [
      "Vague or constantly shifting briefs with no clear spec",
      "Roles that reward 'good enough' or political flexibility over getting it right",
      "Contexts that treat precision as nitpicking or as blocking progress",
    ],
    civilizationalRole:
      "Large-scale coordination and trust depend on repeatable standards. This structure supplies the precision that makes that possible—the person who catches what would otherwise compound.",
    integrationInsight:
      "Friction eases when the setting names precision as the goal. Look for roles where accuracy is the product; avoid contexts that treat exactness as optional or as something to work around.",
  },
  Aequilibris: {
    structuralFunction:
      "This structure balances competing forces and looks for fair distribution. It sits between sides, weighs options, and resists tipping toward one pole. It contributes when the job is to hold the center, not to pick a side and run.",
    contributionEnvironments: [
      "Mediation, arbitration, and resolving conflict without one side winning all",
      "Policy, governance, and roles that require fairness across stakeholders",
      "Allocating scarce resources and setting priorities that multiple parties can live with",
      "Places that reward even-handedness and proportion, not advocacy",
    ],
    frictionEnvironments: [
      "Contexts that demand a quick or public commitment to one side",
      "Roles that reward partisan advocacy and clear allegiance",
      "Places that read balance as indecision or lack of backbone",
    ],
    civilizationalRole:
      "Systems that serve more than one interest persist because someone holds the center. This structure makes compromise and allocation possible—the person who keeps the scale from tipping.",
    integrationInsight:
      "Friction eases when the setting explicitly values balance and proportion. Look for roles where fairness is the mandate; avoid contexts that require you to advocate one side only.",
  },
  Obscurion: {
    structuralFunction:
      "This structure preserves ambiguity and rewards sustained attention. It does not rush to name or close; it holds space for what is half-glimpsed and resists turning it into a sound bite. The contribution is in what stays open.",
    contributionEnvironments: [
      "Art, curation, and roles that reward layered or multiple meanings",
      "Strategy and situations where naming too soon is costly",
      "Roles that require reading between the lines and sitting with uncertainty",
      "Places that value suggestion and reserve over full disclosure",
    ],
    frictionEnvironments: [
      "Contexts that demand immediate, literal answers and full transparency",
      "Roles that reward explaining everything all the time",
      "Places that read reserve as evasion or deliberate opacity",
    ],
    civilizationalRole:
      "There is room for the unspoken because someone holds it. This structure protects nuance, strategic ambiguity, and the value of what is not yet ready to be said.",
    integrationInsight:
      "Friction eases when the setting tolerates or values ambiguity. Look for roles where suggestion and depth are assets; avoid contexts that treat clarity as saying everything at once.",
  },
  Vectoris: {
    structuralFunction:
      "This structure orients toward a target and holds direction. It cuts tangents, reduces drift, and moves in one bearing until the thing is done. It contributes most when there is a clear endpoint and when finishing matters more than exploring every side path.",
    contributionEnvironments: [
      "Project leadership, delivery, and goal-directed execution",
      "Sales, advocacy, and roles that require sustained direction over time",
      "Settings with clear endpoints and progress that can be measured",
      "Places that reward finishing and shipping over endless exploration",
    ],
    frictionEnvironments: [
      "Open-ended exploration with no defined outcome or deadline",
      "Roles that require constant pivoting or many parallel tracks",
      "Contexts that treat focus as narrowness or inflexibility",
    ],
    civilizationalRole:
      "Goals get reached because someone holds the vector. This structure turns intention into trajectory and keeps momentum when others scatter.",
    integrationInsight:
      "Friction eases when the setting has a clear target and rewards forward motion. Look for roles with defined outcomes; avoid contexts that punish single-direction focus.",
  },
  Structoris: {
    structuralFunction:
      "This structure creates and holds the scaffolding others work inside. It breaks complexity into steps, draws boundaries, and builds repeatable forms so that many people can contribute without colliding. It favors order and reliability over improvising on the fly.",
    contributionEnvironments: [
      "Architecture, systems design, and defining how organizations or products are built",
      "Process design, templates, and roles that create frameworks others can reuse",
      "Scaling environments that need clear structure before they can grow",
      "Contexts where chaos has to be made navigable before work can happen",
    ],
    frictionEnvironments: [
      "Fluid or anti-structure cultures that resist formalization",
      "Roles that reward constant improvisation with no fixed form",
      "Places that treat structure as bureaucracy or as something to resist",
    ],
    civilizationalRole:
      "Scale happens because someone provides the frame. This structure supplies the architecture that lets many people work in parallel without collapsing into chaos.",
    integrationInsight:
      "Friction eases when the setting is ready for structure and names it as valuable. Look for roles where building frameworks is the deliverable; avoid contexts that equate structure with rigidity or treat it with distrust.",
  },
  Innovaris: {
    structuralFunction:
      "This structure breaks existing frames and introduces new variables. It questions defaults, prototypes alternatives, and shifts the field instead of preserving it. It contributes when the job is to change the game, not to run the same one better.",
    contributionEnvironments: [
      "R&D, innovation labs, and roles that reward first moves and experiments",
      "Change management and contexts that need a deliberate break in pattern",
      "Entrepreneurship and roles that create new systems from scratch",
      "Places that tolerate failure in exchange for novelty and learning",
    ],
    frictionEnvironments: [
      "Stable, legacy systems that punish deviation and protect the status quo",
      "Roles that require strict adherence to existing process",
      "Contexts that treat innovation as threat or distraction",
    ],
    civilizationalRole:
      "Adaptation happens because someone changes the rules. This structure supplies the break in continuity that allows new solutions to emerge when the old ones are stuck.",
    integrationInsight:
      "Friction eases when the setting explicitly seeks change. Look for roles where novelty is the mandate; avoid contexts that reward only preservation of the current form.",
  },
  Fluxionis: {
    structuralFunction:
      "This structure adapts to the field in real time. It flows with input, shifts shape, and keeps coherence through change rather than by resisting it. It contributes when the job is to meet the moment, not to stick to a fixed script.",
    contributionEnvironments: [
      "Roles that require constant adaptation to people or conditions",
      "Improvisation, facilitation, and real-time coordination",
      "Environments where requirements shift often and plans are provisional",
      "Places that reward meeting the moment over sticking to the plan",
    ],
    frictionEnvironments: [
      "Rigid hierarchies with fixed roles and scripts",
      "Roles that reward one unchanging position or a fixed brand",
      "Contexts that read flow as lack of commitment or spine",
    ],
    civilizationalRole:
      "Systems absorb shock because someone can bend without breaking. This structure provides the flexibility that lets groups persist through change instead of snapping.",
    integrationInsight:
      "Friction eases when the setting values adaptation. Look for roles where responsiveness is the job; avoid contexts that demand a single, fixed version of you.",
  },
};

/** All 12 archetypes that have civilizational function entries. */
export const CIVILIZATIONAL_FUNCTION_ARCHETYPES = LIGS_ARCHETYPES;

/** Returns the canonical civilizational function entry for a given archetype. */
export function getCivilizationalFunction(archetype: LigsArchetype): CivilizationalFunctionEntry {
  const entry = CIVILIZATIONAL_FUNCTION_MAP[archetype];
  if (!entry) {
    throw new Error(`No civilizational function entry for archetype: ${archetype}`);
  }
  return entry;
}

/** True if the given string is a known LigsArchetype with civilizational function data. */
export function hasCivilizationalFunction(archetype: string): archetype is LigsArchetype {
  return CIVILIZATIONAL_FUNCTION_ARCHETYPES.includes(archetype as LigsArchetype);
}
