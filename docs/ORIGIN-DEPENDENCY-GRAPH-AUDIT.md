# /origin Dependency Graph & Safe-Removal Audit

**Read-only audit.** /origin landing is LOCKED; no changes to it. Goal: identify what is **required** for /origin to function vs what can be **safely removed or hidden**.

---

## SECTION 1 — /origin dependency graph

Tree of all files used **directly or indirectly** by the /origin flow, starting from `app/origin/page.jsx`. Includes client bundle, root layout, and API routes + their deps called when the user is on /origin (waitlist-only path).

### 1.1 Entry and layout

```
app/origin/page.jsx
  └── components/OriginTerminalIntake.jsx

app/origin/layout.jsx
  └── (no project imports; uses className "beauty-theme whois-origin", ORIGIN_SERIF)

app/layout.tsx  [wraps all pages including /origin]
  ├── app/globals.css
  ├── components/TestModeLogger.tsx
  │     └── lib/dry-run-config.ts
  └── lib/exemplar-store.ts  [IGNIS_LANDING_URL for metadata OG image]
        ├── @vercel/blob
        ├── lib/runtime-mode.ts
        └── lib/log.ts
```

### 1.2 OriginTerminalIntake.jsx — client bundle

```
components/OriginTerminalIntake.jsx
  ├── react (useState, useEffect, useRef, useCallback)
  ├── lib/terminal-intake/parseInputs.ts
  │     └── (no further project imports)
  ├── lib/terminal-intake/resolveArchetypeFromDate.js
  │     ├── lib/terminal-intake/approximateSunLongitude.js
  │     └── lib/archetypes.js
  │           └── src/ligs/archetypes/contract.ts
  │                 └── src/ligs/voice/schema.ts  [type only: LigsArchetype]
  ├── lib/engine-client.js
  │     └── lib/unwrap-response.ts
  ├── lib/landing-storage.js
  ├── lib/dry-run-config.ts
  ├── lib/archetype-preview-config.js
  │     ├── lib/exemplar-store.ts  [IGNIS_LANDING_URL, LIGS_ARCHETYPES not from here]
  │     ├── lib/archetypes.js  → contract (LIGS_ARCHETYPES)
  │     ├── lib/archetype-static-images.ts
  │     └── src/ligs/archetypes/adapters.ts  [getArchetypePreviewDescriptor]
  │           ├── src/ligs/archetypes/contract.ts
  │           └── (type-only: ../image/archetype-visual-map, ../voice/prompt/archetypeAnchors)
  └── lib/archetype-static-images.ts
```

### 1.3 APIs called by /origin (waitlist-only path)

- **GET /api/waitlist/count** — registry counter
- **POST /api/waitlist** — signup and confirmation email

```
app/api/waitlist/count/route.ts
  └── lib/waitlist-list.ts
        └── @vercel/blob

app/api/waitlist/route.ts
  ├── next/server (NextRequest, NextResponse)
  ├── lib/waitlist-rate-limit.ts
  ├── lib/waitlist-store.ts
  │     └── crypto, @vercel/blob
  ├── lib/email-waitlist-confirmation.ts
  │     ├── lib/exemplar-store.ts  [IGNIS_V1_ARTIFACTS]
  │     └── lib/archetype-public-assets.ts
  │           └── lib/archetypes.js  → contract
  ├── lib/terminal-intake/approximateSunLongitude.js
  ├── src/ligs/image/triangulatePrompt.ts  [getPrimaryArchetypeFromSolarLongitude only]
  │     ├── src/ligs/voice/schema.ts
  │     ├── src/ligs/archetypes/contract.ts  [LIGS_ARCHETYPES]
  │     ├── src/ligs/archetypes/adapters.ts
  │     └── src/ligs/voice/archetypePhraseBank  [transitive]
  └── src/ligs/astronomy/solarSeason.ts  [SOLAR_SEASONS]
        ├── src/ligs/voice/schema.ts
        └── src/ligs/archetypes/contract.ts
```

### 1.4 Flat list of files IN the /origin graph

**App / layout**

- `app/origin/page.jsx`
- `app/origin/layout.jsx`
- `app/layout.tsx`
- `app/globals.css`

**Components**

- `components/OriginTerminalIntake.jsx`
- `components/TestModeLogger.tsx`

**Lib (client or shared)**

- `lib/terminal-intake/parseInputs.ts`
- `lib/terminal-intake/resolveArchetypeFromDate.js`
- `lib/terminal-intake/approximateSunLongitude.js`
- `lib/engine-client.js`
- `lib/unwrap-response.ts`
- `lib/landing-storage.js`
- `lib/dry-run-config.ts`
- `lib/archetype-preview-config.js`
- `lib/archetype-static-images.ts`
- `lib/archetypes.js`
- `lib/exemplar-store.ts`
- `lib/runtime-mode.ts`
- `lib/log.ts`
- `lib/waitlist-rate-limit.ts`
- `lib/waitlist-store.ts`
- `lib/waitlist-list.ts`
- `lib/email-waitlist-confirmation.ts`
- `lib/archetype-public-assets.ts`

**API routes**

- `app/api/waitlist/route.ts`
- `app/api/waitlist/count/route.ts`

**src/ligs**

- `src/ligs/archetypes/contract.ts`
- `src/ligs/archetypes/adapters.ts`
- `src/ligs/voice/schema.ts`
- `src/ligs/image/triangulatePrompt.ts` (only `getPrimaryArchetypeFromSolarLongitude` used by waitlist route)
- `src/ligs/astronomy/solarSeason.ts`
- (Transitive from triangulatePrompt: `src/ligs/voice/archetypePhraseBank` and image/voice types as needed at build)

**Assets**

- Origin uses **no direct image imports**. It builds paths to:
  - `public/arc-static-images/*` (via `getArchetypeStaticImagePathOrFallback`)
  - `public/{archetype}-images/` and `public/* arc images/` (via inline `ARC_FOLDER_BY_ARCHETYPE`, `PRIME_ASSETS_BY_ARCHETYPE` in OriginTerminalIntake)
- Root layout metadata uses `IGNIS_LANDING_URL` from exemplar-store (external or static URL).

**Styles**

- `app/globals.css` (and Tailwind); origin layout uses `beauty-theme`, `whois-origin` classes.

---

## SECTION 2 — Files NOT used by /origin

Everything below is **outside** the /origin dependency graph. Classification: **SAFE TO DELETE** | **SAFE TO HIDE / REDIRECT** | **UNCERTAIN**.

### 2.1 Routes (app/)

| Path | Classification | Notes |
|------|----------------|--------|
| `app/page.tsx` | **SAFE TO HIDE / REDIRECT** | Root page; middleware rewrites `/` to `/origin`. Can be minimal or 404 if rewrite is canonical. |
| `app/beauty/page.jsx` | **SAFE TO HIDE / REDIRECT** | Redirected to `/origin` when waitlist-only. Not in origin graph. |
| `app/beauty/layout.jsx` | **SAFE TO HIDE / REDIRECT** | Only used when `/beauty` is not redirected. |
| `app/beauty/start/page.jsx` | **SAFE TO HIDE / REDIRECT** | Legacy; not used by origin. |
| `app/beauty/view/page.jsx` | **SAFE TO HIDE / REDIRECT** | Legacy report view. |
| `app/beauty/view/*` (all view components) | **SAFE TO HIDE / REDIRECT** | ReportDocument, BeautyViewClient, PreviewRevealSequence, etc. |
| `app/beauty/success/page.jsx` | **SAFE TO HIDE / REDIRECT** | Post-checkout. |
| `app/beauty/cancel/page.jsx` | **SAFE TO HIDE / REDIRECT** | Checkout cancelled. |
| `app/beauty/sample-report/page.jsx` | **SAFE TO HIDE / REDIRECT** | Legacy. |
| `app/beauty/error.jsx`, `loading.jsx` | **SAFE TO HIDE / REDIRECT** | Beauty subtree only. |
| `app/dossier/page.tsx` | **SAFE TO HIDE / REDIRECT** | Standalone sample page; not in origin graph. |
| `app/voice/page.jsx` | **SAFE TO DELETE** or **HIDE** | Voice tool; not used by origin. |
| `app/ligs-studio/page.tsx`, `app/ligs-studio/login/page.tsx` | **SAFE TO HIDE / REDIRECT** | Internal tool; not part of origin. |
| `app/origin/error.jsx` | **UNCERTAIN** | Error boundary for /origin. If origin has no custom error boundary, Next.js may use root or this. **Recommend:** keep as-is unless you remove all error.jsx from app. |

### 2.2 API routes not used by /origin

| Path | Classification | Notes |
|------|----------------|--------|
| `app/api/waitlist/list/route.ts` | **SAFE TO HIDE / REDIRECT** | Studio/admin; not called by origin UI. |
| `app/api/waitlist/resend/route.ts` | **SAFE TO HIDE / REDIRECT** | Operator; not called by origin. |
| `app/api/waitlist/reset/route.ts` | **SAFE TO HIDE / REDIRECT** | Operator; not called by origin. |
| `app/api/waitlist/health/route.ts` | **SAFE TO HIDE / REDIRECT** | Health check; not required for origin flow. |
| `app/api/beauty/*` (all) | **SAFE TO HIDE / REDIRECT** | Used when WAITLIST_ONLY=0; not in origin graph. |
| `app/api/engine/route.ts`, `app/api/engine/generate/route.ts` | **SAFE TO HIDE / REDIRECT** | Engine; not called by origin when waitlist-only. |
| `app/api/report/*` | **SAFE TO HIDE / REDIRECT** | Report/previews; not used by origin. |
| `app/api/stripe/*` | **SAFE TO HIDE / REDIRECT** | Checkout; optional for origin (only if you add pay CTA). |
| `app/api/email/send-beauty-profile/route.ts` | **SAFE TO HIDE / REDIRECT** | Post-purchase email; not used by origin. |
| `app/api/exemplars/*` | **SAFE TO HIDE / REDIRECT** | Exemplar manifests/save; not used by origin. |
| `app/api/image/*`, `app/api/generate-image/route.ts` | **SAFE TO HIDE / REDIRECT** | Image gen; not used by origin. |
| `app/api/marketing/*` | **SAFE TO HIDE / REDIRECT** | Marketing cards; not used by origin. |
| `app/api/voice/generate/route.ts` | **SAFE TO HIDE / REDIRECT** | Voice; not used by origin. |
| `app/api/keepers/*` | **SAFE TO HIDE / REDIRECT** | Not used by origin. |
| `app/api/studio-auth/route.ts`, `app/api/studio/pipeline-status/route.ts` | **SAFE TO HIDE / REDIRECT** | Studio; not used by origin. |
| `app/api/dev/*` | **SAFE TO HIDE / REDIRECT** | Dev only. |
| `app/api/debug/env/route.ts` | **SAFE TO HIDE / REDIRECT** | Debug. |
| `app/api/analytics/event/route.ts` | **UNCERTAIN** | If origin or root layout triggers analytics, keep; else safe to hide. |
| `app/api/status/route.ts` | **UNCERTAIN** | Some landings check status; if origin does not, safe to hide. |
| `app/api/ligs/status/route.ts` | **SAFE TO HIDE / REDIRECT** | Not in origin graph. |

### 2.3 Components not used by /origin

| Path | Classification | Notes |
|------|----------------|--------|
| `app/beauty/view/*.jsx` (ReportDocument, BeautyViewClient, etc.) | **SAFE TO HIDE / REDIRECT** | Legacy report flow. |
| `components/FlowNav.jsx` | **SAFE TO HIDE / REDIRECT** | Not imported by OriginTerminalIntake; used only on beauty/view and dossier. |
| `components/LandingPreviews.jsx` | **SAFE TO HIDE / REDIRECT** | Used by BeautyLandingClient; not by origin. |
| `components/ArchetypeArtifactCard.jsx` | **SAFE TO HIDE / REDIRECT** | Report/beauty flow. |
| `components/ArchetypeNameOverlay.jsx` | **SAFE TO HIDE / REDIRECT** | Report/beauty flow. |
| `components/PreviewCardModal.jsx` | **SAFE TO HIDE / REDIRECT** | Landing previews; not origin. |
| `components/StaticButton.jsx` | **SAFE TO HIDE / REDIRECT** | Not in origin. |
| `components/PayUnlockButton.tsx` | **SAFE TO HIDE / REDIRECT** | Purchase flow. |
| `components/LigsFooter.jsx` | **SAFE TO HIDE / REDIRECT** | Not used by origin. |
| `components/LightIdentityForm.jsx` | **SAFE TO HIDE / REDIRECT** | Used by beauty/start; not by origin. |
| `components/ArchetypeFamilyCycle.jsx` | **SAFE TO HIDE / REDIRECT** | Beauty preview flow. |
| `components/LigsStudio.tsx` | **SAFE TO HIDE / REDIRECT** | Internal tool. |
| `components/ArtifactInfoPanel.jsx` | **SAFE TO HIDE / REDIRECT** | Report/artifact UI. |

### 2.4 Lib / utilities not used by /origin

| Path | Classification | Notes |
|------|----------------|--------|
| `lib/report-sections.js` | **SAFE TO HIDE / REDIRECT** | Report document; not in origin graph. |
| `lib/report-composition.ts` | **SAFE TO HIDE / REDIRECT** | Report sections; not in origin graph. |
| `lib/beauty-profile-store.ts`, `lib/beauty-profile-schema.ts` | **SAFE TO HIDE / REDIRECT** | Beauty profile; not used by origin. |
| `lib/beauty-report-presentation.js` | **SAFE TO HIDE / REDIRECT** | Not in origin graph. |
| `lib/report-store.ts` | **SAFE TO HIDE / REDIRECT** | Engine/report storage; not used by origin. |
| `lib/engine-spec.ts` | **SAFE TO HIDE / REDIRECT** | Engine; not used by origin. |
| `lib/exemplar-synthetic.ts` | **SAFE TO HIDE / REDIRECT** | Exemplar reports; not used by origin. |
| `lib/api-client.js` | **SAFE TO HIDE / REDIRECT** | Previews; not used by origin. |
| `lib/landing-storage.js` | **IN GRAPH** | Used by OriginTerminalIntake (saveLastFormData, saveOriginIntake, etc.). **Do not remove.** |
| `lib/engine-client.js` | **IN GRAPH** | Imported by OriginTerminalIntake (submitToBeautySubmit, etc.). **Do not remove** or origin build breaks. |
| `lib/idempotency-store.ts` | **SAFE TO HIDE / REDIRECT** | Engine; not used by origin. |
| `lib/vector-zero.ts` | **SAFE TO HIDE / REDIRECT** | Engine/report; not used by origin. |
| `lib/eve-spec.ts` | **SAFE TO HIDE / REDIRECT** | E.V.E. filter; not used by origin. |
| `lib/sample-report.ts` | **SAFE TO HIDE / REDIRECT** | Dossier sample; not used by origin. |
| `lib/marketing/*` | **SAFE TO HIDE / REDIRECT** | Marketing/compose; not used by origin. |
| `lib/preflight.ts` | **SAFE TO HIDE / REDIRECT** | Not in origin graph. |
| `lib/history/onThisDay.ts` | **SAFE TO HIDE / REDIRECT** | Not in origin graph. |
| `lib/astrology/deriveFromBirthData.ts` | **SAFE TO HIDE / REDIRECT** | Server engine; not used by origin client or waitlist API. |
| `lib/dry-run-config.ts` | **IN GRAPH** | Used by OriginTerminalIntake and TestModeLogger. **Do not remove.** |

### 2.5 Middleware

| Path | Classification | Notes |
|------|----------------|--------|
| `middleware.ts` | **REQUIRED** | Rewrites `/` to `/origin`; redirects `/beauty` to `/origin` when waitlist-only. Part of origin behavior. **Do not remove.** |

### 2.6 Summary

- **Required for /origin:** Section 1 tree (entry, layout, OriginTerminalIntake and its imports, waitlist API + count API and their deps), root layout and its deps, middleware.
- **Not required:** All other app routes (beauty, dossier, voice, ligs-studio), all other API routes except `waitlist` and `waitlist/count`, all components not in the tree, and all lib files not listed in Section 1.4.
- **Safe to delete:** Only if you are intentionally removing a feature (e.g. voice page, dev routes). Prefer **hide/redirect** (middleware, feature flags, or not linking) so behavior is reversible.
- **Uncertain:** `app/origin/error.jsx` (keep unless you standardize on root error); `app/api/analytics/event` and `app/api/status` (keep if any origin or root code calls them; else hide).

---

*Audit only; no code changes. /origin is LOCKED.*
