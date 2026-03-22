# Paid WHOIS Body Sections — Canon Source Audit (Read-Only)

**Scope:** Identify the canonical source/rule/template for each paid WHOIS body section and whether the current implementation uses it correctly. No code was modified.

---

## 1. IDENTITY ARCHITECTURE

| Item | Finding |
|------|--------|
| **Defined/composed by** | `lib/report-composition.ts`: `composeIdentityArchitectureBody(profile)` → calls `composeArchetypeOpening(profile)`. `composeArchetypeOpening` uses `getArchetypePreviewConfig(arch)` (from `lib/archetype-preview-config.js`), which reads `getArchetypePreviewDescriptor(arch)` from `src/ligs/archetypes/adapters.ts`, which in turn reads `preview.humanExpression` and `displayName` from `src/ligs/archetypes/contract.ts`. |
| **Canonical source** | **Yes.** Canon is the archetype contract: `src/ligs/archetypes/contract.ts` — per-archetype `preview.humanExpression` (e.g. "The Architect" for Structoris) and display name. Exposed via `lib/archetype-preview-config.js` → `getArchetypePreviewConfig(archetype)`. |
| **Template in code** | `lib/report-composition.ts` line 52: `This identity operates as the ${humanExpression} within the ${displayName} regime.` |
| **Using canon correctly?** | **No.** Canon values are used, but the template produces malformed wording when `humanExpression` already includes the article "The": e.g. Structoris gives `humanExpression: "The Architect"`, so output is *"This identity operates as the **The** Architect within the STRUCTORIS regime."* (duplicate "the"). |
| **Divergence** | The template always prefixes "as the " before `humanExpression`. The contract stores humanExpression with a leading "The" (e.g. "The Architect", "The Anchor"). So the composed sentence has "as the The Architect". |

---

## 2. FIELD CONDITIONS

| Item | Finding |
|------|--------|
| **Defined/composed by** | `lib/report-composition.ts`: `composeFieldConditionsBody(profile)`. Uses (1) first sentence of `getCosmicAnalogue(arch).description` from `src/ligs/cosmology/cosmicAnalogues.ts`, or (2) `getArchetypePhraseBank(arch).behavioralTells[0]` from `src/ligs/voice/archetypePhraseBank.ts` wrapped as "The field at rest exhibits tendencies that in practice show as: …", or (3) fallback "Classification emerges from field conditions and force structure at the birth event." |
| **Canonical source** | **Partially.** (1) **Cosmic analogues** — `src/ligs/cosmology/cosmicAnalogues.ts`: `COSMIC_ANALOGUES[arch].description` is canonical LIGS text per archetype. (2) **Phrase bank** — `src/ligs/voice/archetypePhraseBank.ts`: `behavioralTells[0]` is canonical. (3) **Sample report** — `lib/sample-report.ts`: `SAMPLE_REPORT_IGNIS.fieldConditions` is canonical only for **Ignispectrum**; it is long-form narrative, not a reusable template for other archetypes. There is **no** single canonical "FIELD CONDITIONS" template string for all archetypes in the repo; the engine-spec defines section intent (2–5: SPECTRAL ORIGIN through DIRECTIONAL FIELD) but not a one-paragraph WHOIS body. |
| **Using canon correctly?** | **Mostly.** For Structoris, `composeFieldConditionsBody` uses the first sentence of `cosmicAnalogues.Structoris.description`: *"Large-scale structure forms a network of filaments connecting nodes."* — which is correct and from canon. When cosmic description is empty, it falls back to phrase bank or the generic line. The generic fallback "Classification emerges from field conditions…" is **not** from a canonical template; it appears in `lib/free-whois-report.ts` (renderer default) and `components/OriginTerminalIntake.jsx` (preview fallback). |
| **Divergence** | None for the case where cosmic.description is used. The only divergence is when neither cosmic nor phrase bank yields content: then invented fallback is used. |

---

## 3. COSMIC TWIN RELATION

| Item | Finding |
|------|--------|
| **Defined/composed by** | `lib/report-composition.ts`: `composeCosmicTwin(profile)`. Uses `getCosmicAnalogue(arch)` from `src/ligs/cosmology/cosmicAnalogues.ts` and `cosmic.lightBehaviorKeywords`. Builds: (1) fixed line "Each identity maps to a cosmic analogue—the same light behavior expressed at a different scale." (2) regime-specific line from keywords: "For this regime, the analogue appears in patterns of [keyword1] and [keyword2]." or "…patterns of [keyword]." or "Subject and twin form a relational mirror." |
| **Canonical source** | **Yes.** `src/ligs/cosmology/cosmicAnalogues.ts`: `COSMIC_ANALOGUES` (phenomenon, description, lightBehaviorKeywords) is the canonical LIGS source. |
| **Using canon correctly?** | **Yes.** Composed text is built from cosmic analogue keywords and the fixed conceptual line. Paid WHOIS uses this composed output when parsed s11 is absent. |
| **Divergence** | None. |

---

## 4. ARCHETYPE EXPRESSION

| Item | Finding |
|------|--------|
| **Defined/composed by** | `lib/report-composition.ts`: `composeArchetypeSummary(profile)`. Uses `getArchetypePhraseBank(arch)` from `src/ligs/voice/archetypePhraseBank.ts`: `behavioralTells[0]` → "In practice, you tend to [tell]." and `relationalTells[0]` → one sentence. |
| **Canonical source** | **Yes.** `src/ligs/voice/archetypePhraseBank.ts`: per-archetype `behavioralTells` and `relationalTells` are the canonical LIGS phrase bank. |
| **Using canon correctly?** | **Yes.** Paid WHOIS output for Structoris ("In practice, you tend to break tasks into steps before starting. People rely on you for order.") matches phrase bank Structoris.behavioralTells[0] and relationalTells[0]. |
| **Divergence** | None. |

---

## 5. INTERPRETIVE NOTES

| Item | Finding |
|------|--------|
| **Defined/composed by** | No composition function. Set only from parsed `full_report` sections 12–14 (`parseSectionRange(fullReport, 12, 14)`) in `lib/free-whois-report.ts` buildPaidWhoisReport. Renderer fallback (when body is empty): "Interpretive notes are held on the registry node; this extract contains the fields cleared for release." in `lib/free-whois-report.ts` (HTML and text renderer). |
| **Canonical source** | **No reusable canon in repo.** Engine-spec (`lib/engine-spec.ts`) defines section 12–14 intent (IDENTITY FIELD EQUATION, LEGACY TRAJECTORY, INTEGRATION) but does not provide a canonical paragraph for "INTERPRETIVE NOTES" as a single WHOIS block. The fallback string is hardcoded in the renderer; there is no phrase bank or contract entry for it. |
| **Using canon correctly?** | N/A — no canon. For dry-run, parsed body is skipped so the renderer fallback is used. |
| **Divergence** | N/A. |

---

## A. What is the canonical source for FIELD CONDITIONS?

**Actual existing source in the repo:**

1. **Per-archetype physics text:** `src/ligs/cosmology/cosmicAnalogues.ts` — `COSMIC_ANALOGUES[archetype].description`. Used by `composeFieldConditionsBody` as the first sentence when present (e.g. Structoris: "Large-scale structure forms a network of filaments connecting nodes. Gas flows along filaments into halos; …" — first sentence is used).
2. **Per-archetype behavioral line:** `src/ligs/voice/archetypePhraseBank.ts` — `behavioralTells[0]`, wrapped by `composeFieldConditionsBody` as "The field at rest exhibits tendencies that in practice show as: [tell]."
3. **Ignispectrum-only long-form:** `lib/sample-report.ts` — `SAMPLE_REPORT_IGNIS.fieldConditions`. Canonical only for the Ignis exemplar; not a generic template for other archetypes.

There is no single "FIELD CONDITIONS" template string that applies to all archetypes. The canonical sources for composed FIELD CONDITIONS are (1) cosmic analogue description and (2) phrase bank behavioral tell, as implemented in `composeFieldConditionsBody`.

---

## B. What is the canonical source for ARCHETYPE EXPRESSION?

**Actual existing source in the repo:**

- **`src/ligs/voice/archetypePhraseBank.ts`** — per-archetype `behavioralTells` and `relationalTells`. The paid WHOIS body is composed by `composeArchetypeSummary(profile)` in `lib/report-composition.ts`, which reads `phraseBank.behavioralTells[0]` and `phraseBank.relationalTells[0]` and formats them as "In practice, you tend to [behavioral]." and "[Relational]." So the canonical source for ARCHETYPE EXPRESSION is the archetype phrase bank; the current paid WHOIS output is using it correctly.

---

## C. Is IDENTITY ARCHITECTURE currently being composed from the wrong template string ("This identity operates as the The Architect...")?

**Yes.** The malformed wording comes from:

1. **Template:** `lib/report-composition.ts` line 52:
   ```ts
   return [`This identity operates as the ${humanExpression} within the ${displayName} regime.`];
   ```
   So the string is literally `"This identity operates as the " + humanExpression + " within the " + displayName + " regime."`

2. **Canonical value:** `src/ligs/archetypes/contract.ts` — Structoris (and others) define `preview.humanExpression` **with** the article, e.g. Structoris line 739: `humanExpression: "The Architect"`. So `humanExpression` is `"The Architect"`.

3. **Result:** The sentence becomes *"This identity operates as the The Architect within the STRUCTORIS regime."* — duplicate "the". The template assumes `humanExpression` is a bare role (e.g. "Architect") and adds "the"; the contract supplies a titled form ("The Architect"), so the template is wrong for the current canon.

**Exact location of the malformed wording:** The string is **composed** in `lib/report-composition.ts` in `composeArchetypeOpening`, line 52. The **canonical** value that leads to "The Architect" is `src/ligs/archetypes/contract.ts` Structoris.preview.humanExpression (line 739).

---

## D. Safest fix so paid WHOIS body sections pull from existing canon

1. **IDENTITY ARCHITECTURE (fix malformed "the the"):**
   - **Option A (recommended):** In `lib/report-composition.ts` `composeArchetypeOpening`, do not add "the" before `humanExpression`. Use: `This identity operates as ${humanExpression} within the ${displayName} regime.` so that when canon gives "The Architect" the sentence is "This identity operates as The Architect within the STRUCTORIS regime." (Or normalize: if `humanExpression` starts with "The ", use "as " + humanExpression; else use "as the " + humanExpression.)
   - **Option B:** Change the contract so `humanExpression` is the bare form (e.g. "Architect") and keep "as the " in the template. That would require updating every archetype in `contract.ts` and any consumer that expects "The X".

2. **FIELD CONDITIONS:** Already using canon (cosmic description first sentence, or phrase bank). No change needed except to avoid the generic fallback when possible (e.g. ensure cosmic.description is always present for known archetypes).

3. **COSMIC TWIN RELATION:** Already using canon. No change.

4. **ARCHETYPE EXPRESSION:** Already using canon (phrase bank). No change.

5. **INTERPRETIVE NOTES:** No canon exists; either keep the current renderer fallback for dry-run or introduce a single canonical sentence in a shared constant/spec used only when parsed s12–14 is absent.

**Concrete minimal fix:** In `lib/report-composition.ts`, in `composeArchetypeOpening`, change the line that builds the sentence so it does not produce "the The". For example: use `as ${humanExpression.startsWith("The ") ? humanExpression : "the " + humanExpression}` or simply `as ${humanExpression}` so the contract remains the single source of truth and the template does not add an extra article.

---

## Summary table

| Section | Canonical source (file) | Composer / setter | Using canon? | Issue |
|--------|--------------------------|-------------------|--------------|--------|
| IDENTITY ARCHITECTURE | `src/ligs/archetypes/contract.ts` (preview.humanExpression, displayName) via `lib/archetype-preview-config.js` | `composeIdentityArchitectureBody` → `composeArchetypeOpening` | No (template bug) | Template adds "the " before humanExpression; contract has "The Architect" → "the The Architect". |
| FIELD CONDITIONS | `src/ligs/cosmology/cosmicAnalogues.ts` (description) and `src/ligs/voice/archetypePhraseBank.ts` (behavioralTells) | `composeFieldConditionsBody` | Yes (for Structoris: cosmic first sentence) | Generic fallback when neither source used. |
| COSMIC TWIN RELATION | `src/ligs/cosmology/cosmicAnalogues.ts` (lightBehaviorKeywords, phenomenon) | `composeCosmicTwin` | Yes | — |
| ARCHETYPE EXPRESSION | `src/ligs/voice/archetypePhraseBank.ts` (behavioralTells, relationalTells) | `composeArchetypeSummary` | Yes | — |
| INTERPRETIVE NOTES | None (engine sections 12–14 content or renderer fallback) | Parsed full_report only; no composer | N/A | No canon in repo. |
