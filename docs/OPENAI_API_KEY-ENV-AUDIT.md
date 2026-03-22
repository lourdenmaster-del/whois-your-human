# OPENAI_API_KEY — Read-Only Environment Usage Audit

**Date:** 2026-03-15  
**Trigger:** User sees: *"OPENAI_API_KEY not set. Set it in your environment..."*

---

## 1. Every file/function that reads `process.env.OPENAI_API_KEY`

| File | How it's read | Fallback / behavior |
|------|----------------|----------------------|
| **app/api/engine/generate/route.ts** | `process.env.OPENAI_API_KEY?.trim()` (line 399) | None. If falsy → returns 500 with message *"OPENAI_API_KEY not set. Set it in your environment (e.g. Vercel Project Settings → Environment Variables)."* |
| **app/api/engine/route.ts** | `process.env.OPENAI_API_KEY?.trim()` (line 245) | None. If falsy → same 500 message as above (E.V.E. filter path). |
| **app/api/generate-image/route.ts** | `process.env.OPENAI_API_KEY?.trim()` (line 41) | None. If falsy → 500 with message *"OPENAI_API_KEY not set"* (shorter; no “Set it in your environment…”). |
| **app/api/voice/generate/route.ts** | `process.env.OPENAI_API_KEY?.trim()` (line 45) | None. If falsy → `throw new Error("OPENAI_API_KEY not set")`. |
| **src/ligs/image/provider.ts** | `process.env.OPENAI_API_KEY?.trim()` (line 38) | None. If falsy → `throw new Error("OPENAI_API_KEY not set")`. |
| **src/ligs/image/provider-edits.ts** | `process.env.OPENAI_API_KEY?.trim()` (line 25) | None. If falsy → `throw new Error("OPENAI_API_KEY not set")`. |
| **src/ligs/marketing/generateOverlaySpec.ts** | `process.env.OPENAI_API_KEY?.trim()` (line 98) | **Has fallback:** if falsy, calls `generateCopyDeterministic(...)` and does not use OpenAI. |
| **lib/preflight.ts** | `Boolean(process.env.OPENAI_API_KEY?.trim())` (line 34) | No throw; used in checklist only (`OPENAI_API_KEY: set` / `OPENAI_API_KEY missing`). |
| **lib/runtime-mode.ts** | `!process.env.OPENAI_API_KEY?.trim()` (line 22) | Used to set `isDryRun`; no throw. |
| **app/api/debug/env/route.ts** | `process.env.OPENAI_API_KEY \|\| ""` (line 4) | Read for debug display only; no throw. |
| **app/api/exemplars/generate/route.ts** | `!!process.env.OPENAI_API_KEY?.trim()` (line 79) | Used in response hint only (`hasOpenAIKey`); no throw. |

No code path uses a fallback env var (e.g. `OPENAI_*` alternate name); all use only `process.env.OPENAI_API_KEY`.

---

## 2. Which route or button path is currently throwing this error

The **exact** message you reported — *"OPENAI_API_KEY not set. Set it in your environment..."* — is returned from **only** these two handlers:

| Route | File | Line |
|-------|------|------|
| **POST /api/engine/generate** | `app/api/engine/generate/route.ts` | 402–405 |
| **POST /api/engine** (E.V.E. step) | `app/api/engine/route.ts` | 248–251 |

So the error is produced by **one of**:

- **POST /api/engine/generate** when the request is **not** in dry run (no mock); the handler then needs the key for the real OpenAI report call.
- **POST /api/engine** when the E.V.E. filter runs (non–dry-run); after fetching the report from `/api/engine/generate`, it checks the key before calling the E.V.E. OpenAI step.

**Likely UI/flow that hits each:**

- **engine/generate**  
  - LigsStudio **“Generate Report”** with **DRY RUN unchecked** (and, if applicable, `X-Force-Live: 1` and `ALLOW_FORCE_LIVE=true` so the call is live).  
  - Or `/api/dev/beauty-live-once` when not in dry run.
- **engine (E.V.E.)**  
  - Full Beauty flow: **/beauty/start** → create session → **/beauty/success** → backend calls **POST /api/beauty/create** or **POST /api/beauty/submit** → which call **POST /api/engine** → E.V.E. step reads the key.

So: the **exact file and route** producing the message are either  
**`app/api/engine/generate/route.ts` → POST /api/engine/generate**  
or  
**`app/api/engine/route.ts` → POST /api/engine** (E.V.E. branch).

---

## 3. Where that path runs (local vs Vercel)

- **Locally:** When you run `npm run dev` (or a Node server), env is loaded from `.env.local` (and other `.env*`). If `OPENAI_API_KEY` is missing or empty there, the next request that hits one of the two routes above will return this error.
- **Vercel production:** Env is taken from the project’s **Production** environment variables. If the var is not set (or not set for Production), a production request that hits either route will get this error.
- **Vercel preview:** Env is taken from **Preview** (and optionally **Development**). If the var is only set for Production, preview deployments will not see it and will throw when either route is hit.

So the error can appear in **any** of: local dev, Vercel production, or Vercel preview, depending on where the var is missing.

---

## 4. Check: only `process.env.OPENAI_API_KEY` or another fallback?

- Every place that can **throw or return** this (or a similar) error uses **only** `process.env.OPENAI_API_KEY` (with optional `.trim()`).  
- There is **no** fallback to another env var (e.g. `OPENAI_KEY` or `API_KEY`).  
- **generateOverlaySpec.ts** is the only reader that falls back to non-OpenAI behavior (deterministic copy) when the key is missing; it does not surface this error.

---

## 5. Likely causes and short diagnosis

| Cause | Explanation |
|-------|-------------|
| **Wrong environment target** | Var set only for **Production** (or only for **Preview**). The deployment you’re hitting (e.g. preview) doesn’t have the key. |
| **Local dev missing .env.local** | Running locally without `OPENAI_API_KEY` in `.env.local` (or typo in var name). Server reads env at startup. |
| **Stale server / no redeploy** | Locally: added or fixed `.env.local` but didn’t restart the dev server. On Vercel: added/updated the var but didn’t redeploy so the new build has the new env. |
| **Wrong Vercel project** | Deployment is from a different Vercel project that doesn’t have `OPENAI_API_KEY` configured. |
| **Typo in env var name** | In Vercel or `.env.local`, the variable is named e.g. `OPENAI_KEY` or `OPENAI_API_KEY` with a typo; the code only reads `OPENAI_API_KEY`. |

---

## Short diagnosis (exact file and route)

- **Exact message:** *"OPENAI_API_KEY not set. Set it in your environment (e.g. Vercel Project Settings → Environment Variables)."*
- **Exact file(s):**  
  - **`app/api/engine/generate/route.ts`** (lines 401–405), and/or  
  - **`app/api/engine/route.ts`** (lines 247–251).
- **Exact route(s):**  
  - **POST /api/engine/generate** (report generation, non–dry-run), or  
  - **POST /api/engine** (E.V.E. filter step, non–dry-run).

**Most likely in your case:** You’re either (1) in **LigsStudio** with **DRY RUN off** and clicking **“Generate Report”** (hits **POST /api/engine/generate**), or (2) going through the **Beauty paid flow** (create/submit) which calls **POST /api/engine** and runs E.V.E. In both cases, the runtime (local or Vercel) where that request is handled has no `OPENAI_API_KEY` set for that environment. Check that `OPENAI_API_KEY` is set in the same environment (local: `.env.local` + restart; Vercel: correct project and environment and redeploy).
