# Solar Segment "—" Contradiction — Debug Report

**Observed:** Birth Date 1990-03-03, Archetype Fluxionis, Solar Segment "—".

---

## A. Exact `buildFreeWhoisReport()` assignment logic

**File:** `lib/free-whois-report.ts`

```ts
let solarSegmentName = "—";
let archetypeClassification = data.preview_archetype?.trim() ?? "—";

const rawBirthDate = data.birthDate?.trim().slice(0, 10);
if (rawBirthDate) {
  const lon = approximateSunLongitudeFromDate(rawBirthDate);
  if (lon != null) {
    const normalized = ((lon % 360) + 360) % 360;
    const shifted = (normalized + 15) % 360;
    const seasonIndex = Math.floor(shifted / 30);
    const name = CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex];
    if (name) solarSegmentName = name;
    archetypeClassification = getPrimaryArchetypeFromSolarLongitude(lon);
  }
}
// ...
return {
  // ...
  solarSignature: solarSegmentName,
  archetypeClassification,
  // ...
};
```

- **solarSignature:** Set only when `rawBirthDate` is truthy and `lon != null`; then from `CANONICAL_SOLAR_SEGMENT_NAMES[seasonIndex]`. Otherwise stays `"—"`.
- **archetypeClassification:** Starts as `data.preview_archetype ?? "—"`; if `rawBirthDate` and `lon != null`, overwritten by `getPrimaryArchetypeFromSolarLongitude(lon)`.

So if `data.birthDate` is missing/undefined, `rawBirthDate` is falsy → solar segment never set → `solarSignature` remains `"—"`. Archetype can still be `Fluxionis` from `data.preview_archetype` (or from entry in duplicate path).

---

## B. Traced values for birthDate `1990-03-03`

| Step | Value |
|------|--------|
| rawBirthDate input | `"1990-03-03"` |
| approximateSunLongitudeFromDate | dayOfYear = 62, lon = (62−79)×(360/365.25) → **343.24°** |
| normalized | **343.24** |
| shifted | (343.24 + 15) % 360 = **358.24** |
| seasonIndex | floor(358.24 / 30) = **11** |
| CANONICAL_SOLAR_SEGMENT_NAMES[11] | **"Late-Winter"** |
| solarSignature | **"Late-Winter"** |
| archetypeClassification | From getPrimaryArchetypeFromSolarLongitude(343.24°) → **Fluxionis** (segment 11) |

So when `birthDate: "1990-03-03"` is passed into `buildFreeWhoisReport()`, the server **does** compute `solarSignature: "Late-Winter"` and archetype Fluxionis. The only way to get `solarSignature: "—"` is for `buildFreeWhoisReport()` to be called **without** `birthDate` (or with it falsy).

---

## C. Exact API response `report` values for this case

- **New signup** (body includes `birthDate: "1990-03-03"`):  
  Report is built with `birthDate: birthDateRaw` → `solarSignature` is **"Late-Winter"**, not "—".

- **Duplicate signup** (existing entry, report built from **entry** only):  
  Payload is `...(entry.birthDate && { birthDate: entry.birthDate })`.  
  If the stored Blob **entry has no `birthDate`** (e.g. registered before birthDate was persisted, or it was never sent), then `birthDate` is **not** passed to `buildFreeWhoisReport()` → `rawBirthDate` is undefined → `solarSignature` stays **"—"**.  
  `archetypeClassification` can still be **"Fluxionis"** from `entry.preview_archetype`.  
  So for this case the API returns `report.solarSignature === "—"` and `report.archetypeClassification === "Fluxionis"`.

Conclusion: the API **is** returning `solarSignature: "—"` when the report is built from a duplicate **entry that has no birthDate**. The client is not losing it.

---

## D. Exact client state/render path

**State:**  
`const [registrySolarSignature, setRegistrySolarSignature] = useState(null);`

**Write (on successful POST response):**  
`setRegistrySolarSignature(data?.report?.solarSignature ?? null);`  
So if the server sends `report.solarSignature: "—"`, state becomes the string `"—"`.

**Render (registry block):**  
- Birth Date: `{formData.birthDate || "—"}` → from **local form state** (e.g. 1990-03-03).  
- Archetype: `{archetypeForCompletion}` → from **client** `resolveArchetypeFromDate(formData.birthDate)` (e.g. Fluxionis).  
- Solar Segment: `{registrySolarSignature ?? "—"}` → from **API** `data.report.solarSignature` only.

So Birth Date and Archetype can show current form data while Solar Segment shows the **report** from the API. When the API report was built without `birthDate` (duplicate path, entry without birthDate), `report.solarSignature` is "—" and the UI correctly shows "—".

---

## E. Root cause

**Duplicate path builds report from stored entry only.**  
In both the "within cooldown" and "resend attempt" branches, the report is built with:

- `...(entry.birthDate && { birthDate: entry.birthDate })`

If the Blob entry has no `birthDate` (old or incomplete data), `birthDate` is never passed to `buildFreeWhoisReport()` → `solarSegmentName` stays "—" → `report.solarSignature` is "—".  
The client then shows:

- Birth Date from **form** (1990-03-03),
- Archetype from **form** (Fluxionis),
- Solar Segment from **API report** ("—").

So the contradiction is: **server returns solarSignature "—" because the duplicate-path report was built without birthDate (entry had no birthDate).**

---

## F. Minimal fix

**Change:** When building the report in the **duplicate** path (cooldown and resend-attempt branches), use the **request body’s** birth date when the entry doesn’t have one.

**In `app/api/waitlist/route.ts`:**

1. **Within-cooldown branch:**  
   `...(entry.birthDate && { birthDate: entry.birthDate })`  
   →  
   `...((entry.birthDate || birthDateRaw) && { birthDate: entry.birthDate || birthDateRaw })`

2. **Resend-attempt branch:**  
   Same replacement.

So for duplicate signups, if the user sends `birthDate: "1990-03-03"` in the current request and the stored entry has no birthDate, the report is now built with that birthDate → longitude → segment index → `solarSignature: "Late-Winter"` and the API returns it; the client already stores and renders `data.report.solarSignature`, so Solar Segment will show "Late-Winter" instead of "—".

**Summary:** Root cause = duplicate path used only `entry.birthDate`, so when entry had no birthDate, solar segment was never computed. Fix = use `entry.birthDate || birthDateRaw` when building the report in both duplicate sub-paths so the current request’s birth date is used when the entry lacks it.
