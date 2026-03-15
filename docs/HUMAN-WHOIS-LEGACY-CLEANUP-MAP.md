# Human WHOIS — Legacy Copy & Route Cleanup Map

**Read-only audit.** No code changes. Purpose: precise map of remaining user-facing legacy language and routes that conflict with Human WHOIS framing, plus minimum safe copy-only cleanup plan.

---

## 1. USER-FACING LEGACY COPY TO REPLACE

Every remaining **visible** string that says or implies beauty, dossier, exemplar, report document, “view dossier”, or other off-theme legacy wording. (Excludes comments, internal variable names, backend logs, tests, and Studio-internal UI.)

| # | File path | Component / function | Exact current string | Where it appears in the UX | ACTIVE in waitlist-only flow? |
|---|-----------|----------------------|----------------------|----------------------------|-------------------------------|
| 1 | `components/FlowNav.jsx` | FlowNav (default export) | `View Dossier` | Nav link text (bottom of page) | **No** — FlowNav is only rendered on `/beauty/*` pages; when waitlist-only, `/beauty` redirects to `/origin`, so users do not see this link. |
| 2 | `components/FlowNav.jsx` | FlowNav | `variant: "light" (paper/dossier)` | JSDoc only (not visible to user) | N/A — comment. |
| 3 | `app/dossier/page.tsx` | metadata export | `title: "Identity Dossier \| LIGS"` | Browser tab / SEO title when user is on `/dossier` | **Yes** — `/dossier` is reachable by direct URL or bookmark. |
| 4 | `app/dossier/page.tsx` | metadata export | `description: "Sample LIGS Human Identity Dossier — registry record and report sections."` | Meta description (SEO / social) for `/dossier` | **Yes** (same as above). |
| 5 | `app/dossier/page.tsx` | DossierPage | `LIGS HUMAN IDENTITY DOSSIER` | Main heading (h1) on `/dossier` page | **Yes**. |
| 6 | `app/beauty/view/ReportDocument.jsx` | ReportDocument | `LIGS HUMAN IDENTITY DOSSIER` | Main heading (h1) on report view (when user has a reportId and views via `/beauty/view`) | **No** in waitlist-only — `/beauty/view` is not reached (no reportId flow from origin in waitlist-only). Only if WAITLIST_ONLY=0 and user has a report. |
| 7 | `app/beauty/view/TerminalResolutionSequence.jsx` | TerminalResolutionSequence | `View Dossier` | Nav link in resolution sequence footer | **No** — only on `/beauty/view`. |
| 8 | `app/beauty/view/InteractiveReportSequence.jsx` | InteractiveReportSequence | `View Dossier` | Nav link in report sequence | **No** — only on `/beauty/view`. |
| 9 | `app/beauty/layout.jsx` | metadata export | `title: "Beauty"` | Browser tab when on any `/beauty/*` route | **No** in waitlist-only — `/beauty` redirects to `/origin`. |
| 10 | `app/beauty/layout.jsx` | metadata export | `description: "Your Beauty Signature begins here. Beauty is coherent aliveness."` | Meta description for `/beauty` | **No** (same). |
| 11 | `app/beauty/start/page.jsx` | (inline) | `Preparing your report…` | Loading state heading on `/beauty/start` | **No** — legacy route. |
| 12 | `app/beauty/start/page.jsx` | (inline) | `Generate my report` | Submit button label on `/beauty/start` | **No**. |
| 13 | `app/beauty/start/page.jsx` | (inline) | `Generate your Light Signature Report` | Heading on `/beauty/start` form | **No**. |
| 14 | `app/beauty/success/page.jsx` | (inline) | `Generate my report` | Button/link text on success page | **No**. |
| 15 | `app/beauty/BeautyLandingClient.jsx` | (inline) | `Generate my report` | CTA on beauty landing (when WAITLIST_ONLY=0) | **No**. |
| 16 | `components/StaticButton.jsx` | StaticButton | `title="Generate a report first to unlock"` | Tooltip on disabled button | **No** — used in legacy/preview contexts. |
| 17 | `components/PayUnlockButton.tsx` | PayUnlockButton | `"This report doesn't have a Beauty Profile yet. Use the full Beauty flow at /beauty to generate one, then return here to unlock."` | Error/empty state message | **No** — purchase/unlock flow. |
| 18 | `components/PayUnlockButton.tsx` | PayUnlockButton | `Your Beauty Profile Preview` | Heading in preview section | **No**. |
| 19 | `components/PreviewCardModal.jsx` | PreviewCardModal | `"This report doesn't have a Beauty Profile yet. Generate one via /beauty."` | Checkout error message in modal | **No** — modal on landing when WAITLIST_ONLY=0. |
| 20 | `app/beauty/view/BeautyViewClient.jsx` | (fallback profile) | `"[DRY RUN] Placeholder report for layout verification. Generate a Beauty Profile via /beauty to view a real report."` | Placeholder fullReport text when no profile | **No**. |
| 21 | `app/api/email/send-beauty-profile/route.ts` | (email body) | `View your full Beauty Profile` | Link text in post-purchase email | **No** — backend; only sent when purchase flow runs. |
| 22 | `app/api/email/send-beauty-profile/route.ts` | (email body) | `alt="Beauty Profile"` | Image alt in email | **No**. |
| 23 | `app/beauty/view/page.jsx` | generateMetadata | `title: "Light Identity Report"` (fallbacks) | Tab title when report not found or loading | **No** — `/beauty/view` not in waitlist-only flow. |
| 24 | `app/beauty/view/page.jsx` | generateMetadata | `title = profile.subjectName ?? "Light Identity Report"` | Tab title for report view | **No**. |
| 25 | `app/beauty/view/page.jsx` | generateMetadata | `description: profile.emotionalSnippet ?? "Your Light Identity Report"` | Meta description | **No**. |
| 26 | `app/beauty/error.jsx` | (inline) | `className="beauty-heading"` etc. | Error page styling (CSS class name; “beauty” is in class, not visible copy) | **No** — class name only; no literal “beauty” in visible text. |

**Summary:** In the **waitlist-only** (default) flow, the only legacy **user-facing** copy that is **ACTIVE** is on **`/dossier`**: page title “Identity Dossier | LIGS”, meta description “Sample LIGS Human Identity Dossier…”, and heading “LIGS HUMAN IDENTITY DOSSIER”. The “View Dossier” link is **not** visible in waitlist-only because FlowNav is only used on `/beauty/*`, which redirects to `/origin`.

---

## 2. USER-FACING LEGACY ROUTES

All current routes that conflict with or sit outside the Human WHOIS frame.

| Route path | Reachable from current live flow? | Redirected by middleware? | Recommendation |
|------------|-----------------------------------|----------------------------|------------------|
| `/` | Yes — entry point | Rewrite to `/origin` (URL stays `/`) | **Leave alone** — canonical entry; content is origin. |
| `/origin` | Yes — main landing | No | **Canonical** — no change. |
| `/dossier` | Yes — via direct URL or old link; not linked from origin UI | No | **Relabel/copy-only:** Change page title and h1 to Human WHOIS framing (e.g. “Sample WHOIS Registry Record” / “Sample Human WHOIS Record”) so the route can stay; no redirect required. |
| `/beauty` | No — user is redirected to `/origin` when waitlist-only | Yes (308 to `/origin`) when `NEXT_PUBLIC_WAITLIST_ONLY !== "0"` | **Leave alone for now** — already hidden from users; backend and future paid flow depend on it. |
| `/beauty/` | Same as `/beauty` | Same | Same. |
| `/beauty/start` | No (redirect at `/beauty`) | No direct rule; user must hit `/beauty` first, which redirects | **Leave alone** — not reachable in waitlist-only. |
| `/beauty/view` | No | No | **Leave alone** — legacy report view; no copy change needed for “minimum safe” unless opening that flow. |
| `/beauty/success` | No | No | **Leave alone**. |
| `/beauty/cancel` | No | No | **Leave alone**. |
| `/beauty/sample-report` | No (and may redirect to /origin per docs) | Not in middleware | **Leave alone**. |
| `/ligs-studio` | No — internal tool | No redirect (cookie gate) | **Safe to ignore** for Human WHOIS product framing. |

**Summary:** The only route that is both **reachable** and **shows legacy framing** in the default product is **`/dossier`**. Relabel that page (title + heading) for Human WHOIS; leave route path and structure as-is. All `/beauty/*` routes are already unreachable in waitlist-only and can be left as-is for a minimum safe cleanup.

---

## 3. HUMAN WHOIS NAV / CTA CLEANUP TARGETS

Exact files and strings to update **first** to remove visible legacy framing from nav, CTAs, page titles, subtitles, and headings. Ordered by impact on the live (waitlist-only) experience.

### 3.1 High priority (active in waitlist-only or single URL away)

| File path | Location | Current string | Suggested replacement (copy-only) |
|-----------|----------|----------------|-----------------------------------|
| `app/dossier/page.tsx` | `metadata.title` | `Identity Dossier \| LIGS` | `Sample WHOIS Registry Record \| LIGS` or `Sample Human WHOIS Record \| LIGS` |
| `app/dossier/page.tsx` | `metadata.description` | `Sample LIGS Human Identity Dossier — registry record and report sections.` | `Sample LIGS Human WHOIS Registry Record — registry fields and report sections.` |
| `app/dossier/page.tsx` | Main h1 | `LIGS HUMAN IDENTITY DOSSIER` | `SAMPLE HUMAN WHOIS REGISTRY RECORD` or keep “LIGS” and use `SAMPLE WHOIS REGISTRY RECORD` |

### 3.2 Medium priority (visible when user is on legacy routes)

| File path | Location | Current string | Suggested replacement (copy-only) |
|-----------|----------|----------------|-----------------------------------|
| `components/FlowNav.jsx` | Link text | `View Dossier` | `View sample record` or `Sample registry record` |
| `app/beauty/view/ReportDocument.jsx` | h1 | `LIGS HUMAN IDENTITY DOSSIER` | `HUMAN WHOIS REGISTRY RECORD` or `WHOIS HUMAN REGISTRATION REPORT` (align with MVP doc) |
| `app/beauty/view/TerminalResolutionSequence.jsx` | Link text | `View Dossier` | Same as FlowNav. |
| `app/beauty/view/InteractiveReportSequence.jsx` | Link text | `View Dossier` | Same as FlowNav. |

### 3.3 Lower priority (only when purchase/non–waitlist flow is on)

| File path | Location | Current string | Note |
|-----------|----------|----------------|------|
| `app/beauty/layout.jsx` | metadata | `Beauty` / `Your Beauty Signature…` | Replace with Human WHOIS / registry framing if ever surfacing beauty routes again. |
| `app/beauty/start/page.jsx` | Headings / button | `Preparing your report…`, `Generate my report`, `Generate your Light Signature Report` | Prefer “registry report” or “WHOIS report” wording. |
| `app/beauty/success/page.jsx` | Button | `Generate my report` | Same. |
| `app/beauty/BeautyLandingClient.jsx` | CTA | `Generate my report` | Same. |
| `components/StaticButton.jsx` | title | `Generate a report first to unlock` | “Generate a registry report…” or “Complete WHOIS query first…”. |
| `components/PayUnlockButton.tsx` | Messages | Beauty Profile / Beauty flow wording | “Registry report” / “WHOIS report” / “full report” instead of “Beauty Profile” and “Beauty flow”. |
| `components/PreviewCardModal.jsx` | Error | “Beauty Profile” / “/beauty” | Same idea. |
| `app/api/email/send-beauty-profile/route.ts` | Email link/alt | “Beauty Profile” | “Your registry report” / “Your WHOIS report”. |

---

## 4. MINIMUM SAFE CLEANUP PLAN

Smallest set of **copy-only** changes that make the live product feel consistently Human WHOIS without restructuring backend or routes.

### Scope

- **In scope:** Only strings that are **visible** in the default waitlist-only flow or one click/URL away (origin + `/dossier`).
- **Out of scope:** Backend renames, route path changes, API renames, Studio, tests, comments.

### Step 1 — Dossier page (only page with legacy framing reachable in waitlist-only)

- **File:** `app/dossier/page.tsx`
- **Changes:**
  1. `metadata.title`: `"Identity Dossier | LIGS"` → `"Sample WHOIS Registry Record | LIGS"` (or `"Sample Human WHOIS Record | LIGS"`).
  2. `metadata.description`: `"Sample LIGS Human Identity Dossier — registry record and report sections."` → `"Sample LIGS Human WHOIS Registry Record — registry fields and report sections."`
  3. Main heading (h1): `"LIGS HUMAN IDENTITY DOSSIER"` → `"SAMPLE HUMAN WHOIS REGISTRY RECORD"` (or `"SAMPLE WHOIS REGISTRY RECORD"` if you want to keep “LIGS” elsewhere on the page).

**Result:** Users who hit `/dossier` (direct or bookmark) see Human WHOIS framing only; no “dossier” in title or main heading.

### Step 2 (optional) — Nav link used on legacy routes only

- **File:** `components/FlowNav.jsx`
- **Change:** Link text `"View Dossier"` → `"Sample registry record"` (or `"View sample record"`). Link still goes to `/dossier`.
- **When to do:** When you next enable or touch `/beauty/*` flows so that FlowNav is visible again; not required for a “minimum safe” cleanup if the only goal is waitlist-only consistency.

### Step 3 (optional) — Report document heading (legacy report view)

- **File:** `app/beauty/view/ReportDocument.jsx`
- **Change:** h1 `"LIGS HUMAN IDENTITY DOSSIER"` → `"HUMAN WHOIS REGISTRY RECORD"` or per `docs/WHOIS-HUMAN-REGISTRATION-REPORT-MVP.md` (e.g. “WHOIS Human Registration Report” for paid). Subtitle “Human WHOIS Registry Record” can stay.
- **When to do:** When you work on or re-enable the report view; not required for minimum safe cleanup.

### What not to do in “minimum safe”

- Do **not** change route paths (`/dossier`, `/beauty/*`).
- Do **not** change backend identifiers (beauty profile, exemplar, etc.).
- Do **not** change `app/origin/*` or `components/OriginTerminalIntake.jsx` (already WHOIS-aligned).
- Do **not** change waitlist or email copy (already aligned).
- Do **not** remove or redirect `/dossier` unless you explicitly want to retire the sample page.

### Summary

- **Minimum safe cleanup = Step 1 only:** three copy edits in `app/dossier/page.tsx` (title, description, h1). That alone makes every **reachable** user-facing surface in the default product use Human WHOIS framing.
- Steps 2 and 3 are optional follow-ups when you touch legacy routes or the report view.

---

*Audit only; no code changes.*
