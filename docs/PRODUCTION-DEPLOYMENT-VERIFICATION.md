# LIGS Production Deployment Verification

**Date:** 2026-03-05  
**Production URL:** https://ligs.io  
**Purpose:** Verify locked LIGS system deployment. No code changes. Verification only.

---

## PART 1 — Git State

| Item | Status |
|------|--------|
| **Current branch** | `chore/march-ignis-glyph-preflight` |
| **Local HEAD** | `0cafdac` (feat: glyph preflight route + buildGlyphConditionedAssets) |
| **origin/main** | `d1a7df7` (chore: landing lockdown + waitlist health + smoke check) |
| **origin/chore/march-ignis-glyph-preflight** | `d1a7df7` |
| **Uncommitted changes** | Yes — 40+ modified files, 30+ untracked files |
| **Commit on origin** | Local `0cafdac` is behind origin; origin branch at `d1a7df7` |

**Note:** The locked baseline (exemplar-Ignispectrum handling, OriginTerminalIntake, WHOIS structure, RegistrySummary, exemplar-synthetic, etc.) exists in **local modified/untracked files** and is **not** on `origin/main`. Production deploys from `main`.

---

## PART 2 — Vercel Deployment

| Item | Status |
|------|--------|
| **Vercel CLI** | Not available / not linked |
| **Production branch** | Assumed `main` (standard Vercel setup) |
| **Deployed commit (assumed)** | `d1a7df7` |
| **Deployment URL** | https://ligs.io |
| **Deployment timestamp** | Not available without Vercel dashboard/CLI |

**Action:** To confirm deployed commit, use Vercel dashboard (Project → Deployments) or run `vercel link` + `vercel inspect` locally.

**Trigger deploy:** A standard production deploy would deploy `main` at `d1a7df7`. The locked baseline (exemplar path, terminal intake, etc.) is **not on main** — it is in uncommitted local changes. Deploying now would **not** include the locked baseline.

---

## PART 3 — Production Routes

| Route | Status | Notes |
|-------|--------|-------|
| https://ligs.io | ✅ 200 | Rewrites to /origin; loads correctly |
| https://ligs.io/origin | ✅ 200 | Landing loads; smoke check passed |
| https://ligs.io/beauty/view?reportId=exemplar-Ignispectrum | ⚠️ Partial | Page loads but shows "Select a report" — API returns 404 |

**Details:**
- `/` and `/origin`: Load. Content includes hero, Ignis exemplar, 12-archetype grid, waitlist CTA. Markers "LIGS — Light Identity System" and "Your Light Signature in three ways" present. `npm run check:origin` passes.
- **Terminal landing:** Production shows the Beauty-style landing (hero + exemplar + grid), not the terminal-style OriginTerminalIntake. The locked baseline uses `OriginTerminalIntake` with "Press ENTER to view sample records" → exemplar-Ignispectrum. That flow is in local uncommitted files.
- **ENTER → sample report:** Not verifiable in production — exemplar API returns 404.
- **Exemplar page:** `/beauty/view?reportId=exemplar-Ignispectrum` loads the view page, but the API `GET /api/beauty/exemplar-Ignispectrum` returns **404**. The view falls back to "Select a report" / "Choose a report" because no profile data is returned. Production `main` does **not** include exemplar handling in the beauty route (it only calls `loadBeautyProfileV1`; exemplar-Ignispectrum synthetic path is in local modified file).

---

## PART 4 — Asset Paths

| Asset | URL | Status |
|-------|-----|--------|
| marketing_background.png | `https://rne9k1g6lgh8e9is.public.blob.vercel-storage.com/ligs-exemplars/Ignispectrum/v1/marketing_background.png` | ✅ 200 |
| exemplar_card.png | `https://rne9k1g6lgh8e9is.public.blob.vercel-storage.com/ligs-exemplars/Ignispectrum/v1/exemplar_card.png` | ✅ 200 |
| share_card.png | `https://rne9k1g6lgh8e9is.public.blob.vercel-storage.com/ligs-exemplars/Ignispectrum/v1/share_card.png` | ✅ 200 |

**Verification:** `curl -sI` (HEAD) returns HTTP 200 for all three. Images load in production (landing uses exemplar_card.png for Ignis hero and Examples grid).

---

## PART 5 — Report System (Exemplar)

| Check | Status | Notes |
|-------|--------|-------|
| WHOIS block | ❌ N/A | Exemplar page does not render report — API 404 |
| Registry Summary | ❌ N/A | Same |
| Archetype Artifact + glyph overlay | ❌ N/A | Same |
| Identity Artifacts carousel | ❌ N/A | Same |
| Return to Coherence | ❌ N/A | Same |
| Console errors | N/A | Page loads but no report data |

**Conclusion:** Exemplar report cannot be verified in production because `/api/beauty/exemplar-Ignispectrum` returns 404. The exemplar handling exists only in local modified files.

---

## PART 6 — Studio Safety

| Check | Status |
|-------|--------|
| `/ligs-studio` exists | ✅ 200 |
| No auto-generation | ✅ "Dry Run Mode", "LIVE disabled by server config" |
| Generation on user action only | ✅ Buttons: "Generate Background", "Compose", "Run Full Pipeline", "Save as Exemplar Card", etc. No auto-trigger. |

---

## PART 7 — Deliverable Summary

### 1. Production deployment status

**Deployed:** Yes. https://ligs.io responds 200. Origin smoke check passes.

**Assumed deployed commit:** `d1a7df7` (main).

### 2. Commit hash running on ligs.io

**Assumed:** `d1a7df7` (chore: landing lockdown + waitlist health + smoke check).  
**Confirm via:** Vercel dashboard or `vercel inspect` after linking.

### 3. Route verification results

| Route | Result |
|-------|--------|
| / | ✅ Loads (rewrites to /origin) |
| /origin | ✅ Loads |
| /beauty/view?reportId=exemplar-Ignispectrum | ⚠️ Page loads; API 404; no report data |

### 4. Asset verification results

| Asset | Result |
|-------|--------|
| Ignis v1 marketing_background.png | ✅ 200 |
| Ignis v1 exemplar_card.png | ✅ 200 |
| Ignis v1 share_card.png | ✅ 200 |

### 5. Errors found

1. **API 404:** `GET /api/beauty/exemplar-Ignispectrum` returns 404. Production beauty route does not handle exemplar IDs; it only loads from Blob via `loadBeautyProfileV1`. Exemplar handling (synthetic backfill, IGNIS_V1_ARTIFACTS) is in local modified `app/api/beauty/[reportId]/route.ts`, not on main.
2. **Exemplar page:** Shows "Select a report" because API returns 404.
3. **Terminal flow:** Production shows Beauty-style landing. Terminal intake (OriginTerminalIntake, ENTER → exemplar) is in local uncommitted `components/OriginTerminalIntake.jsx`.

### 6. Confirmation: system deployed vs. locked baseline

**Production does NOT match the locked baseline.**

The locked baseline (per `docs/LIGS-LOCKDOWN-SNAPSHOT.md`) includes:
- Terminal-style origin intake (OriginTerminalIntake)
- ENTER → exemplar-Ignispectrum
- Exemplar synthetic backfill for exemplar-Ignispectrum
- WHOIS structure, Registry Summary, Return to Coherence
- lib/exemplar-synthetic.ts, buildExemplarBackfill, buildExemplarSyntheticSections, buildExemplarFullReport

These exist in **local modified/untracked files** and are **not on main**. Production (main at d1a7df7) has an older version without exemplar handling and without the terminal intake.

**To deploy the locked baseline:**
1. Commit the modified and untracked files (exemplar-synthetic, beauty route exemplar branch, OriginTerminalIntake, RegistrySummary, WhoisReportSections, etc.).
2. Merge to `main` (or push `main` with these changes).
3. Trigger a production deploy (or let Vercel auto-deploy on push).

---

## Recommendations

1. **Commit and push** the locked baseline changes to `main` before expecting exemplar-Ignispectrum and terminal flow to work in production.
2. **Verify deployed commit** via Vercel dashboard after the next deploy.
3. **Re-run this verification** after deploying the locked baseline to confirm exemplar API, WHOIS, Registry Summary, and Return to Coherence.
