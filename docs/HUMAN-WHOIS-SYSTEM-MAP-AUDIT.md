# Human WHOIS vs Legacy Beauty/Dossier — System Map Audit

**Read-only audit.** No code changes. Purpose: align product language and framing around **Human WHOIS**, **LIGS Human WHOIS Registry**, **free WHOIS report**, **registry access**, **full node analytics**; deprecate **beauty**, **dossier**, **report document** conflict language in product framing.

---

## 1. CURRENT HUMAN WHOIS SURFACE AREA

Every file, route, component, utility, and email template that powers or references /origin, free WHOIS result, registry language, waitlist/registry access, or “Human WHOIS” wording.

| Item | Type | Path / name | Notes |
|------|------|-------------|--------|
| **Origin page** | Route | `app/origin/page.jsx` | Renders `OriginTerminalIntake`; dynamic. |
| **Origin layout** | Layout | `app/origin/layout.jsx` | `beauty-theme whois-origin`; system serif, transparent bg. |
| **Origin error** | Route | `app/origin/error.jsx` | Error boundary for /origin. |
| **Terminal intake** | Component | `components/OriginTerminalIntake.jsx` | **Primary WHOIS surface:** WHOIS prompt, handshake, intake (name, date, place, time, email), Registry Record block, Identity Registration Confirmation, Registry Artifacts, Archetype Expression, Registry Extract, CTA, registry counter, #whois-preview. Uses `resolveArchetypeFromDate`, `getArchetypeExpressionLines`, `getRegistryArtifactUrls`. |
| **resolveArchetypeFromDate** | Utility | `lib/terminal-intake/resolveArchetypeFromDate.js` | `resolveArchetypeFromDate(dateStr)` — derives archetype (and solar segment) from birth date for free WHOIS. |
| **getArchetypePreviewConfig** | Utility | `lib/archetype-preview-config.js` | `getArchetypePreviewConfig(archetype)` — teaser (humanExpression, civilizationFunction, environments) for Archetype Expression on origin. |
| **getArchetypeExpressionLines** | Inline (OriginTerminalIntake) | `components/OriginTerminalIntake.jsx` (lines 83–97) | Builds line1/line2 for Archetype Expression from `getArchetypePreviewConfig(archetype).teaser`. |
| **Waitlist API** | API route | `app/api/waitlist/route.ts` | POST: body (email, source, birthDate, name, birthPlace, birthTime); computes preview_archetype/solar_season; insert/resend; calls `sendWaitlistConfirmation`. |
| **Waitlist count** | API route | `app/api/waitlist/count/route.ts` | GET `{ total }` for registry counter. |
| **Waitlist store** | Lib | `lib/waitlist-store.ts` | `insertWaitlistEntry`, `getWaitlistEntryByEmail`, `recordConfirmationSent`; Blob at `ligs-waitlist/entries/{key}.json`. |
| **Waitlist list** | Lib | `lib/waitlist-list.ts` | `getWaitlistCount`, list entries; used by count + Studio. |
| **Email confirmation** | Lib | `lib/email-waitlist-confirmation.ts` | `buildWaitlistConfirmationHtml`, `buildWaitlistConfirmationText`, `sendWaitlistConfirmation`, `getRegistryArtifactImageUrl`. Copy: “LIGS HUMAN WHOIS REGISTRY”, “Human WHOIS Registry Record”, “You now have access to the Human WHOIS registry. Full node analytics will become available when the registry opens.”, “Return to the registry”. |
| **Middleware** | Root | `middleware.ts` | `/` → rewrite /origin; `/beauty`(/) → 308 /origin when waitlist-only. |
| **FlowNav** | Component | `components/FlowNav.jsx` | “Human WHOIS protocol”; “← Return to Origin”; “View Dossier”. Used on origin completion and beauty/view. |
| **ReportDocument header** | Component | `app/beauty/view/ReportDocument.jsx` | Title “LIGS HUMAN IDENTITY DOSSIER”; subtitle “Human WHOIS Registry Record”. |
| **Dossier page header** | Route | `app/dossier/page.tsx` | “LIGS HUMAN IDENTITY DOSSIER”; “Human WHOIS Registry Record” (static sample). |
| **Beauty start/success/cancel/view** | Routes / components | `app/beauty/start/page.jsx`, `app/beauty/success/page.jsx`, `app/beauty/cancel/page.jsx`, `app/beauty/view/TerminalResolutionSequence.jsx`, `app/beauty/view/InteractiveReportSequence.jsx` | “(L)IGS Human WHOIS Resolution Engine”; “Human WHOIS protocol” (FlowNav). |
| **Docs** | Docs | `docs/ORIGIN-WHOIS-DELIVERABLE.md`, `docs/ORIGIN-IDLE-STATE-AUDIT.md`, `docs/ORIGIN-AS-LAW-AUDIT.md`, `docs/WHOIS-HUMAN-REGISTRATION-REPORT-MVP.md`, etc. | Canonical WHOIS/registry wording and section order. |

---

## 2. LEGACY BEAUTY / DOSSIER SURFACE AREA

Files, routes, components, utilities, and API routes that still use or depend on beauty, dossier, report document, beauty view, or exemplar language. Classification: **ACTIVE USER-FACING** | **BACKEND / INTERNAL ONLY** | **LEGACY BUT STILL WIRED** | **SAFE TO IGNORE FOR HUMAN WHOIS WORK**.

| Item | Path | Classification | Notes |
|------|------|----------------|--------|
| **Beauty landing** | `app/beauty/page.jsx`, `app/beauty/BeautyLandingClient.jsx` | LEGACY BUT STILL WIRED | When waitlist-only, /beauty redirects to /origin; when NEXT_PUBLIC_WAITLIST_ONLY=0, BeautyLandingClient renders. User-facing “beauty” in route and component name. |
| **Beauty layout** | `app/beauty/layout.jsx` | LEGACY BUT STILL WIRED | Wraps all /beauty routes. |
| **Beauty view** | `app/beauty/view/page.jsx`, `app/beauty/view/BeautyViewClient.jsx` | LEGACY BUT STILL WIRED | View by reportId; exemplar or paid report. User-facing “beauty” in URL. |
| **Report document** | `app/beauty/view/ReportDocument.jsx` | LEGACY BUT STILL WIRED | “Report document — continuous Human WHOIS / registry-style **dossier**”; “LIGS HUMAN IDENTITY **DOSSIER**”. User-facing “dossier” in comment and title. |
| **Report sections** | `lib/report-sections.js` | BACKEND / INTERNAL ONLY | “Beauty profile”; “dossier document”. Feeds ReportDocument and InteractiveReportSequence. |
| **Beauty profile store/schema** | `lib/beauty-profile-store.ts`, `lib/beauty-profile-schema.ts`, `lib/beauty-report-presentation.js` | BACKEND / INTERNAL ONLY | Beauty profile load/save; no user-facing copy. |
| **Beauty API** | `app/api/beauty/[reportId]/route.ts`, `app/api/beauty/create/route.ts`, `app/api/beauty/submit/route.ts`, `app/api/beauty/dry-run/route.ts` | BACKEND / INTERNAL ONLY | Exemplar path, profile build; “exemplar” in logic. |
| **Exemplar store/synthetic** | `lib/exemplar-store.ts`, `lib/exemplar-synthetic.ts` | BACKEND / INTERNAL ONLY | Exemplar manifests, backfill, full report. |
| **Engine client** | `lib/engine-client.js` | BACKEND / INTERNAL ONLY | submitToBeautySubmit, submitToBeautyDryRun, prepurchaseBeautyDraft — used by OriginTerminalIntake for non–waitlist-only flow. |
| **Landing storage** | `lib/landing-storage.js` | BACKEND / INTERNAL ONLY | setBeautyUnlocked, setBeautyDraft, isBeautyUnlocked. |
| **OriginTerminalIntake (beauty hooks)** | `components/OriginTerminalIntake.jsx` | LEGACY BUT STILL WIRED | Imports submitToBeautySubmit, setBeautyUnlocked, etc.; used when WAITLIST_ONLY is false. Internal/conditional. |
| **FlowNav** | `components/FlowNav.jsx` | ACTIVE USER-FACING | “View **Dossier**” link to /dossier; variant “light (paper/**dossier**)”. |
| **Dossier page** | `app/dossier/page.tsx` | LEGACY BUT STILL WIRED | Static sample “Identity **Dossier**”; title “Identity Dossier \| LIGS”. User-facing “dossier”. |
| **PreviewRevealSequence / TerminalResolutionSequence** | `app/beauty/view/PreviewRevealSequence.jsx`, `app/beauty/view/TerminalResolutionSequence.jsx` | LEGACY BUT STILL WIRED | “Scanning class registry…”, “Scanning sample registry…”; whois-origin/aperture styling. TerminalResolutionSequence: “View Dossier” link. |
| **InteractiveReportSequence** | `app/beauty/view/InteractiveReportSequence.jsx` | LEGACY BUT STILL WIRED | Uses getReportSections(profile); “Human WHOIS protocol” (FlowNav). |
| **ReportStep / ArtifactReveal** | `app/beauty/view/ReportStep.jsx` | BACKEND / INTERNAL ONLY | Report step UI; no dossier/beauty copy in user strings. |
| **ArchetypeArtifactCard** | `components/ArchetypeArtifactCard.jsx` | BACKEND / INTERNAL ONLY | `registryVariant`, `registry-dossier`; “beauty-cream” CSS. |
| **LigsFooter** | `components/LigsFooter.jsx` | LEGACY BUT STILL WIRED | `beauty-body`, `beauty-text-muted`, `beauty-line` (CSS). |
| **PreviewCardModal** | `components/PreviewCardModal.jsx` | LEGACY BUT STILL WIRED | variant “beauty”; “Beauty Profile”; “/beauty/start”. |
| **PayUnlockButton** | `components/PayUnlockButton.tsx` | BACKEND / INTERNAL ONLY | beauty-profile-*.json. |
| **Stripe webhook / checkout** | `app/api/stripe/webhook/route.ts`, `app/api/stripe/create-checkout-session/route.ts` | BACKEND / INTERNAL ONLY | Report checkout, send-beauty-profile. |
| **Email send-beauty-profile** | `app/api/email/send-beauty-profile/route.ts` | BACKEND / INTERNAL ONLY | Post-purchase email. |
| **LigsStudio** | `components/LigsStudio.tsx` | BACKEND / INTERNAL ONLY | “Save as Exemplar Card”; exemplarCard; internal tooling. |
| **archetype-public-assets** | `lib/archetype-public-assets.ts` | BACKEND / INTERNAL ONLY | exemplarCard slot naming; asset URLs. |
| **Engine spec** | `lib/engine-spec.ts` | BACKEND / INTERNAL ONLY | “Exemplar Card” in spec text. |
| **Sample report** | `lib/sample-report.ts` | BACKEND / INTERNAL ONLY | “registry” in copy; used by dossier sample. |
| **Middleware** | `middleware.ts` | BACKEND / INTERNAL ONLY | Redirects /beauty to /origin when waitlist-only; no user-facing copy. |

---

## 3. FREE WHOIS DATA FLOW

End-to-end flow for the free Human WHOIS experience: user input → archetype resolution → free report rendering → waitlist submission → email payload → confirmation send. Exact files and functions.

| Step | What happens | File(s) | Function(s) / entry points |
|------|----------------|---------|----------------------------|
| 1. User input on /origin | User sees WHOIS prompt, handshake, then sequential intake (name, date, place, time, email). | `app/origin/page.jsx`, `components/OriginTerminalIntake.jsx` | `OriginTerminalIntake`; state: `formData`, `phase`, `currentField`. Prompts: `INTAKE_PROMPTS` (name, birthDate, birthPlace, birthTime, email). |
| 2. Date parsing / validation | Birth date parsed and optionally confirmed. | `components/OriginTerminalIntake.jsx`, `lib/terminal-intake/parseInputs.ts` | `parseDate()` (from parseInputs); local date-confirm state. |
| 3. Archetype resolution | Archetype (and solar segment) derived from birth date. | `lib/terminal-intake/resolveArchetypeFromDate.js` | `resolveArchetypeFromDate(dateStr)`; used on date confirm and in processing. State: `resolvedArchetypeFromDate`. |
| 4. Solar segment label | Solar season segment for display. | `components/OriginTerminalIntake.jsx` | Uses same date → segment logic (e.g. from resolve or inline); displayed as “Solar segment resolved: …”. |
| 5. Free WHOIS result rendering | Registry Record, Identity Registration Confirmation, Registry Artifacts, Archetype Expression, Registry Extract, CTA. | `components/OriginTerminalIntake.jsx` | Completion block (~755–931): `archetypeForCompletion`; `getArchetypeExpressionLines(archetypeForCompletion)`; `getRegistryArtifactUrls(formData.name, formData.birthDate, archetypeForCompletion)` → arcUrl, primeUrl; sections rendered inline. |
| 6. Archetype expression copy | Line1 (humanExpression — civilizationFunction), line2 (Typical expression contexts: environments). | `components/OriginTerminalIntake.jsx`, `lib/archetype-preview-config.js` | `getArchetypeExpressionLines(archetype)` (lines 83–97) → `getArchetypePreviewConfig(archetype).teaser`. |
| 7. Waitlist submit | Client POST to /api/waitlist with email, source, birthDate, name, birthPlace, birthTime; server may add preview_archetype, solar_season. | `components/OriginTerminalIntake.jsx`, `app/api/waitlist/route.ts` | OriginTerminalIntake: build payload, `fetch("/api/waitlist", { method: "POST", body })`. Route: `POST(req)`; parse body; `approximateSunLongitudeFromDate` + `getPrimaryArchetypeFromSolarLongitude` + `SOLAR_SEASONS` for server-side archetype/season. |
| 8. Blob insert (new signup) | Entry written to Blob. | `app/api/waitlist/route.ts`, `lib/waitlist-store.ts` | `insertWaitlistEntry({ email, source, preview_archetype, solar_season, name, birthDate, birthPlace, birthTime })`; `insertIfNew(entry)`; `put(path, JSON.stringify(payload), …)`. |
| 9. Email payload construction | Payload built from request body (new) or from stored entry (duplicate resend). | `app/api/waitlist/route.ts` | New: `created_at`, `source`, optional `preview_archetype`, `solar_season`, `name`, `birthDate`, `birthPlace`, `birthTime`. Duplicate: same keys from `entry` via `getWaitlistEntryByEmail(email)`. |
| 10. Confirmation email send | HTML and text built; Resend (or SendGrid) called. | `lib/email-waitlist-confirmation.ts` | `sendWaitlistConfirmation(email, payload)`; `getRegistryArtifactImageUrl(payload?.preview_archetype, email)`; `buildWaitlistConfirmationHtml(payload, artifactImageUrl)`; `buildWaitlistConfirmationText(payload)`; `fetch("https://api.resend.com/emails", …)`. |
| 11. Record confirmation sent (optional) | Blob entry updated with last_confirmation_sent_at, confirmation_send_count. | `app/api/waitlist/route.ts`, `lib/waitlist-store.ts` | On send success: `recordConfirmationSent(email)`; in waitlist-store: `get(path)`, merge, `put(path, JSON.stringify(merged), …)`. |

---

## 4. USER-FACING COPY INVENTORY

Exact files containing user-facing copy for /origin, free WHOIS result, registry confirmation, waitlist email, and CTAs; plus remaining copy that says or implies beauty, dossier, exemplar, or report document.

### 4.1 /origin landing

| File | Copy (representative) |
|------|------------------------|
| `components/OriginTerminalIntake.jsx` | “WHOIS &lt;your name&gt;”; “Birth date:”, “Place of birth:”, “Birth time (or UNKNOWN):”, “Contact email:”; handshake lines; “Solar segment resolved: …”, “Base archetype detected: …”; processing lines; “Registry Record”, “Query: …”, “Registry: LIGS Human Identity Registry”; “Subject Name”, “Birth Date”, “Birth Location”, “Birth Time”, “Solar Segment”, “Archetype Classification: …”, “Registry Status: Registered”, “Created Date”, “Record Authority: LIGS Human Identity Registry”; “Identity Registration Confirmation”, “This identity has been successfully registered within the LIGS Human Identity Registry.”, “Record integrity verified.”; “Registry Artifacts”, “Archetype Identity Mark”, “Archetype Field Visualization”; “Archetype Expression”, “Archetype Classification: …”, line1/line2; “Registry Extract — Expanded Report Fields”; “NOTICE: Additional registry fields…”, “Official WHOIS Human Registration Report — Not Yet Released”; “← Return to Origin”, “View Your WHOIS Registration Report Preview”; “Registry Nodes Recorded: …”, “LIGS Human Identity Registry”; “Confirmation dispatch: …”; #whois-preview: “WHOIS HUMAN REGISTRATION REPORT”, “Preview Extract”, “IDENTITY ARCHITECTURE”, “FIELD CONDITIONS”, “ARCHETYPE EXPRESSION”, “COSMIC TWIN RELATION”, “INTERPRETIVE NOTES”. |

### 4.2 Free WHOIS result screen

Same as above; the “free WHOIS result” is the completion block and #whois-preview in `OriginTerminalIntake.jsx` (no separate page).

### 4.3 Registry confirmation language

| File | Copy |
|------|------|
| `components/OriginTerminalIntake.jsx` | “Identity Registration Confirmation”, “This identity has been successfully registered…”, “Record integrity verified.”; “Confirmation dispatch:” + waitlistConfirmationLabel. |
| `lib/email-waitlist-confirmation.ts` | “LIGS HUMAN WHOIS REGISTRY”, “Registry confirmation notice”; “Human WHOIS Registry Record”; “You now have access to the Human WHOIS registry. Full node analytics will become available when the registry opens.”; “Return to the registry”; “This message was generated automatically by the registry.” |

### 4.4 Waitlist confirmation email

| File | Copy |
|------|------|
| `lib/email-waitlist-confirmation.ts` | Subject: “Your identity query has been logged”. Body: header and record block (Subject, Birth Date, Birth Time, Birth Location, Primary Archetype, Solar Season Segment, Registry Status, Registry Entry Timestamp); reminder paragraph; “Return to the registry”; footer “LIGS Systems”, “This message was generated automatically by the registry.” |

### 4.5 CTAs tied to Human WHOIS

| File | Copy |
|------|------|
| `components/OriginTerminalIntake.jsx` | “View Your WHOIS Registration Report Preview”; “← Return to Origin”. |
| `components/FlowNav.jsx` | “Human WHOIS protocol”; “← Return to Origin”; “View Dossier”. |
| `lib/email-waitlist-confirmation.ts` | “Return to the registry”. |

### 4.6 Remaining user-facing copy that is off-theme (beauty / dossier / exemplar / report document)

| File | Copy / implication |
|------|---------------------|
| `components/FlowNav.jsx` | “View **Dossier**” (link label); variant “light (paper/**dossier**)”. |
| `app/dossier/page.tsx` | “Identity **Dossier** \| LIGS”; “LIGS HUMAN IDENTITY **DOSSIER**”; “Human WHOIS Registry Record” (subtitle is on-theme). |
| `app/beauty/view/ReportDocument.jsx` | “LIGS HUMAN IDENTITY **DOSSIER**”; “Human WHOIS Registry Record” (subtitle on-theme). |
| `app/beauty/start/page.jsx` | “Preparing your **report**…”; “Generate my **report**”. |
| `app/beauty/view/TerminalResolutionSequence.jsx` | “View **Dossier**” (link). |
| `app/beauty/view/InteractiveReportSequence.jsx` | “Human WHOIS protocol” (on-theme). FlowNav “View Dossier” (off-theme). |
| `components/PreviewCardModal.jsx` | “This **report** doesn’t have a **Beauty Profile** yet. Generate one via /beauty.”; variant “beauty”. |
| `components/StaticButton.jsx` | “Generate a **report** first to unlock”. |
| Route paths | `/beauty/*`, `/dossier` — URL naming is legacy. |

---

## 5. IMAGE / ASSET FLOW

Files that determine which images appear where.

| Context | File(s) | How images are chosen |
|---------|---------|------------------------|
| **/origin free WHOIS result** | `components/OriginTerminalIntake.jsx` | `getRegistryArtifactUrls(name, birthDate, archetype)` (lines 189–200): builds arc list from `ARC_FOLDER_BY_ARCHETYPE` + `buildArcImageUrls`, prime list from `PRIME_ASSETS_BY_ARCHETYPE` + `buildPrimeImageUrls`; seed = `hashSeed(name + birthDate)`; arcUrl = arcImages[seed % length]; primeUrl = primeImages[(seed + PRIME_COUNT) % length]. Folders under `public/` (e.g. “ignispectrum arc images”, “ignispectrum-images”). |
| **Waitlist confirmation email** | `lib/email-waitlist-confirmation.ts` | `getRegistryArtifactImageUrl(preview_archetype, email)`: Ignispectrum → IGNIS_V1_ARTIFACTS.finalBeautyField; else seed `email:archetype:registry-email` → `getArchetypePublicAssetUrlWithRotation(archetype, "shareCard", seed)` or `getArchetypePublicAssetUrls(archetype).shareCard` / exemplarCard; `toAbsoluteUrl()`. Uses `lib/archetype-public-assets.ts`, `lib/exemplar-store.ts`. |
| **Beauty view (exemplar or paid)** | `app/beauty/view/BeautyViewClient.jsx`, `lib/report-sections.js`, `app/beauty/view/PreviewRevealSequence.jsx`, `app/beauty/view/ReportStep.jsx` | Profile `imageUrls` (vector_zero, light_signature, final_beauty) or exemplar manifest; `getReportSections(profile)` → imageSrc, baselineImage, lightSignatureImage, finalArtifactImage, archetypeImagePath (from `pickArchetypeFamilyImage` or config). `getArchetypeFamilyUrlsForPreview`, `pickArchetypeFamilyImage` from `lib/archetype-public-assets.ts`. |
| **Landing / examples grid** | `components/LandingPreviews.jsx`, `app/beauty/BeautyLandingClient.jsx` | Exemplar manifests or public archetype images; `getArchetypePreviewConfig(archetype).archetypeStaticImagePath`; IGNIS_LANDING_URL for Ignis. |

---

## 6. RECOMMENDED WORKING MODEL

- **What the active product is right now (waitlist-only default):** The public product is **/origin**: a single-page WHOIS-style terminal (name → date → place → time → email) that produces a **free Human WHOIS Registry Record** (Registry Record, Identity Registration Confirmation, Registry Artifacts, Archetype Expression, Registry Extract) and submits to the **waitlist**. Confirmation email is the **Human WHOIS registry record + reminder** (payload-driven; no engine run). The canonical entry point is `/` (rewritten to /origin); `/beauty` and `/beauty/` redirect to /origin when `NEXT_PUBLIC_WAITLIST_ONLY` is not `"0"`.

- **Legacy subsystems that still exist:** (1) **/beauty** (landing, start, view, success, cancel) and **Beauty profile/engine flow** — used when waitlist-only is turned off; (2) **/dossier** — static sample “Identity Dossier”; (3) **ReportDocument / InteractiveReportSequence** — “LIGS HUMAN IDENTITY DOSSIER” and report sections from Beauty profile; (4) **Exemplar** manifests and synthetic reports — used for exemplar-* reportIds and asset slots (exemplarCard, shareCard, marketingBackground). Naming (“beauty”, “dossier”, “exemplar”, “report”) is legacy; behavior is still wired.

- **What to treat as canonical for Human WHOIS work:** (1) **`app/origin/*`** and **`components/OriginTerminalIntake.jsx`** — structure and copy for the free WHOIS record and flow. (2) **`lib/email-waitlist-confirmation.ts`** — confirmation email body and registry wording. (3) **`lib/terminal-intake/resolveArchetypeFromDate.js`** and **`lib/archetype-preview-config.js`** — archetype and expression for the free record. (4) **`docs/WHOIS-HUMAN-REGISTRATION-REPORT-MVP.md`** — section order and field names for free vs paid. (5) **`app/api/waitlist/route.ts`** and **`lib/waitlist-store.ts`** — payload shape and storage; no change for WHOIS framing. Use “Human WHOIS”, “LIGS Human WHOIS Registry”, “free WHOIS report”, “registry access”, “full node analytics” in new or updated user-facing copy.

- **What to avoid unless intentionally migrating:** (1) Adding new user-facing “beauty” or “dossier” wording. (2) Using “report document” or “report” in a way that conflicts with “Human WHOIS Registry Record” or “free WHOIS report”. (3) Relying on “exemplar” in product-facing strings (internal/Studio is fine). (4) Changing origin/email payload or waitlist API for framing-only work. When touching legacy routes or components, treat them as **LEGACY BUT STILL WIRED** and avoid spreading legacy terms to new surfaces.

---

*Audit only; no code changes.*
