# Waitlist Verification Checklist

Manual verification for waitlist email (Vercel Blob) write.

## How to Test Locally

1. Set `BLOB_READ_WRITE_TOKEN` in `.env.local` (Vercel project env or token).
2. Run dev server: `npm run dev`
3. Health check:
   ```bash
   curl -s http://localhost:3000/api/waitlist/health
   ```
   Expected: `{"ok":true,"storage":"blob","canWrite":true}` (or `canWrite:false` if token missing).
4. Submit form:
   ```bash
   curl -X POST http://localhost:3000/api/waitlist \
     -H "Content-Type: application/json" \
     -d '{"email":"test+local@example.com","source":"origin"}'
   ```
   Expected: `{"ok":true}`

## How to Test Production with curl

1. Health check:
   ```bash
   curl -s https://ligs.io/api/waitlist/health
   ```
   Expected: `{"ok":true,"storage":"blob","canWrite":true}`

2. Submit (use +tag to avoid polluting real addresses):
   ```bash
   curl -X POST https://ligs.io/api/waitlist \
     -H "Content-Type: application/json" \
     -d '{"email":"yourname+waitlist-test@gmail.com","source":"origin"}'
   ```
   Expected: `{"ok":true}`

## What Success Looks Like in Vercel Blob

1. Vercel Dashboard → Storage → Blob
2. Bucket: project default (or linked blob store)
3. Files under `ligs-waitlist/`: JSON files with names like `2026-03-04T14-30-00-000Z_abc123.json`
4. Each file contains: `{"email":"...","createdAt":"...","source":"origin",...}`

## Health Check Files

`GET /api/waitlist/health` writes a tiny file under `health/` prefix (e.g. `health/2026-03-04T14-30-00.txt`). These are safe to leave; they do not contain PII.
