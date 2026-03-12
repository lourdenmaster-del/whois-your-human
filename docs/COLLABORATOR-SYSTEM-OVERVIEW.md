# LIGS — System Summary for Collaborators

**Purpose:** Align collaborators on what we're building, how it fits together, and where to find things. Keep this in sync with **SYSTEM_SNAPSHOT.md** (authoritative for routes, env, integrations).

**References:** SYSTEM_SNAPSHOT.md (structural truth), docs/LIGS-VOICE-ENGINE-SPEC.md (Voice Profile), SYSTEM_OVERVIEW.md (pipeline deep-dive).

---

## 1. What Is LIGS?

LIGS is a **light-identity / beauty profile** system. Users provide birth data (date, time, location). The system produces:

1. **Light Identity Report** — Structured report with archetype, deviations, corrective vectors, aesthetic descriptions.
2. **Beauty Profile** — Curated experience: emotional snippet, imagery (Vector Zero, Light Signature, Final Beauty), full report.
3. **Marketing assets** — Archetype-driven visuals and overlay copy for cards.

Everything is **archetype-driven**: 12 canonical archetypes (Ignispectrum, Stabiliora, Radiantis, Tenebris, Duplicaris, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis) drive voice, visuals, and tone.

---

## 2. Architecture at a Glance

| Layer    | Stack |
|----------|--------|
| Frontend | Next.js 16, React 19, App Router |
| Backend  | Next.js API routes (serverless) |
| AI       | OpenAI GPT-4o (reports, voice, E.V.E.), DALL·E 3 (images) |
| Storage  | Vercel Blob (reports, beauty profiles, images, waitlist) |
| Payments | Stripe Checkout + webhook (when waitlist-only disabled) |
| Email    | Resend or SendGrid (waitlist confirmation, post-purchase) |

---

## 3. Public Surface (Current Design)

- **`/`** — Rewritten to `/origin` (no redirect). No standalone root page.
- **`/origin`** — **Canonical public landing.** WHOIS-style terminal: **OriginTerminalIntake** (idle → Enter → intake: name, date, time, place, email → processing → waitlist or CTA). Black full-screen, aperture law, monospace. Registry counter at bottom ("Registry nodes recorded: {count}" + annotation). Protocol nav (e.g. View Dossier). No marketing nav; restrained, protocol-native.
- **`/beauty`**, **`/beauty/`** — 308 redirect to `/origin`. Beauty landing is not the main public entry.
- **`/api/waitlist`** — POST; email capture; rate limited; Blob-backed; duplicate check; confirmation email (white-paper registry notice, archetype-based artifact image).
- **`/api/waitlist/count`** — GET; public-safe; returns `{ total }` only (real count + seed); used by `/origin` registry readout.
- **`/api/exemplars`** — GET; exemplar manifests for landing/grid.
- **Not linked from origin:** `/beauty/start`, `/beauty/view`, `/dossier`, `/ligs-studio`, `/voice`, `/api/dev/*`, Stripe checkout.

**Waitlist-only default:** With `NEXT_PUBLIC_WAITLIST_ONLY` not set to `"0"`, origin flow completes with waitlist signup and redirect to exemplar view (`/beauty/view?reportId=exemplar-{archetype}`). Set to `"0"` to re-enable purchase/Stripe flow.

---

## 4. User-Facing Flows

### Origin (canonical landing)

- **OriginTerminalIntake** (`components/OriginTerminalIntake.jsx`): Idle → "Press ENTER to begin" → boot lines → intake (name, date with confirm, time, place, email) → processing lines → archetype line → waitlist POST or CTA. On success: "Contact node recorded", redirect to exemplar view (waitlist-only) or checkout path. Registry count fetched from `/api/waitlist/count`; displayed below aperture/footer. Protocol nav (e.g. View Dossier). Visual law: black field, silver/gray text, no purple residue.

### Beauty view (preview / report)

- **`/beauty/view?reportId=…`** — **BeautyViewClient**: For exemplar reportIds, **PreviewRevealSequence** (aperture law, init → archetype cycle → family cycle → artifact → continue) then **InteractiveReportSequence**. For real reports, **InteractiveReportSequence** only. Same aperture/terminal styling as origin. Footer: "Human WHOIS protocol", "Return to Origin", "View Dossier". Links and focus use gray/silver (no purple).

### Dossier

- **`/dossier`** — Static sample Identity Dossier (white-paper style). Registry block, six sections, CTA to /origin. Protocol nav ("Return to Origin").

### Other

- **`/beauty/start`** — Birth form (LightIdentityForm); requires unlocked; redirects to /origin if not. Terminal-aligned.
- **`/beauty/success`**, **`/beauty/cancel`** — Post-Stripe and cancelled; terminal-aligned, link back to /origin.
- **`/ligs-studio`** — Internal tool (image vertical slice, compose, marketing). Token-gated when `LIGS_STUDIO_TOKEN` set.
- **`/voice`** — VoiceProfileBuilder (local state).

---

## 5. Key Back-End Flows

- **Waitlist:** POST `/api/waitlist` (body: email, source?, birthDate?; server can set preview_archetype, solar_season) → Blob at `ligs-waitlist/entries/{hash}.json` → fire-and-forget **sendWaitlistConfirmation(email, { created_at, preview_archetype?, solar_season? })**. Confirmation email: white-paper notice, facts block, **one artifact image** chosen by **getRegistryArtifactImageUrl(preview_archetype, email)** (Ignis v1 share card for Ignispectrum; otherwise archetype public shareCard/exemplarCard with deterministic seed `email:archetype:registry-email`; fallback Ignis). Subject: "Your identity query has been logged". CTA: "Return to the registry" → site URL.
- **Engine:** POST `/api/engine/generate` (report only); POST `/api/engine` (E.V.E. pipeline). Constraint Gate on report; E.V.E. filter → Beauty Profile V1 → Blob. When allowExternalWrites: image generation, compose, share card.
- **Beauty:** POST `/api/beauty/create` (or dry-run), GET `/api/beauty/[reportId]`. Load/save Beauty Profile V1, exemplar manifests, image URLs.
- **Stripe:** Checkout session, webhook → post-purchase email (send-beauty-profile).

---

## 6. Where Things Live (high level)

- **Canonical landing:** `app/origin/page.jsx` (renders **OriginTerminalIntake**), `app/origin/layout.jsx`. No `app/page.tsx`; middleware rewrites `/` to `/origin`.
- **Beauty:** `app/beauty/page.jsx` (BeautyLandingClient), `app/beauty/view/BeautyViewClient.jsx`, `app/beauty/view/PreviewRevealSequence.jsx`, `app/beauty/view/InteractiveReportSequence.jsx`, `app/beauty/start/page.jsx`, success/cancel pages.
- **Waitlist / email:** `app/api/waitlist/route.ts`, `app/api/waitlist/count/route.ts`, `lib/waitlist-store.ts`, `lib/waitlist-list.ts` (getWaitlistCount, listWaitlistEntries), **lib/email-waitlist-confirmation.ts** (buildWaitlistConfirmationHtml/Text, getRegistryArtifactImageUrl, sendWaitlistConfirmation).
- **Archetype assets:** `lib/archetype-public-assets.ts` (getArchetypePublicAssetUrlsWithRotation, shareCard/exemplarCard), `lib/exemplar-store.ts` (IGNIS_V1_ARTIFACTS, etc.).
- **Contract / engine:** `src/ligs/archetypes/contract.ts`, engine routes, E.V.E., Constraint Gate, runtime-mode, beauty-profile store, report store.

---

## 7. Design and Conventions

- **Origin law:** Black field, silver/gray/off-white text, protocol/registry feel. No purple accents on origin/preview/report; links and focus use gray/silver. Protocol nav: small monospace links (e.g. Return to Origin, View Dossier).
- **Aperture:** whois-aperture, whois-origin; one protocol state at a time; no terminal chrome.
- **Landing lock:** Do not redesign or refactor `app/origin/page.jsx`, `app/origin/layout.jsx`, `components/OriginTerminalIntake.jsx`, `app/beauty/BeautyLandingClient.jsx`, `components/LandingPreviews.jsx`, origin/landing sections of `app/globals.css` without explicit request.
- **SYSTEM_SNAPSHOT.md** is authoritative for routes, env, integrations; update it when making structural changes.

---

## 8. Environment (summary)

- **OPENAI_API_KEY**, **BLOB_READ_WRITE_TOKEN** — Core.
- **RESEND_API_KEY** or **SENDGRID_API_KEY**, **EMAIL_FROM** — Waitlist confirmation + post-purchase.
- **NEXT_PUBLIC_WAITLIST_ONLY** — Unset or non-`"0"` = waitlist-only; `"0"` = re-enable purchase.
- **LIGS_STUDIO_TOKEN** — When set, gates /ligs-studio and /api/waitlist/list.
- **STRIPE_*** — When purchase flow enabled.
- See SYSTEM_SNAPSHOT.md for full list.

---

## 9. Run / Verify

- `npm install` then `npm run dev`. Visit `/origin` for canonical landing.
- `npm run build` — must pass.
- Tests: `npm run test:run`. Origin/collaborator checks as needed.

*Keep this doc aligned with SYSTEM_SNAPSHOT.md and the codebase after structural or product changes.*

---

## 10. Docs Index

| Doc | Use |
|-----|-----|
| **SYSTEM_SNAPSHOT.md** | Routes, env, integrations — update on structural changes |
| **docs/COLLABORATOR-SYSTEM-OVERVIEW.md** | This file — onboarding |
| **docs/LIGS-VOICE-ENGINE-SPEC.md** | Voice Profile spec |
| **docs/MARKETING-LAYER.md** | Marketing descriptor, visuals, MarketingHeader |
| **SYSTEM_OVERVIEW.md** | LIGS pipeline (Voice, Image, Marketing) |

---

*Last updated: 2026-03-09*
