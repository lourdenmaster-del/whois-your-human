/**
 * LIGS Voice Profile module – schema, validation, normalization.
 */

export {
  VoiceProfileSchema,
  LigsArchetypeEnum,
  ChannelEnum,
  parseVoiceProfile,
  safeParseVoiceProfile,
  VoiceCadenceSchema,
  LexiconSchema,
  FormattingSchema,
  ClaimsPolicySchema,
  ChannelAdapterSchema,
} from "./schema";
export type { VoiceProfile, LigsArchetype, Channel } from "./schema";

export { zodToVoiceEngineError, toVoiceEngineError } from "./errors";
export type { VoiceEngineError } from "./errors";

export { normalizeVoiceProfile } from "./normalize";

export {
  buildPromptPack,
  toSystemPrompt,
  buildSelfCheckRubric,
  formatSelfCheckBlock,
  getArchetypeAnchor,
  ARCHETYPE_ANCHORS,
  type PromptPack,
  type ArchetypeAnchor,
  type SelfCheckItem,
} from "./prompt";

export {
  parseGenerateVoiceRequest,
  type GenerateVoiceRequest,
} from "./api";

export {
  getArchetypePhraseBank,
  buildPhraseBankBlock,
  type ArchetypePhraseBank,
} from "./archetypePhraseBank";

export {
  validateVoiceOutput,
  validateBannedWords,
  validateClaims,
  validateCadence,
  validateFormatting,
  validateLexicon,
  validateChannelStructure,
  type VoiceValidationResult,
  type ValidationIssue,
  type ValidateVoiceInput,
} from "./validate";
