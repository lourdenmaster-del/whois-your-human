# Audit: Why "Registry channel unavailable." appears

## Exact condition that triggers the message

The UI shows **"Registry channel unavailable."** in two places in `components/OriginTerminalIntake.jsx`:

1. **Line 529 (inside waitlist fetch `.then`):** when `ok` is false — i.e. when `res.ok` is false. So **any HTTP response that is not 2xx** (400, 429, 500, 503, etc.) causes this line.

2. **Line 539 (inside waitlist fetch `.catch`):** when the `fetch()` itself throws (network error, CORS, server unreachable, etc.). The same line is shown.

There is also a third occurrence at **line 373** in `handleRunWhoisClick` (the async path when `WAITLIST_ONLY` and the inline `fetch` returns `!res.ok`). Same condition: non-2xx response.

So the message is the **single generic failure message** for:
- Any non-2xx from `POST /api/waitlist`
- Any network/fetch exception

---

## What response from /api/waitlist causes this

| Server condition | HTTP status | Response body | Server log |
|------------------|-------------|---------------|------------|
| `BLOB_READ_WRITE_TOKEN` missing or empty | **503** | `{ error: "Waitlist not configured" }` | None (no request body parsed yet) |
| Rate limit exceeded | **429** | `{ error: "Too many requests. Please try again later." }` | None |
| Invalid JSON body | **400** | `{ error: "Invalid JSON body" }` | None |
| Email missing | **400** | `{ error: "Email is required" }` | None |
| Invalid email format | **400** | `{ error: "Invalid email format" }` | None |
| Blob write throws (e.g. Blob API error) | **500** | `{ error: "Signup failed. Please try again." }` | `[waitlist] Blob write failed: <msg>` (dev: full msg; prod: masked email + 80 chars) |
| Success (new or duplicate) | **200** | `{ ok: true, ... }` | Success path; no "Registry channel unavailable." |

---

## LIGS_API_OFF and waitlist

**POST /api/waitlist** does **not** use `killSwitchResponse()` from `lib/api-kill-switch.ts`. So **LIGS_API_OFF** does **not** affect the waitlist route. If LIGS_API_OFF is set, waitlist still runs; only the routes that explicitly call `killSwitchResponse()` (e.g. engine, beauty/submit, image/generate, stripe, etc.) return 503.

---

## BLOB_READ_WRITE_TOKEN

- **Where checked:** `app/api/waitlist/route.ts` lines 54–62.
- **Logic:** `hasBlobToken = typeof process.env.BLOB_READ_WRITE_TOKEN === "string" && process.env.BLOB_READ_WRITE_TOKEN.length > 0`. If false, the route returns **503** with `{ error: "Waitlist not configured" }` and does not read the request body or call Blob.
- **Local dev / production:** If the env var is missing or empty in the process that serves the API (e.g. `.env.local` not loaded or not set in Vercel), every POST will get 503 and the UI will show "Registry channel unavailable."

---

## Exact file/line where the UI maps failed response to the message

- **File:** `components/OriginTerminalIntake.jsx`
- **Path 1 (async waitlist fetch in `handleRunWhoisClick`):** lines 371–373 — `if (!res.ok) { addLine("Registry channel unavailable."); ... }`
- **Path 2 (useEffect waitlist fetch `.then`):** lines 519–529 — `if (ok) { ... } else { addLine("Registry channel unavailable."); }` where `ok = res.ok`
- **Path 3 (useEffect waitlist fetch `.catch`):** lines 537–539 — `addLine("Registry channel unavailable.");`

The client does **not** read `res.status` or `data.error`; it only checks `res.ok`. So 400, 429, 500, 503, and any fetch exception all show the same message.

---

## Likely cause in local dev

Most common is **missing `BLOB_READ_WRITE_TOKEN`** in the environment that runs the Next server (e.g. `.env.local`), leading to **503** and "Registry channel unavailable." Other possibilities: **429** (rate limit) or **500** (Blob write failure). Without client- or server-side logging of the status, you cannot tell which from the UI alone.

---

## Minimum fix (diagnostic)

Add one-time client-side logging when the waitlist request fails so you can see which response triggers the message, without changing intake, backend, or redirect behavior:

- In the same place(s) where you call `addLine("Registry channel unavailable.")`, log `res.status` and optionally the parsed body when `!res.ok` (and in `.catch` log the error). Then reproduce and check the browser console to see whether you get 503, 429, 500, or a network error.

If you see **503**: set `BLOB_READ_WRITE_TOKEN` in `.env.local` (and in Vercel env for production) and restart the dev server / redeploy.

If you see **500**: check server logs for `[waitlist] Blob write failed:` and fix the Blob token or Blob API issue.

If you see **429**: wait or adjust rate limit for dev.
