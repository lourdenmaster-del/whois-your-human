export {
  type LigsArchetype,
  type ArchetypeContract,
  type ArchetypeContractMap,
  type ArchetypeVoice,
  type ArchetypeVisual,
  type ArchetypeMarketingDescriptor,
  type ArchetypeMarketingVisuals,
  type ArchetypeCopyPhrases,
  LIGS_ARCHETYPES,
  NEUTRAL_FALLBACK,
  ARCHETYPE_CONTRACT_MAP,
  getArchetypeContract,
  getArchetypeOrFallback,
} from "./contract";

export {
  validateArchetype,
  validateAllArchetypes,
  allArchetypesValid,
  type ArchetypeValidationResult,
} from "./validateArchetypeContract";

export {
  getArchetypeVisualMapShape,
  getArchetypeVoiceAnchorShape,
  getMarketingDescriptor,
  getOverlayCopyBank,
  getMarketingVisuals,
  getVisualMapRecord,
  getVoiceAnchorRecord,
  getOverlayCopyRecord,
  getVisualParamsOrFallback,
} from "./adapters";
