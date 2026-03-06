# Local Preview Cards Test Plan

Verify the landing page preview cards and images in Chrome/Safari **before** the engine or Stripe are fully live. No OpenAI, no Blob token, no Stripe required.

---

## Prerequisites

- Dev server running: `npm run dev`
- Browser: Chrome or Safari (try `http://127.0.0.1:3000` if Safari won't connect to `localhost`)

---

## 1. Mock Data (No Blob, No Engine)

**Goal:** See preview cards with placeholder images and mock snippets.

1. Open `http://localhost:3000` (or `http://127.0.0.1:3000`)
2. Scroll to **"Previous Light Identity Reports"** (between "How it works" and "Begin your Light Identity Report")
3. **Expected:**
   - 3 preview cards in a grid
   - Each card: violet placeholder image ("Light Signature"), italic emotional snippet, optional summary text
   - Mock cards link to `#section-5` (scroll to form)
   - Hover: subtle border glow

**If empty or loading forever:** API may be failing. Check DevTools Console; `/api/report/previews` should return `{ previewCards: [...] }` with mock fallback.

---

## 2. API Response Check

**Goal:** Confirm the preview API returns the expected schema.

1. Open `http://localhost:3000/api/report/previews?useBlob=0&maxPreviews=5`
2. **Expected JSON:**
   ```json
   {
     "status": "ok",
     "data": {
       "previewCards": [
         {
           "reportId": "...",
           "emotionalSnippet": "...",
           "images": [],
           "summaryText": "..."
         }
       ]
     }
   }
   ```
3. With no Blob: `previewCards` may be empty `[]` → frontend falls back to mock data.
4. With Blob + reports: `previewCards` has real data with `images` URLs.

---

## 3. Real Data (With Blob + Existing Reports)

**Goal:** See real report previews with Blob images (when available).

**Setup:** Ensure `BLOB_READ_WRITE_TOKEN` is set and you have at least one report in Blob (e.g. from a previous `POST /api/engine` run).

1. Open `http://localhost:3000/api/report/previews?useBlob=1&maxPreviews=5`
2. If `previewCards` has entries with `images: ["https://..."]`, the landing page will show real images.
3. Reload `http://localhost:3000` and verify the preview section shows Blob image URLs.

---

## 4. Visual Checklist (Chrome & Safari)

| Check | Chrome | Safari |
|-------|--------|--------|
| Section "Previous Light Identity Reports" visible | ✓ | ✓ |
| 3 cards in grid (mock or real) | ✓ | ✓ |
| Image displays (placeholder or Blob URL) | ✓ | ✓ |
| Emotional snippet italic, readable | ✓ | ✓ |
| Summary text (when present) shows 2 lines | ✓ | ✓ |
| "View report →" link on real cards | ✓ | ✓ |
| Click card: navigates to `/?reportId=...` or `#section-5` | ✓ | ✓ |
| Hover: border color change | ✓ | ✓ |

---

## 5. Quick Commands

```bash
# Start dev server
npm run dev

# Check preview API (no Blob)
curl -s "http://localhost:3000/api/report/previews?useBlob=0" | jq .

# Check debug (storage type, report IDs if any)
curl -s "http://localhost:3000/api/report/debug" | jq .
```

---

## Troubleshooting

- **Safari "can't connect":** Use `http://127.0.0.1:3000` or run `npx next dev --hostname 0.0.0.0 --port 3000`
- **Blank preview section:** Open DevTools Console; check for fetch errors. API returns 200 with empty `previewCards` → component should fall back to mock.
- **Images not loading:** Mock uses inline SVG data URL; real images need valid Blob URLs. Check CORS if images 404.
