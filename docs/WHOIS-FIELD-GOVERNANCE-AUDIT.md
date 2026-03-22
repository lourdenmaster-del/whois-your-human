# WHOIS Field-Governance Audit and Enforcement Plan

**Scope:** Define a no-blanks, no-fake-filler contract for every user-visible field in the final WHOIS report.

**Focus:** `lib/free-whois-report.ts`, renderers, `FreeWhoisReport` interface.

---

## 1. Field Inventory

Every user-visible field in the final rendered report (renderFreeWhoisReport, renderFreeWhoisReportText). renderFreeWhoisCard uses a subset; noted where different.

| # | Field | Rendered Label/Section | Report Type |
|---|-------|------------------------|-------------|
| 1 | registryId | Registry ID | All |
| 2 | registryStatus | Registry Status | All |
| 3 | created_at | Created Date | All |
| 4 | recordAuthority | Record Authority | All |
| 5 | name | Subject Name | All |
| 6 | birthDate | Birth Date | All |
| 7 | birthLocation | Birth Location | All |
| 8 | birthTime | Birth Time | All |
| 9 | solarSignature | Solar Segment / Seasonal Context | All |
| 10 | archetypeClassification | Archetype Classification | All |
| 11 | cosmicAnalogue | Cosmic Twin | All |
| 12 | sunLongitudeDeg | Solar Light Vector | All |
| 13 | solarAnchorType | Solar Anchor Type | All |
| 14 | chronoImprintResolved / birthTime | Chrono-Imprint | All |
| 15 | originCoordinatesDisplay | Origin Coordinates | All |
| 16 | magneticFieldIndexDisplay | Magnetic Field Index | All |
| 17 | climateSignatureDisplay | Climate Signature | All |
| 18 | sensoryFieldConditionsDisplay | Sensory Field Conditions | All |
| 19 | identityArchitectureBody | IDENTITY ARCHITECTURE | Paid full report only |
| 20 | fieldConditionsBody | FIELD CONDITIONS | Paid full report only |
| 21 | cosmicTwinBody | COSMIC TWIN RELATION | Paid full report only |
| 22 | archetypeExpressionBody | ARCHETYPE EXPRESSION | Paid full report only |
| 23 | civilizationalFunctionBody | CIVILIZATIONAL FUNCTION | Paid full report only |
| 24 | interpretiveNotesBody | INTERPRETIVE NOTES | Paid full report only |
| 25 | integrationNoteBody | INTEGRATION NOTE | Paid full report only |
| 26 | vectorZeroAddendumBody | OFFICIAL REGISTRY ADDENDUM — VECTOR ZERO | Paid full report only |
| 27 | artifactImageUrl | (image block) | All (optional) |

---

## 2. Classification Table

| Field | Classification | Source of Truth | Omission Allowed | Placeholder When Missing | Current Violation |
|-------|----------------|-----------------|------------------|--------------------------|-------------------|
| registryId | required | computed | No | — | None |
| registryStatus | required | constant | No | — | None |
| created_at | required | storedReport / now | No | — | None |
| recordAuthority | required | constant | No | — | None |
| name | required | params → profile | No | "—" | "—" is explicit; acceptable |
| birthDate | required | params → profile | No | "—" | "—" is explicit; acceptable |
| birthLocation | required | params → profile | No | "—" | "—" is explicit; acceptable |
| birthTime | required | params → profile | No | "—" | "—" is explicit; acceptable |
| solarSignature | required | profile → date-derived | No | "—" | "—" is explicit; acceptable |
| archetypeClassification | required | profile → date-derived | No | "—" | "—" is explicit; acceptable |
| cosmicAnalogue | required | derived from archetype | No | (from Ignispectrum) | None |
| sunLongitudeDeg | optional | profile → date-derived | Yes | "Limited Access" (render) | None |
| solarAnchorType | optional | profile → date-derived | Yes | "Restricted Node Data" (render) | None |
| chronoImprintResolved | optional | async resolve | Yes | birthTime or "Limited Access" | None |
| originCoordinatesDisplay | optional | birthContext → profile → storedReport | Yes | "Restricted Node Data" (render) | None |
| magneticFieldIndexDisplay | optional | storedReport | Yes | "Restricted Node Data" (render) | None |
| climateSignatureDisplay | optional | storedReport | Yes | "Restricted Node Data" (render) | None |
| sensoryFieldConditionsDisplay | optional | storedReport | Yes | "Restricted Node Data" (render) | None |
| identityArchitectureBody | required (paid) | parse(s1,s2) | No | explicit unavailable | **Fixed:** buildPaidWhoisReport sets "[Identity Architecture section unavailable]". Render fallback "The registry identifies..." still exists as defense-in-depth gap. |
| fieldConditionsBody | required (paid) | field_conditions_context → parse(s2–5) | No | explicit unavailable | **Violation:** Render uses "Classification emerges from field conditions…" when null. Generic prose. |
| cosmicTwinBody | required (paid) | parse(s11) → composeCosmicTwin | No | derived (Cosmic Twin: {cosmicAnalogue}) | Acceptable: derived from report, not generic. |
| archetypeExpressionBody | required (paid) | parse(s6,s7) → composeArchetypeSummary | No | derived (Archetype Classification: {arch}) | Acceptable: derived from report. |
| civilizationalFunctionBody | required (paid) | composeCivilizationalFunctionSection | No | explicit unavailable | **Fixed:** Render uses "[Civilizational Function section unavailable]" when null/empty. |
| interpretiveNotesBody | required (paid) | parse(s12–14) | No | explicit unavailable | **Fixed:** buildPaidWhoisReport sets "[Interpretive Notes section unavailable]". Render fallback "Expanded interpretive sections…" still exists. |
| integrationNoteBody | required (paid) | INTEGRATION_NOTE_DEFAULT | No | always set | None |
| vectorZeroAddendumBody | optional (paid) | vector_zero.three_voice | Yes | explicit unavailable | **Fixed:** Render uses "[Vector Zero addendum unavailable]" when null/empty; no generic prose. |
| artifactImageUrl | optional | caller | Yes | omit block | None |

---

## 3. Violation List

### High: Generic prose impersonates real content

| Field | Current Behavior | Violation |
|-------|------------------|-----------|
| **fieldConditionsBody** | Render: "Classification emerges from field conditions and force structure at the birth event." when null | Generic prose masks parse/source failure |
| **identityArchitectureBody** | Render: "The registry identifies a stable identity structure…" when null | **Mitigated:** buildPaidWhoisReport now sets explicit placeholder. Render fallback is defense-in-depth gap (e.g. report from other builder). |
| **interpretiveNotesBody** | Render: "Expanded interpretive sections ship with the complete registration report." when null | **Mitigated:** Same as identityArchitectureBody. |
| **vectorZeroAddendumBody** | Render: Long "As an early registry participant…" paragraph when null | **Fixed:** Render uses "[Vector Zero addendum unavailable]". |

### Medium: Blank or ambiguous

| Field | Current Behavior | Violation |
|-------|------------------|-----------|
| **civilizationalFunctionBody** | composeCivilizationalFunctionSection returns "" for unknown archetype; render shows empty paragraph | **Fixed:** Render uses "[Civilizational Function section unavailable]". |

### Low / Acceptable

| Field | Current Behavior | Note |
|-------|------------------|------|
| cosmicTwinBody, archetypeExpressionBody | Derived from report (cosmicAnalogue, archetypeClassification) when parse fails | Not generic; uses report identity |
| name, birthDate, etc. | "—" when missing | Explicit placeholder |
| Genesis fields | "Limited Access" / "Restricted Node Data" | Explicit markers |

---

## 4. Minimal Enforcement Plan

### Principle

- **Required field missing:** Render explicit unavailable marker (e.g. `[Section unavailable]`), never generic prose.
- **Optional field missing:** Omit or use explicit marker; never fake filler.
- **Defense in depth:** Render layer should not trust that builders always set required fields; use explicit placeholders when value is null/empty.

### Proposed Changes (narrow scope)

| Priority | Field | Action | Risk |
|----------|-------|--------|------|
| 1 | **fieldConditionsBody** | In buildPaidWhoisReport: when both field_conditions_context and s2to5 are null, set `"[Field Conditions section unavailable]"` and log. | Low |
| 2 | **Render fallbacks** | In renderFreeWhoisReport/renderFreeWhoisReportText: when identityArchitectureBody or interpretiveNotesBody is null/empty, use explicit placeholder instead of generic prose. (Defense in depth.) | Low |
| 3 | **fieldConditionsBody render** | Same: when fieldConditionsBody null/empty, use `"[Field Conditions section unavailable]"` instead of "Classification emerges…". | Low |
| 4 | **civilizationalFunctionBody** | When empty string, render `"[Civilizational Function section unavailable]"` instead of blank. | **Done** |
| 5 | **vectorZeroAddendumBody** | When null/empty, use `"[Vector Zero addendum unavailable]"` instead of long generic paragraph. | **Done** |

### Out of Scope (no change)

- cosmicTwinBody, archetypeExpressionBody — derived fallbacks are acceptable
- "—", "Limited Access", "Restricted Node Data" — already explicit
- renderFreeWhoisCard — locked; separate audit if needed

---

## 5. Implementation Recommendation

**Implement now (narrow, high-confidence):**

1. **fieldConditionsBody** — In buildPaidWhoisReport, when field_conditions_context and s2to5 both null, set explicit placeholder and log (mirror identityArchitectureBody fix).
2. **Render defense-in-depth** — In renderFreeWhoisReport and renderFreeWhoisReportText, replace generic prose fallbacks for identityArchitectureBody, interpretiveNotesBody, fieldConditionsBody with explicit placeholders. Ensures that even if a report slips through without builder-set values, we never show fake filler.

**Defer:**

- vectorZeroAddendumBody — long default may be intentional product copy
- civilizationalFunctionBody empty — low frequency (unknown archetype rare)

---

## 6. Constants for Explicit Placeholders

Canonical strings (implemented):

```
[Identity Architecture section unavailable]
[Interpretive Notes section unavailable]
[Field Conditions section unavailable]
[Civilizational Function section unavailable]
[Vector Zero addendum unavailable]
```

---

## 7. Implementation (2026-03-19)

**Applied:** (1) fieldConditionsBody — buildPaidWhoisReport sets explicit placeholder and logs when field_conditions_context and s2to5 both null. (2) Render defense-in-depth — renderFreeWhoisReport and renderFreeWhoisReportText use explicit placeholders instead of generic prose for identityArchitectureBody, fieldConditionsBody, interpretiveNotesBody when null/empty. (3) civilizationalFunctionBody — render uses "[Civilizational Function section unavailable]" when null/empty (no blank section). (4) vectorZeroAddendumBody — render uses "[Vector Zero addendum unavailable]" when null/empty; removed long generic "As an early registry participant…" paragraph.

**Files:** `lib/free-whois-report.ts`, `lib/__tests__/buildPaidWhoisReport-dry-run.test.ts`
