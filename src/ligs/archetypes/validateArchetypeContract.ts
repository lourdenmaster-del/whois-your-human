/**
 * Archetype Contract Validator
 *
 * Development-only utility to confirm each archetype satisfies the contract.
 * Does NOT change runtime engine behavior. Use during archetype generation.
 */

import type { LigsArchetype } from "../voice/schema";
import { LIGS_ARCHETYPES } from "./contract";
import { getArchetypeOrFallback } from "./contract";
import { getCosmicAnalogue } from "../cosmology/cosmicAnalogues";
import { getSolarSeasonForArchetype } from "../astronomy/solarSeason";
import { getArchetypePhraseBank } from "../voice/archetypePhraseBank";

export interface ArchetypeValidationResult {
  archetype: LigsArchetype;
  ok: boolean;
  errors: string[];
}

/** Minimum phrase counts for phrase bank arrays */
const MIN_SENSORY = 2;
const MIN_BEHAVIORAL = 2;
const MIN_RELATIONAL = 2;
const MIN_SHADOW = 1;
const MIN_RESET = 1;
const MIN_HIT_POINTS = 2;
const MIN_HEADLINES = 1;
const MIN_SUBHEADS = 1;
const MIN_CTAS = 1;
const MIN_DISCLAIMERS = 1;

/**
 * Validate a single archetype against the contract.
 * Returns { ok, errors } — does not throw.
 */
export function validateArchetype(archetype: LigsArchetype): ArchetypeValidationResult {
  const errors: string[] = [];

  // 1. Solar season exists
  const season = getSolarSeasonForArchetype(archetype);
  if (!season) {
    errors.push("Missing SOLAR_SEASONS entry");
  } else {
    if (season.archetype !== archetype) {
      errors.push(`SOLAR_SEASONS archetype mismatch: expected ${archetype}, got ${season.archetype}`);
    }
  }

  // 2. Cosmic analogue exists
  const cosmic = getCosmicAnalogue(archetype);
  if (!cosmic?.phenomenon?.trim()) {
    errors.push("Missing or empty cosmic analogue phenomenon");
  }
  if (!cosmic?.description?.trim()) {
    errors.push("Missing or empty cosmic analogue description");
  }
  if (!cosmic?.lightBehaviorKeywords?.length) {
    errors.push("Missing or empty cosmic analogue lightBehaviorKeywords");
  }

  // 3. Phrase bank arrays populated
  const phraseBank = getArchetypePhraseBank(archetype);
  if (!phraseBank) {
    errors.push("Missing phrase bank");
  } else {
    const sm = phraseBank.sensoryMetaphors;
    const bt = phraseBank.behavioralTells;
    const rt = phraseBank.relationalTells;
    const sd = phraseBank.shadowDrift;
    const rm = phraseBank.resetMoves;
    if (!sm?.length || sm.length < MIN_SENSORY) errors.push(`sensoryMetaphors: need ≥${MIN_SENSORY}, got ${sm?.length ?? 0}`);
    if (!bt?.length || bt.length < MIN_BEHAVIORAL) errors.push(`behavioralTells: need ≥${MIN_BEHAVIORAL}, got ${bt?.length ?? 0}`);
    if (!rt?.length || rt.length < MIN_RELATIONAL) errors.push(`relationalTells: need ≥${MIN_RELATIONAL}, got ${rt?.length ?? 0}`);
    if (!sd?.length || sd.length < MIN_SHADOW) errors.push(`shadowDrift: need ≥${MIN_SHADOW}, got ${sd?.length ?? 0}`);
    if (!rm?.length || rm.length < MIN_RESET) errors.push(`resetMoves: need ≥${MIN_RESET}, got ${rm?.length ?? 0}`);
  }

  // 4. Marketing descriptor present
  const contract = getArchetypeOrFallback(archetype);
  const md = contract.marketingDescriptor;
  if (!md?.archetypeLabel?.trim()) errors.push("Missing marketingDescriptor.archetypeLabel");
  if (!md?.tagline?.trim()) errors.push("Missing marketingDescriptor.tagline");
  const hitPoints = md?.hitPoints ?? [];
  if (hitPoints.length < MIN_HIT_POINTS) errors.push(`marketingDescriptor.hitPoints: need ≥${MIN_HIT_POINTS}, got ${hitPoints.length}`);
  if (!md?.ctaText?.trim()) errors.push("Missing marketingDescriptor.ctaText");

  // 5. Visual palette defined
  const visual = contract.visual;
  if (!visual?.palette?.length) {
    errors.push("Missing or empty visual.palette");
  }

  // 6. Copy phrases
  const cp = contract.copyPhrases;
  const headlines = cp?.headlines ?? [];
  const subheads = cp?.subheads ?? [];
  const ctas = cp?.ctas ?? [];
  const disclaimers = cp?.disclaimers ?? [];
  if (headlines.length < MIN_HEADLINES) errors.push(`copyPhrases.headlines: need ≥${MIN_HEADLINES}, got ${headlines.length}`);
  if (subheads.length < MIN_SUBHEADS) errors.push(`copyPhrases.subheads: need ≥${MIN_SUBHEADS}, got ${subheads.length}`);
  if (ctas.length < MIN_CTAS) errors.push(`copyPhrases.ctas: need ≥${MIN_CTAS}, got ${ctas.length}`);
  if (disclaimers.length < MIN_DISCLAIMERS) errors.push(`copyPhrases.disclaimers: need ≥${MIN_DISCLAIMERS}, got ${disclaimers.length}`);

  return {
    archetype,
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Validate all 12 archetypes.
 * Returns array of results; use for development checklist.
 */
export function validateAllArchetypes(): ArchetypeValidationResult[] {
  return LIGS_ARCHETYPES.map((arch) => validateArchetype(arch));
}

/**
 * Returns true if all archetypes pass validation.
 */
export function allArchetypesValid(): boolean {
  const results = validateAllArchetypes();
  return results.every((r) => r.ok);
}
