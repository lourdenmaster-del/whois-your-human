# Local environment audit: waitlist system

## 1. Env files present in project

| File | Exists |
|------|--------|
| `.env.example` | ✅ Yes (template only; no secrets) |
| `.env.local` | ❌ No |
| `.env` | ❌ No |
| `.env.development` | ❌ No |

Only `.env.example` exists in the repo. `.env*` and `.env*.local` are in `.gitignore`, so `.env.local` would not be committed even if created.

---

## 2. BLOB_READ_WRITE_TOKEN in env files

- **`.env.local`** — File not present → `BLOB_READ_WRITE_TOKEN` not defined.
- **`.env`** — File not present → `BLOB_READ_WRITE_TOKEN` not defined.
- **`.env.development`** — File not present → `BLOB_READ_WRITE_TOKEN` not defined.

**Conclusion:** `BLOB_READ_WRITE_TOKEN` is not set in any local env file in this workspace.

---

## 3. Variable name and server usage

- **Expected name:** `BLOB_READ_WRITE_TOKEN` (exact).
- **Server usage:** `app/api/waitlist/route.ts` lines 54–57:
  ```ts
  const hasBlobToken =
    typeof process.env.BLOB_READ_WRITE_TOKEN === "string" &&
    process.env.BLOB_READ_WRITE_TOKEN.length > 0;
  ```
- **Match:** The route reads `process.env.BLOB_READ_WRITE_TOKEN`; the name matches. If the variable were set in `.env.local`, Next.js would load it and the route would see it (no typo or different name).

---

## 4. When BLOB_READ_WRITE_TOKEN is missing

- The waitlist route returns **503** with body `{ error: "Waitlist not configured" }`.
- The client treats any non-2xx as failure and shows **"Registry channel unavailable."**
- So with no `.env.local` (and no `BLOB_READ_WRITE_TOKEN`), the waitlist cannot function locally: POST `/api/waitlist` will return 503 and the UI will show "Registry channel unavailable."

---

## 5. Other env vars for the waitlist path

| Variable | Required for waitlist | Present in workspace |
|----------|------------------------|----------------------|
| `BLOB_READ_WRITE_TOKEN` | **Yes** — without it, route returns 503 | ❌ No (no env file defines it) |
| `RESEND_API_KEY` | Optional — confirmation email; if missing, signup still 200 but no email | N/A (no env file) |
| `SENDGRID_API_KEY` | Optional — alternative to Resend | N/A |
| `EMAIL_FROM` | Optional — defaults to Resend default | N/A |

So for local waitlist to work, **at least** `BLOB_READ_WRITE_TOKEN` must be set (e.g. in `.env.local`). Confirmation email is optional.

---

## 6. Summary

| Question | Answer |
|----------|--------|
| **Which env files exist?** | Only `.env.example`. No `.env.local`, `.env`, or `.env.development` in the project root. |
| **Is `BLOB_READ_WRITE_TOKEN` present?** | **No** — no local env file defines it. |
| **Does the variable name match what the API expects?** | **Yes** — route uses `process.env.BLOB_READ_WRITE_TOKEN`; name matches. |
| **Can local dev write to Blob for waitlist?** | **No** — without `BLOB_READ_WRITE_TOKEN`, the server returns 503 and does not attempt Blob writes. |

---

## Recommended fix for local waitlist

1. Copy the template: `cp .env.example .env.local`
2. Add a Blob token in `.env.local`:
   - Get a token from [Vercel Dashboard → Storage → Blob](https://vercel.com/dashboard) (Create Store → .env).
   - Add line: `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...` (paste your token).
3. Restart the dev server so Next.js reloads env.
4. (Optional) For confirmation email: set `RESEND_API_KEY=re_...` in `.env.local`.

After that, POST `/api/waitlist` should return 200 and the UI should show "Identity query recorded." instead of "Registry channel unavailable."
