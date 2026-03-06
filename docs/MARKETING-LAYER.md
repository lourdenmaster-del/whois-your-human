# Marketing Layer

The marketing layer provides archetype-driven marketing descriptors and visuals. It is distinct from the core style engine but aligned with it through the same LIGS archetypes.

## Contrast Delta

**contrastDelta** (0–1) is a parameter that slightly increases clarity and energy for the marketing surface versus the base archetype style. It does not change the archetype identity.

- **0**: Pure base style (no lift).
- **0.15** (default): Slight lift so marketing reads as a "controlled surface" separate from core output.
- **0.5+**: Noticeable clarity/energy boost for hero headers and CTAs.

Marketing visuals (logo mark, header background) are generated with this delta so they feel custom and premium but clearly distinct from the core Light Identity outputs.

## Flow

1. **Descriptor** (`lib/marketing/descriptor.ts`): Deterministic mapping archetype → label, tagline, hitPoints, CTA. Extensible for future LLM-generated copy.
2. **Prompts** (`lib/marketing/prompts.ts`): `buildMarketingImagePrompts(archetype, { contrastDelta })` produces prompts for logo mark and marketing header background.
3. **API** (`POST /api/marketing/generate`): Accepts `{ primary_archetype, variationKey?, contrastDelta? }`, returns `{ descriptor, assets }`.
4. **UI** (`MarketingHeader`): Displays logo mark, archetype label, tagline, hit points, CTA. Uses `marketingBackground` when available. Degrades gracefully when assets are missing.
