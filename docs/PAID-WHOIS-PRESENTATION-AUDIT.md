# Paid WHOIS Renderer — Presentation Audit (Read-Only)

**Scope:** `renderFreeWhoisReport(...)` and `renderFreeWhoisReportText(...)` in `lib/free-whois-report.ts`.  
**Goal:** Concrete recommendations to strengthen paid WHOIS presentation so it feels canonical, authoritative, and registry-grade without changing architecture.

---

## 1. CURRENT TOP-OF-REPORT FIELD ORDER

Exact order in which primary WHOIS fields appear in both HTML and text renderers.

### REGISTRATION LOG (first table)

| Order | Label           | Source field        |
|-------|-----------------|---------------------|
| 1     | Registry Status | `report.registryStatus` |
| 2     | Created Date    | `report.created_at` (sliced to 10 chars) |
| 3     | Record Authority| `report.recordAuthority` |
| 4     | Registry ID     | `report.registryId` |

### Human WHOIS Registry Record (second table)

| Order | Label                   | Source field                |
|-------|-------------------------|-----------------------------|
| 1     | Subject Name            | `report.name`               |
| 2     | Birth Date              | `report.birthDate`         |
| 3     | Birth Location          | `report.birthLocation`     |
| 4     | Birth Time              | `report.birthTime`         |
| 5     | Solar Segment           | `report.solarSignature`    |
| 6     | Archetype Classification| `report.archetypeClassification` |
| 7     | Cosmic Twin             | `report.cosmicAnalogue`    |

### IDENTITY PHYSICS — GENESIS METADATA (third table)

| Order | Label                  | Source / logic |
|-------|------------------------|----------------|
| 1     | Solar Light Vector     | `report.sunLongitudeDeg` → formatted ° or "Limited Access" |
| 2     | Seasonal Context       | `report.solarSignature` or "Limited Access" |
| 3     | Solar Anchor Type      | `humanizeSolarAnchorType(report.solarAnchorType)` |
| 4     | Chrono-Imprint         | `report.chronoImprintResolved ?? chronoImprintDisplay(report.birthTime)` |
| 5     | Origin Coordinates     | `report.originCoordinatesDisplay ?? "Restricted Node Data"` |
| 6     | Magnetic Field Index   | `report.magneticFieldIndexDisplay ?? "Restricted Node Data"` |
| 7     | Climate Signature      | `report.climateSignatureDisplay ?? "Restricted Node Data"` |
| 8     | Sensory Field Conditions | `report.sensoryFieldConditionsDisplay ?? "Restricted Node Data"` |

**Code references:**  
- HTML: `registrationLogRows` (lines 549–554), `recordRows` (555–564), `genesisRows` (576–586).  
- Text: same logical order in `lines` array (718–752).

---

## 2. FIELD PRIORITY RECOMMENDATION

Now that paid flow has real `birthDate`, `birthTime`, `birthLocation`, `chronoImprintResolved`, and `originCoordinatesDisplay`, the ideal order for a **registry-authority** feel is: **identity anchor first**, then **registry metadata**, then **physics/genesis**.

### Recommended order for **Human WHOIS Registry Record** (second table)

| Order | Label                   | Rationale |
|-------|-------------------------|-----------|
| 1     | Registry ID             | Primary record key; should appear at top of the *identity* block for quick reference. |
| 2     | Subject Name            | Designation of the registered entity. |
| 3     | Registry Status         | Registered / Pending / etc. |
| 4     | Birth Date              | Canonical anchor. |
| 5     | Birth Time              | With chrono resolved, this is authoritative. |
| 6     | Birth Location          | Place anchor. |
| 7     | Chrono-Imprint          | Resolved local/UTC; move from Genesis into core record when present. |
| 8     | Origin Coordinates       | When present (paid), belongs in core record. |
| 9     | Solar Segment            | Solar classification. |
| 10    | Archetype Classification | LIGS classification. |
| 11    | Cosmic Twin              | Cosmic analogue. |

**Alternative (minimal reorder):** If you want to change as little as possible, keep the two-table layout but:

- **First table (REGISTRATION LOG):** Keep as-is: Registry Status, Created Date, Record Authority, Registry ID.
- **Second table (Human WHOIS Registry Record):** Reorder to: **Registry ID**, Subject Name, Birth Date, Birth Time, Birth Location, Chrono-Imprint, Origin Coordinates, Solar Segment, Archetype Classification, Cosmic Twin.  
  That implies moving Registry ID into the second table and optionally promoting Chrono-Imprint and Origin Coordinates from Genesis into this table when they are present (paid). Genesis then becomes “supplementary physics” only (Solar Light Vector, Seasonal Context, Solar Anchor Type, and any remaining restricted-node fields).

**Recommendation:** Use the **minimal reorder**: (1) Add **Registry ID** as the first row of the “Human WHOIS Registry Record” table (or keep it only in REGISTRATION LOG and add “Record ID” as first row of the second table with same value). (2) Insert **Chrono-Imprint** and **Origin Coordinates** into the second table when `report.chronoImprintResolved` or `report.originCoordinatesDisplay` are set (paid), so the core identity block is self-contained. (3) Leave Genesis table for Solar Light Vector, Seasonal Context, Solar Anchor Type, and the four “Restricted Node Data” rows when not populated.

---

## 3. LIGHT SIGNATURE STRATEGY

**Can an explicit “Light Signature” field be surfaced from existing profile/report data without inventing values?**

**Yes.**

- **Source:** `BeautyProfileV1` extends `BeautyProfile` and includes `light_signature: ThreeVoice` (required by `hasRequiredBeautyProfileV1`; see `lib/beauty-profile-schema.ts` and `lib/eve-spec.ts`). Every valid profile has `light_signature.raw_signal` (string).
- **Safest source:** `profile.light_signature` in `buildPaidWhoisReport(...)`. The profile is already loaded there; no new API or store.
- **Display format (recommended):**
  - **Single-line (registry row):** Use `profile.light_signature.raw_signal` as the value for a new row “Light Signature”. If missing or empty, omit the row or show “—”. No invention.
  - **Optional expanded:** For a “Light Signature” section (like Vector Zero addendum), use all three voices: `raw_signal`, `custodian`, `oracle` — same pattern as `formatVectorZeroThreeVoice`. Prefer single-line for the main record table to keep the report scannable.

**Recommendation:** Add optional `lightSignatureDisplay?: string` to `FreeWhoisReport`. In `buildPaidWhoisReport`, set `report.lightSignatureDisplay = profile.light_signature?.raw_signal?.trim()` when present. In `renderFreeWhoisReport` and `renderFreeWhoisReportText`, add one row: label **Light Signature**, value `report.lightSignatureDisplay ?? "—"` (or omit the row when empty). Place it after **Cosmic Twin** in the Human WHOIS Registry Record table (or after Archetype Classification, before Cosmic Twin, depending on desired hierarchy).

---

## 4. PAID-ONLY COPY TIGHTENING

Parts of the current full paid WHOIS renderer that still read like **generic email/report** rather than a **registry authority record**:

| Location | Current copy | Issue | Recommendation |
|----------|----------------|-------|-----------------|
| `<title>` | "Your identity query has been logged" | Sounds like a support ticket. | Registry framing, e.g. "Registry Record — LIGS Human WHOIS" or "Identity Registration Record — LIGS". |
| Post-Genesis paragraph | "You now have access to the Human WHOIS registry. Full node analytics will become available when the registry opens." | Soft, future-looking; weakens “this is the record” feel. | Replace with a single line of registry authority, e.g. "This document constitutes the official registry record for the identity designated above." or "Issued under LIGS Human Identity Registry protocol. This record is complete for the fields disclosed." |
| Default **Interpretive Notes** fallback | "Expanded interpretive sections ship with the complete registration report." | Marketing/product language. | Registry language, e.g. "Interpretive notes are held on the registry node; this extract contains the fields cleared for release." or "Further interpretive layers remain on the registry; this record contains the cleared subset." |
| **Return to the registry** link | "Return to the registry" | Fine. | Optional: "View registry at ligs.io" or leave as-is. |
| Footer | "This message was generated automatically by the registry." | Defensive/automated tone. | "Issued by LIGS Human Identity Registry." or "LIGS Human Identity Registry — issued automatically." |
| Vector Zero default intro | "As an early registry participant, your record has been expanded with an additional identity layer now cleared for release: Vector Zero." | Participant/early-access framing. | For paid, prefer: "This record includes the Vector Zero addendum: the structural origin layer of the archetype, cleared for release." |
| Identity Architecture default | "The registry identifies a stable identity structure arising within the total field of forces present at birth." | Generic. | Keep as-is (often overridden by report sections) or tighten to: "Registry classification: stable identity structure within the field of forces present at birth." |
| Field Conditions default | "Classification emerges from field conditions and force structure at the birth event." | Generic. | Keep or: "Classification derives from field conditions and force structure at the birth event." |

**Priority:** Change `<title>`, the post-Genesis paragraph, and the default Interpretive Notes fallback first; then footer and Vector Zero intro. Identity Architecture / Field Conditions only if you want every default to sound registry-issued.

---

## 5. MINIMAL RENDERER CHANGE PLAN

Smallest set of renderer edits to make paid WHOIS feel substantially stronger while **leaving the free card flow untouched** (no changes to `renderFreeWhoisCard`, `renderFreeWhoisCardText`, or card-only logic).

### 5.1 Data layer (one-time, in `buildPaidWhoisReport`)

- **File:** `lib/free-whois-report.ts`
- **Change:** If `profile.light_signature?.raw_signal` is present and non-empty, set `report.lightSignatureDisplay = profile.light_signature.raw_signal.trim()`.
- **Type:** Add optional `lightSignatureDisplay?: string` to `FreeWhoisReport` in the same file.

(No change to free WHOIS build path; free reports don’t have a profile with `light_signature` in this flow.)

### 5.2 Field order and new row (both full report renderers)

- **Files:** `lib/free-whois-report.ts`
- **Functions:** `renderFreeWhoisReport`, `renderFreeWhoisReportText`

**Option A — Minimal (recommended):**

1. **Human WHOIS Registry Record table**
   - Add **Registry ID** as the first row of this table (value `report.registryId`), so the record is anchored by ID at the top of the identity block.  
   - **Or** keep REGISTRATION LOG as-is and add **Chrono-Imprint** and **Origin Coordinates** to the second table when `report.chronoImprintResolved` or `report.originCoordinatesDisplay` are set (so paid reports show them in the main record and avoid “Limited Access” / “Restricted Node Data” in the core block when data exists).
2. **Light Signature**
   - Append one row: label **Light Signature**, value `report.lightSignatureDisplay ?? "—"`. Omit the row when `lightSignatureDisplay` is absent/empty if you prefer.
3. **Genesis table**
   - If Chrono-Imprint and Origin Coordinates are moved into the second table when present, keep them in Genesis when absent (unchanged behavior) or remove duplicates and show them only in the second table when set.

**Option B — Full reorder (Section 2):**

- Reorder the second table to: Registry ID, Subject Name, Registry Status, Birth Date, Birth Time, Birth Location, Chrono-Imprint, Origin Coordinates, Solar Segment, Archetype Classification, Light Signature (when present), Cosmic Twin.
- Genesis: Solar Light Vector, Seasonal Context, Solar Anchor Type, then the four “Restricted Node Data” rows. Omit Chrono-Imprint and Origin Coordinates from Genesis when they are shown in the main record.

### 5.3 Copy changes (same two functions)

- **`renderFreeWhoisReport` (HTML):**
  - `<title>`: replace "Your identity query has been logged" with e.g. "Registry Record — LIGS Human WHOIS".
  - Post-Genesis paragraph: replace "You now have access to the Human WHOIS registry. Full node analytics will become available when the registry opens." with "This document constitutes the official registry record for the identity designated above."
  - Default interpretive notes fallback: replace "Expanded interpretive sections ship with the complete registration report." with "Interpretive notes are held on the registry node; this extract contains the fields cleared for release."
  - Footer: replace "This message was generated automatically by the registry." with "Issued by LIGS Human Identity Registry."
  - Vector Zero default block: replace "As an early registry participant, your record has been expanded with an additional identity layer now cleared for release: Vector Zero." with "This record includes the Vector Zero addendum: the structural origin layer of the archetype, cleared for release."
- **`renderFreeWhoisReportText`:** Apply the same string changes in the `lines` array and any equivalent default text.

### 5.4 Summary table

| Item | Function(s) | Change |
|------|-------------|--------|
| Registry ID in identity block | `renderFreeWhoisReport`, `renderFreeWhoisReportText` | Add as first row of "Human WHOIS Registry Record" table (or keep only in REGISTRATION LOG). |
| Chrono-Imprint / Origin in main record | Same | When `chronoImprintResolved` or `originCoordinatesDisplay` set, add rows to second table; keep or simplify Genesis. |
| Light Signature row | Same | New row: label "Light Signature", value `report.lightSignatureDisplay ?? "—"`. |
| Page title | Same | "Registry Record — LIGS Human WHOIS" (or equivalent). |
| Post-Genesis paragraph | Same | "This document constitutes the official registry record for the identity designated above." |
| Interpretive Notes default | Same | "Interpretive notes are held on the registry node; this extract contains the fields cleared for release." |
| Footer | Same | "Issued by LIGS Human Identity Registry." |
| Vector Zero default intro | Same | "This record includes the Vector Zero addendum: the structural origin layer of the archetype, cleared for release." |

**Do not change:**  
- `renderFreeWhoisCard`, `renderFreeWhoisCardText`, `getFreeWhoisPreviewDisplay`, `getArchetypeExpressionForCard`.  
- Free WHOIS build path (`buildFreeWhoisReport`, waitlist, resend).  
- Request/response shape of send-beauty-profile or Stripe.

---

## 6. Function and label reference

| Function | File | Purpose |
|----------|------|--------|
| `renderFreeWhoisReport` | `lib/free-whois-report.ts` | Full WHOIS HTML (email + landing). |
| `renderFreeWhoisReportText` | `lib/free-whois-report.ts` | Full WHOIS plain text (email multipart). |
| `row` | same | Builds a single table row (label + value). |
| `buildPaidWhoisReport` | same | Populates report from stored report + profile; add `lightSignatureDisplay` here from `profile.light_signature.raw_signal`. |

**Primary field labels (current):**  
Registry Status, Created Date, Record Authority, Registry ID, Subject Name, Birth Date, Birth Location, Birth Time, Solar Segment, Archetype Classification, Cosmic Twin, Solar Light Vector, Seasonal Context, Solar Anchor Type, Chrono-Imprint, Origin Coordinates, Magnetic Field Index, Climate Signature, Sensory Field Conditions.

**Recommended new label:** Light Signature (single row from `lightSignatureDisplay`).

End of audit. No code was modified.
