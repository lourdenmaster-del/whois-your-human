# Image Pipeline Verification Report

**Date:** 2026-03-09  
**Scope:** Share-card visibility + deterministic archetype rotation

---

## 1. REAL BEAUTY REPORT UI VERIFICATION

### API behavior

**`GET /api/beauty/[reportId]`** (real report path, lines 209–212):
```ts
const profile = await loadBeautyProfileV1(reportId, requestId);
const enriched = await enrichProfileImages(profile, reportId);
return successResponse(200, enriched, requestId);
```

**`enrichProfileImages`** (lines 37–80):

1. Resolves `shareCardUrl` from `profile.shareCardUrl` or `getImageUrlFromBlob(reportId, "share_card")`.
2. When `shareCardUrl` exists: `urls[2] = shareCardUrl` (line 71).
3. Response includes `shareCardUrl` and `imageUrls` (with `imageUrls[2]` overwritten).

**Proof:** For a real report with `share_card.png` in Blob (`ligs-images/{reportId}/share_card.png`):

- Response has `shareCardUrl`.
- `imageUrls[2]` is the share card Blob URL, not `final_beauty_field`.

---

### Component usage

| Component | File | imageUrls[2] usage | Behavior |
|----------|------|--------------------|----------|
| **PreviewRevealSequence** | `app/beauty/view/PreviewRevealSequence.jsx` | L45–46: `finalArtifactImage = profile?.imageUrls?.[2]` | Phase 5: `finalArtifactBase = finalArtifactImage ?? lightSignatureImage ?? ...` → share card shown when present. |
| **ArchetypeResolveCarousel** | Same file L158 | `finalImageUrl={arch === "Ignispectrum" ? profile?.imageUrls?.[2] : undefined}` | Only for Ignis Phase 2; resolves to share card. |
| **InteractiveReportSequence** | `app/beauty/view/InteractiveReportSequence.jsx` | L35: `finalArtifactImage = profile?.imageUrls?.[2]` | Passed into `buildIgnisSteps` → ReportStep. |
| **ReportStep / ArtifactReveal** | `app/beauty/view/ReportStep.jsx` | L21, L193: `finalArtifactImage` | `baseImage = finalArtifactImage ?? lightSignatureImage ?? ...` — share card preferred when available. |

**Conclusion:**

- **Preview phase:** Share card is shown in Phase 5 (`finalArtifactBase`) and in Ignis Phase 2.
- **Full report artifact reveal:** Share card preferred via `finalArtifactImage ?? lightSignatureImage`; fallback to Light Signature when no share card.

---

## 2. EXEMPLAR / FALLBACK BEHAVIOR

| Condition | Source | Rotation |
|-----------|--------|----------|
| **Manifest exists** | `loadExemplarManifestWithPreferred` returns manifest | Uses `manifest.urls` (marketingBackground, exemplarCard, shareCard). No rotation. |
| **Manifest null + public assets** | `getArchetypePublicAssetUrlsWithRotation` | Rotation applied. Seed: beauty API = `reportId`; exemplars API / getExemplarManifestsServer = `archetype:version`. |
| **Manifest null + Ignis** | `IGNIS_V1_ARTIFACTS` or v2 manifest | No rotation. |
| **Manifest null + no public assets** | Locked static `/exemplars/{archetype}.png` | No rotation. |

**Exemplar flows:**

- With Blob manifest: images come from manifest; rotation not used.
- With public fallback only: rotation used.
- Most archetypes will appear unchanged if they already have Blob manifests.

---

## 3. ROTATION VERIFICATION

### Pools per archetype (prime4+)

| Archetype | marketing | exemplar | share |
|-----------|-----------|----------|-------|
| Aequilibris | [1, 4] | [2] | [3] |
| Fluxionis | [1, 4] | [2] | [3] |
| Innovaris | [1, 4, 7] | [2, 5, 8] | [3, 6] |

Other archetypes with prime4: same as Aequilibris; Innovaris is the only one with primes 5–8.

### Example seeds → selected primes

Each slot uses seed `{base}:{slot}`.

| Base seed | marketingBackground | exemplarCard | shareCard |
|-----------|--------------------|--------------|-----------|
| `exemplar-Innovaris` | prime7 | prime8 | prime6 |
| `Aequilibris:v1` | prime1 | prime2 | prime3 |
| `Innovaris:v1` | prime1 | prime5 | prime6 |

---

## 4. USER-VISIBLE IMPACT

| Context | What user sees |
|---------|----------------|
| **New real Beauty report** (with composed share_card.png) | Preview Phase 5: scientific identity share card. Full report Artifact Reveal: Light Signature (share card only if Light Signature missing). |
| **Exemplar with Blob manifest** | Unchanged; manifest URLs used. |
| **Exemplar without manifest (public fallback)** | Rotated prime4+ assets where available; different exemplars/reports show different primes. |
| **Old report (no share_card.png)** | `imageUrls[2]` stays `final_beauty_field`; no share card. |

---

## 5. CACHE / STALE-ASSET CHECK

| Layer | Behavior | Impact |
|-------|----------|--------|
| **Browser cache** | `<img src={url}>`; Blob URLs have no cache-busting. | Same URL can be cached; hard refresh (Cmd+Shift+R) clears. |
| **Blob URL reuse** | `ligs-images/{reportId}/share_card.png` is fixed. | Same report always returns same URL; no URL-based staleness. |
| **Saved Beauty profile** | `loadBeautyProfileV1` fetches JSON from Blob each request. | No client-side profile cache. |
| **Old report blobs** | Reports before share_card compose have no `share_card.png`. | `getImageUrlFromBlob` returns null; `imageUrls[2]` stays `final_beauty_field`. |
| **Static / data cache** | `GET /api/beauty/[reportId]` is dynamic; no ISR. | No static caching of API response. |

**Reasons the old image might still appear:**

1. **Report age:** Reports created before the share-card compose step have no `share_card.png`; `imageUrls[2]` is `final_beauty_field`.
2. **Browser cache:** Previous `final_beauty_field` or share card URL may be cached.
3. **Pipeline failure:** If share_card compose failed (e.g. no Light Signature), `share_card.png` is never written.

---

## 6. RETURN SUMMARY

### Verification

- API overwrites `imageUrls[2]` with `shareCardUrl` when present.
- Preview Phase 5 and Ignis Phase 2 use `imageUrls[2]` and show the share card when available.
- Full report Artifact Reveal prefers Light Signature; share card is only shown when Light Signature is missing.
- Exemplar manifest path is unchanged; rotation is used only for public fallbacks.
- Rotation pools and seed logic match the documented design.

### Views that still bypass the new share card

- ~~**InteractiveReportSequence Artifact Reveal:**~~ Fixed: `baseImage` now prefers `finalArtifactImage` (share card).
- **Exemplar reports:** Use manifest/public URLs for the third slot, not the composed Beauty share card (different concept).
- **Old reports:** Without `share_card.png`, always show `final_beauty_field`.

### Why the old image might still appear

1. Report predates share_card composition.
2. Browser cache of previous image URLs.
3. Share card compose failed (missing Light Signature or compose error).

### Whether a new report is required

Yes. To clearly see the new share card:

1. Create a new Beauty report (full pipeline, not dry run).
2. Ensure share_card compose succeeds (Light Signature present).
3. Hard-refresh `/beauty/view?reportId=…` or use a private window to avoid cache.
