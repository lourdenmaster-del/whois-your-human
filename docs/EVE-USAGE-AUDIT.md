# E.V.E. Usage Audit — WHOIS / LIGS System

**Date:** 2026-03-19  
**Mode:** Read-only. No code changes.

---

## A. E.V.E. Usage Map

| Function/Component | File | Used By | Role |
|--------------------|------|---------|------|
| **EVE_FILTER_SPEC** | lib/eve-spec.ts | app/api/engine/route.ts | System prompt for E.V.E. OpenAI call. Instructs model to extract Beauty-Only Profile from full_report. |
| **extractArchetypeFromReport** | lib/eve-spec.ts | app/api/engine/route.ts | Parses "Dominant: X" or first archetype from report text. Used ONLY for canonicalArchetype fallback when sunLonDeg missing. E.V.E. prompt now uses canonicalArchetype (solar when available). |
| **buildArchetypeVoiceBlock** | lib/eve-spec.ts | app/api/engine/route.ts | Builds archetype voice params for E.V.E. prompt. Injected into user message. |
| **buildArchetypePhraseBankBlock** | lib/eve-spec.ts | app/api/engine/route.ts | Builds phrase bank block for E.V.E. prompt. Injected into user message. |
| **buildBeautyProfile** | lib/eve-spec.ts | app/api/engine/route.ts | Turns E.V.E. filter JSON output + vector_zero into BeautyProfile (vector_zero, light_signature, archetype, deviations, corrective_vector, imagery_prompts). |
| **buildCondensedFullReport** | lib/eve-spec.ts | app/api/engine/route.ts | Formats BeautyProfile into user-facing fullReport string (4 sections + Key Moves). Uses beautyProfile sections + archetype phrase bank. |
| **threeVoiceFrom** | lib/eve-spec.ts | buildBeautyProfile (internal) | Parses raw_signal/custodian/oracle from filter output. |
| **BeautyProfile type** | lib/eve-spec.ts | lib/beauty-profile-schema.ts, lib/report-store.ts | Type for E.V.E. output shape. |

---

## B. Path Dependency Table

| Route | Uses E.V.E.? | How |
|-------|--------------|-----|
| **POST /api/engine** | **Yes** | Core path. Fetches full_report from StoredReport → OpenAI E.V.E. call (EVE_FILTER_SPEC) → buildBeautyProfile(filterOutput) → buildCondensedFullReport(beautyProfile) → saveBeautyProfileV1. E.V.E. output drives: profile.fullReport, imagery_prompts, vector_zero, light_signature, archetype, deviations, corrective_vector. |
| **POST /api/engine/generate** | **No** | Produces full_report (LLM or buildDryRunReportFromContext). Does not call E.V.E. |
| **POST /api/beauty/submit** | **Yes** (indirect) | Forwards to POST /api/engine. E.V.E. runs server-side. |
| **POST /api/beauty/dry-run** | **No** | Calls POST /api/engine/generate only. Builds buildDryRunBeautyProfileV1 with synthetic placeholder data. No E.V.E. LLM call. |
| **POST /api/beauty/create** | **Yes** (indirect) | Forwards to POST /api/engine. |
| **GET /api/beauty/[reportId]** | **No** (reads only) | Loads BeautyProfileV1 from Blob. profile.fullReport was produced by E.V.E. path when profile was saved. Exemplars use buildExemplarFullReport (no E.V.E.). |
| **buildPaidWhoisReport** | **No** | Uses storedReport.full_report (raw engine report) for parseSectionBody. Identity from profile.solarSeasonProfile / profile.dominantArchetype. Does not use E.V.E. output. |
| **GET /api/agent/whois** | **No** | Reads profile (dominantArchetype, solarSeasonProfile). Does not call extractArchetypeFromReport or E.V.E. |

---

## C. Classification

| Component | Classification | Reason |
|-----------|----------------|--------|
| **E.V.E. LLM call** (OpenAI with EVE_FILTER_SPEC) | **Critical** | Required for live paid flow. Produces beautyProfile (light_signature, archetype, deviations, corrective_vector, imagery_prompts). Without it: no profile sections, no image prompts, no buildCondensedFullReport input. |
| **buildBeautyProfile** | **Critical** | Converts E.V.E. filter output to BeautyProfile. Only caller: engine route. |
| **buildCondensedFullReport** | **Critical** | Produces profile.fullReport for display. Only called with E.V.E. output (beautyProfile). Exemplars use buildExemplarFullReport instead. |
| **extractArchetypeFromReport** | **Secondary** | Used for: (1) E.V.E. prompt (archetypeVoiceBlock, phraseBankBlock); (2) canonicalArchetype fallback when sunLonDeg missing. Identity now prefers solar; extractArchetypeFromReport is fallback only. Could be replaced by solar-only when birth context always has sunLonDeg. |
| **buildArchetypeVoiceBlock** | **Secondary** | E.V.E. prompt injection. Improves E.V.E. output quality. Not required for schema; E.V.E. could run without it (weaker output). |
| **buildArchetypePhraseBankBlock** | **Secondary** | E.V.E. prompt injection. Same as above. |
| **EVE_FILTER_SPEC** | **Critical** | Defines E.V.E. behavior. Required for E.V.E. call. |

---

## D. Removal Feasibility

### Can E.V.E. be removed entirely?

**No.** The live paid flow (POST /api/engine, POST /api/beauty/submit) depends on E.V.E. to produce:

1. **beautyProfile** (light_signature, archetype, deviations, corrective_vector, imagery_prompts) — required for buildCondensedFullReport and image generation
2. **profile.fullReport** — displayed in FullReportAccordion, PayUnlockButton preview (when from live path)
3. **imagery_prompts** — used for DALL·E signature images

**What would need to replace it:**

- A different extraction/transformation step that produces the same BeautyProfile shape from full_report. Options: (a) deterministic parsing of full_report sections; (b) a different LLM prompt/spec; (c) pre-computed templates keyed by archetype (would lose report-specific nuance).

### Can only archetype extraction be removed?

**Partial.** extractArchetypeFromReport is already secondary:

- **dominantArchetype** in profile: now uses solarSeasonProfile.archetype when sunLonDeg present; extractArchetypeFromReport only when sunLonDeg missing.
- **E.V.E. prompt**: still uses extractArchetypeFromReport for archetypeVoiceBlock and phraseBankBlock. Removing would mean E.V.E. gets no archetype guidance — output may be less aligned. Could substitute solar-derived archetype when available.

### Can only fullReport generation (buildCondensedFullReport) be removed?

**No.** buildCondensedFullReport produces the user-facing fullReport string. FullReportAccordion and profile.fullReport depend on it. Without it, we would need another formatter for the same content, or change the display to use raw full_report (different format).

---

## E. Path Summary: E.V.E. Required vs Not

| Path | E.V.E. Required? |
|------|------------------|
| **Live paid (submit → engine)** | Yes. E.V.E. produces beautyProfile → fullReport, imagery_prompts, profile sections. |
| **Dry-run (beauty/dry-run → engine/generate)** | No. Uses buildDryRunBeautyProfileV1 with placeholder. fullReport from engine/generate raw output. |
| **buildPaidWhoisReport** | No. Uses storedReport.full_report (engine output). Identity from profile. |
| **Agent whois** | No. Reads profile fields. |
| **Exemplar profiles** | No. buildExemplarFullReport, buildExemplarSyntheticSections. |

---

## F. Risk Analysis

### If E.V.E. is removed entirely

| Breaks | Severity |
|--------|----------|
| Live paid flow (POST /api/engine, beauty/submit) | **Critical** — No beautyProfile, no saveBeautyProfileV1, no imagery_prompts |
| FullReportAccordion for live reports | **Critical** — No profile.fullReport |
| Image generation (3 signatures) | **Critical** — No prompts from beautyProfile.imagery_prompts |
| Marketing card / share card (archetype-based) | **High** — Uses canonicalArchetype (solar/fallback), not E.V.E.; would still work |

### If only archetype extraction (extractArchetypeFromReport) is removed

| Breaks | Severity |
|--------|----------|
| E.V.E. prompt (voice/phrase bank) | **Medium** — E.V.E. would run without archetype guidance; output may be generic |
| dominantArchetype when sunLonDeg missing | **Medium** — Would need another fallback (e.g. FALLBACK_PRIMARY_ARCHETYPE) |

### If only fullReport generation (buildCondensedFullReport) is removed

| Breaks | Severity |
|--------|----------|
| profile.fullReport | **Critical** — FullReportAccordion, PayUnlockButton preview would have no formatted report |
| Would need replacement formatter | — |

---

## G. Recommended Next Step

| Option | Recommendation |
|--------|-----------------|
| **Keep** | **Yes.** E.V.E. is actively used in the live paid path. It is not legacy or dead. |
| **Isolate** | Optional. E.V.E. logic is already in lib/eve-spec.ts. Engine route is the only runtime caller. |
| **Replace** | Only if replacing with equivalent extraction (deterministic or alternative LLM). High effort. |
| **Remove** | **No.** Would break live paid flow. |

**Conclusion:** E.V.E. is **production-critical** for the live paid path. Dry-run and WHOIS/agent paths do not call E.V.E., but the BeautyProfile they consume (when from a prior live run) was produced by E.V.E. The only path that invokes E.V.E. is POST /api/engine (and its forwarders beauty/submit, beauty/create). E.V.E. is not legacy or removable without a replacement.
