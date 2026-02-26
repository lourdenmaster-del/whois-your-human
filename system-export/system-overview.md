# System Overview — LIGS (Light Identity Grid System)

## What This System Does at a High Level

LIGS is a web application that generates personalized "Light Identity Reports" and "Beauty Profiles" from birth data using AI. The system combines:

1. **Report generation** — A 14-section scientific-mythic identity report based on birth date, time, and location
2. **Beauty Profile (E.V.E.)** — A filtered aesthetic profile derived from the report, with imagery prompts and optional DALL·E 3–generated images
3. **Payment flow** — Stripe Checkout for paid access to Beauty Profiles ($9.99)
4. **Email delivery** — Post-purchase email with a link to view the Beauty Profile

The underlying framework ("LIGS") uses a voice architecture (RAW SIGNAL, CUSTODIAN, ORACLE), physics language, and an official archetype system to produce structurally consistent, mythic-scientific identity narratives.

---

## User Flow: Landing → Payment → Report/Image Delivery

### Flow 1: Free Light Identity Report (Landing Page)

1. User lands on `/` (LandingPage)
2. Fills form: full name, birth date, birth time, birth location, email
3. Submits → `POST /api/engine/generate` (via `submitToEngine` in `lib/engine-client.js`)
4. Engine generates full report, emotional snippet, image prompts, Vector Zero
5. Report is persisted via `saveReportAndConfirm` (Blob or in-memory)
6. Returns `reportId`; client fetches `GET /api/report/{reportId}` for display
7. User sees emotional snippet, image prompts, optional full report; URL updates to `/?reportId=...`

### Flow 2: Beauty Profile (Paid Path — Intended)

1. User on Beauty page (`/beauty`) or post-E.V.E. flow
2. Submits form → `POST /api/beauty/submit` (runs `deriveFromBirthData`, forwards to `POST /api/engine`)
3. Engine route: calls `POST /api/engine/generate`, fetches report, runs E.V.E. filter (GPT-4o)
4. Beauty Profile saved to Blob via `saveBeautyProfileV1`
5. Returns Beauty Profile with `reportId`
6. User directed to Stripe Checkout: `POST /api/stripe/create-checkout-session` with `{ reportId }`
7. After payment, Stripe webhook `checkout.session.completed` → `POST /api/email/send-beauty-profile`
8. User receives email with link to `/beauty/view?reportId=...`
9. `/beauty/view` loads profile via `GET /api/beauty/{reportId}`

**Current gap:** No frontend invokes `create-checkout-session`. The "Pay to Unlock Full Report" button has no handler. Stripe is implemented but not wired from the UI.

### Flow 3: Demo

1. User visits Beauty page; `GET /api/beauty/demo` runs
2. Demo uses Leonardo da Vinci birth data, calls `POST /api/engine/generate`, then DALL·E 3 for one image
3. Returns excerpt, full report, image URL — no payment

---

## Technologies Used

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Language** | TypeScript, JavaScript (JSX) |
| **Styling** | Tailwind CSS 4, PostCSS |
| **Fonts** | Space Grotesk (root), system serif (beauty) |
| **AI** | OpenAI GPT-4o (chat), DALL·E 3 (images) |
| **Storage** | Vercel Blob (`ligs-reports/`, `ligs-beauty/`, `ligs-images/`) or in-memory fallback |
| **Payments** | Stripe Checkout, webhooks |
| **Email** | Resend or SendGrid |
| **Astrology** | `astronomy-engine` (Sun/Moon/Rising from birth data), OpenStreetMap Nominatim (geocoding) |

---

## Deployment Environment

- **Platform:** Vercel (per `vercel.json`: `{ "framework": "nextjs" }`)
- **Build:** `next build` (Turbopack)
- **Runtime:** Node.js
- **Env vars:** `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` or `SENDGRID_API_KEY`, `EMAIL_FROM`, `VERCEL_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VERCEL_URL`, `DRY_RUN` (optional)

---

## Where AI Is Called

| Location | Purpose | Model | API |
|----------|---------|-------|-----|
| `app/api/engine/generate/route.ts` | Full report + emotional snippet | gpt-4o | `chat.completions.create` |
| `app/api/engine/generate/route.ts` | Image prompts (2 strings) | gpt-4o | `chat.completions.create` |
| `app/api/engine/generate/route.ts` | Vector Zero derivation | gpt-4o | `chat.completions.create` |
| `app/api/engine/route.ts` | E.V.E. Beauty filter | gpt-4o | `chat.completions.create` |
| `app/api/beauty/demo/route.ts` | Demo image | dall-e-3 | `images.generate` |
| `app/api/generate-image/route.ts` | User image generation | dall-e-3 | `images.generate` |

---

## Where Stripe Is Handled

| Route | Method | Behavior |
|-------|--------|----------|
| `/api/stripe/create-checkout-session` | POST | Validates `reportId`, loads Beauty Profile, creates Checkout Session ($9.99), returns `url` |
| `/api/stripe/webhook` | POST | Verifies signature, on `checkout.session.completed` loads profile, POSTs to `/api/email/send-beauty-profile` |

Metadata: `{ reportId }` on session. Success URL: `/beauty/success?reportId=...`; cancel URL: `/beauty/cancel`.

---

## Where State Is Stored

| Data | Storage | Key Pattern |
|------|---------|-------------|
| Light Identity Report | Vercel Blob or in-memory | `ligs-reports/{reportId}.json` |
| Beauty Profile V1 | Vercel Blob only | `ligs-beauty/{reportId}.json` |
| Generated images | Vercel Blob | `ligs-images/{reportId}/{slug}.png|jpg` |
| Rate limits | In-memory Map | `${key}:${ip}` (per-IP sliding window) |

When `BLOB_READ_WRITE_TOKEN` is unset, reports use in-memory storage; Beauty Profiles require Blob and fail if token is missing.
