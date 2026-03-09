export {
  MarketingOverlaySpecSchema,
  parseMarketingOverlaySpec,
  safeParseMarketingOverlaySpec,
  getLogoStyleWithDefaults,
  type MarketingOverlaySpec,
  type LogoStyle,
} from "./schema";

export {
  getTemplate,
  type TemplatePlacement,
  type TemplateId,
  type AspectRatio,
} from "./templates";

export {
  buildOverlayPromptPack,
  toOverlaySystemPrompt,
  type OverlayPromptPack,
  type BuildOverlayPromptPackOptions,
} from "./buildOverlayPromptPack";

export {
  generateOverlaySpec,
  buildOverlaySpecWithCopy,
  type GenerateOverlaySpecOptions,
  type BuildOverlaySpecWithCopyOptions,
} from "./generateOverlaySpec";

export {
  validateOverlaySpec,
  type OverlaySpecValidationResult,
  type OverlaySpecIssue,
} from "./validateOverlaySpec";

export {
  buildIdentityOverlaySpec,
  generateLirId,
  IDENTITY_TEMPLATE_ID,
  type IdentityOverlaySpec,
  type IdentityTemplateId,
  type BuildIdentityOverlaySpecInput,
} from "./identity-spec";
