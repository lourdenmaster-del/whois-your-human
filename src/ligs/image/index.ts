export {
  ImagePromptSpecSchema,
  parseImagePromptSpec,
  safeParseImagePromptSpec,
  type ImagePromptSpec,
} from "./schema";

export { buildImagePromptSpec, type BuildImagePromptSpecOptions } from "./buildImagePromptSpec";
export {
  buildArchetypeVisualVoiceSpec,
  type BuildArchetypeVisualVoiceOptions,
  type ArchetypeVisualVoiceMode,
} from "./buildArchetypeVisualVoice";
export {
  getPrimaryArchetypeFromSolarLongitude,
  resolveSecondaryArchetype,
  buildTriangulatedImagePrompt,
  type SolarProfile,
  type TriangulateMode,
} from "./triangulatePrompt";
export { ARCHETYPE_VISUAL_MAP } from "./archetype-visual-map";

export {
  validateImagePromptSpec,
  type ImagePromptSpecValidationResult,
  type ImagePromptSpecIssue,
} from "./validateImagePromptSpec";

export {
  computeImageCacheKey,
  getCachedResult,
  setCachedResult,
  type CachedImageResult,
} from "./cache";
