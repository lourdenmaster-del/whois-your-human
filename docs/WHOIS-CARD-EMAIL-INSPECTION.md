# WHOIS Human Registration Card Email — Read-Only Inspection

No code was changed. This document reflects the current implementation in `lib/free-whois-report.ts` (`renderFreeWhoisCard`, `renderFreeWhoisCardText`) and `lib/email-waitlist-confirmation.ts`.

---

## 1. Exact HTML / Rendered Structure

The card is a single responsive HTML email. Structure as emitted:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>WHOIS Human Registration Card</title>
</head>
<body style="margin:0;padding:24px 16px;background:#f5f5f5;font-family:Georgia,serif;">
  <div style="max-width:420px;margin:0 auto;padding:20px 24px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:#1a1a1a;line-height:1.4;">
    <!-- HEADER -->
    <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e8e8e8;">
      <img src="{siteUrl}/brand/logo.svg" alt="LIGS" width="64" height="32" style="display:block;height:32px;width:auto;" />
      <p style="margin:8px 0 0 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#1a1a1a;">WHOIS Human Registration Card</p>
      <p style="margin:2px 0 0 0;font-size:10px;color:#666;">LIGS Human Identity Registry</p>
    </div>
    <!-- CORE REGISTRY TABLE -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#666;...">Subject Name</td><td style="color:#1a1a1a;">{name}</td></tr>
      <tr><td ...>Birth Date</td><td>{birthDate}</td></tr>
      <tr><td ...>Birth Location</td><td>{birthLocation}</td></tr>
      <tr><td ...>Birth Time</td><td>{birthTime}</td></tr>
      <tr><td ...>Solar Segment</td><td>{solarSignature}</td></tr>
      <tr><td ...>Archetype Classification</td><td>{archetypeClassification}</td></tr>
      <tr><td ...>Registry Status</td><td>{registryStatus}</td></tr>
      <tr><td ...>Created Date</td><td>{created_at 0:10}</td></tr>
      <tr><td ...>Record Authority</td><td>{recordAuthority}</td></tr>
    </table>
    <!-- GENESIS METADATA (if genesisRows.length > 0) -->
    <p style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;...">Identity Physics — Genesis Metadata</p>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <tr><td ...>Solar Light Vector</td><td>{value}</td></tr>
      ... (8 rows)
    </table>
    <!-- IDENTITY -->
    <div style="...">Identity</div>
    <div>
      <p><strong>Cosmic Twin</strong> {cosmicTwinValue}</p>
      <p><strong>Archetype</strong> {archetypeClassification}</p>
      [if expressionLine !== "—"] <p>{expressionLine}</p>
      [if typicalContexts] <p style="font-size:11px;color:#444;">Typical expression contexts: {typicalContexts}</p>
    </div>
    <!-- ARTIFACT (if artifactImageUrl) -->
    <div style="margin:16px 0;text-align:center;">
      <img src="{artifactImageUrl}" alt="Registry artifact" width="280" height="280" style="..." />
    </div>
    <!-- FOOTER -->
    <p style="margin:16px 0 0 0;padding-top:12px;border-top:1px solid #e8e8e8;font-size:10px;color:#666;">Registry-issued. Identity registered.</p>
    <p style="margin:6px 0 0 0;font-size:11px;"><a href="{siteUrl}" ...>Return to registry</a></p>
  </div>
</body>
</html>
```

- Outer body: grey background `#f5f5f5`, padding 24px 16px.
- Inner card: white, max-width 420px, border 1px solid `#e0e0e0`, border-radius 8px, monospace font, 12px.
- Labels: 10px, uppercase, letter-spacing 0.08em, color `#666`.
- Section titles: 10px, bold, uppercase, letter-spacing 0.1em, margin 14px 0 6px 0.

---

## 2. Exact Plain-Text Version

As produced by `renderFreeWhoisCardText` (line breaks and order):

```
WHOIS HUMAN REGISTRATION CARD
LIGS Human Identity Registry

Subject Name: {report.name}
Birth Date: {report.birthDate}
Birth Location: {report.birthLocation}
Birth Time: {report.birthTime}
Solar Segment: {report.solarSignature}
Archetype Classification: {report.archetypeClassification}
Registry Status: {report.registryStatus}
Created Date: {createdDateDisplay}
Record Authority: {report.recordAuthority}

IDENTITY PHYSICS — GENESIS METADATA

Solar Light Vector: {value}
Seasonal Context: {value}
Solar Anchor Type: {value}
Chrono-Imprint: {value}
Origin Coordinates: Restricted Node Data
Magnetic Field Index: Restricted Node Data
Climate Signature: Restricted Node Data
Sensory Field Conditions: Restricted Node Data


IDENTITY

Cosmic Twin: {cosmicTwinValue}
Archetype: {report.archetypeClassification}
{expressionLine}                    ← only if expressionLine !== "—"
Typical expression contexts: {typicalContexts}   ← only if present

Registry-issued. Identity registered.

Return to registry: {siteUrl}
```

(Blank lines and “IDENTITY” / “IDENTITY PHYSICS — GENESIS METADATA” headings are exactly as in the implementation.)

---

## 3. One Realistic Sample Output

Plausible values used:

- **Subject Name:** Morgan Reed  
- **Birth Date:** 1992-06-15  
- **Birth Location:** Boston, MA  
- **Birth Time:** 14:30  
- **Solar Segment:** Early-Summer  
- **Archetype Classification:** Ignispectrum  
- **Genesis:** sun longitude present → Solar Light Vector e.g. 94.52° solar longitude; Seasonal Context Early-Summer; Solar Anchor Type Solstice anchor; Chrono-Imprint 14:30 local / 18:30 UTC; restricted rows unchanged.  
- **Cosmic Twin:** (from cosmology) e.g. Solar Flare or equivalent for Ignispectrum.  
- **Archetype expression:** Ignispectrum contract → humanExpression "The Initiator", civilizationFunction "Drives the beginning of everything" → expression line: **The Initiator — Drives the beginning of everything**.  
- **Typical expression contexts:** contract environments joined with " • " → **Founders • Explorers • Innovators**.  
- **Artifact:** present (URL set).

### Sample HTML (key content only, values filled)

```html
<div style="...card...">
  <div>...header...</div>
  <table>
    <tr><td>Subject Name</td><td>Morgan Reed</td></tr>
    <tr><td>Birth Date</td><td>1992-06-15</td></tr>
    <tr><td>Birth Location</td><td>Boston, MA</td></tr>
    <tr><td>Birth Time</td><td>14:30</td></tr>
    <tr><td>Solar Segment</td><td>Early-Summer</td></tr>
    <tr><td>Archetype Classification</td><td>Ignispectrum</td></tr>
    <tr><td>Registry Status</td><td>Registered</td></tr>
    <tr><td>Created Date</td><td>2026-03-15</td></tr>
    <tr><td>Record Authority</td><td>LIGS Human Identity Registry</td></tr>
  </table>
  <p>Identity Physics — Genesis Metadata</p>
  <table>
    <tr><td>Solar Light Vector</td><td>94.52° solar longitude</td></tr>
    <tr><td>Seasonal Context</td><td>Early-Summer</td></tr>
    <tr><td>Solar Anchor Type</td><td>Solstice anchor</td></tr>
    <tr><td>Chrono-Imprint</td><td>14:30 local / 18:30 UTC</td></tr>
    <tr><td>Origin Coordinates</td><td>Restricted Node Data</td></tr>
    <tr><td>Magnetic Field Index</td><td>Restricted Node Data</td></tr>
    <tr><td>Climate Signature</td><td>Restricted Node Data</td></tr>
    <tr><td>Sensory Field Conditions</td><td>Restricted Node Data</td></tr>
  </table>
  <div>Identity</div>
  <div>
    <p><strong>Cosmic Twin</strong> protostar ignition + bipolar jets</p>
    <p><strong>Archetype</strong> Ignispectrum</p>
    <p>The Initiator — Drives the beginning of everything</p>
    <p>Typical expression contexts: Founders • Explorers • Innovators</p>
  </div>
  <div><img src="..." alt="Registry artifact" width="280" height="280" /></div>
  <p>Registry-issued. Identity registered.</p>
  <p><a href="https://ligs.io">Return to registry</a></p>
</div>
```

### Sample plain-text (same data)

```
WHOIS HUMAN REGISTRATION CARD
LIGS Human Identity Registry

Subject Name: Morgan Reed
Birth Date: 1992-06-15
Birth Location: Boston, MA
Birth Time: 14:30
Solar Segment: Early-Summer
Archetype Classification: Ignispectrum
Registry Status: Registered
Created Date: 2026-03-15
Record Authority: LIGS Human Identity Registry

IDENTITY PHYSICS — GENESIS METADATA

Solar Light Vector: 94.52° solar longitude
Seasonal Context: Early-Summer
Solar Anchor Type: Solstice anchor
Chrono-Imprint: 14:30 local / 18:30 UTC
Origin Coordinates: Restricted Node Data
Magnetic Field Index: Restricted Node Data
Climate Signature: Restricted Node Data
Sensory Field Conditions: Restricted Node Data


IDENTITY

Cosmic Twin: protostar ignition + bipolar jets
Archetype: Ignispectrum
The Initiator — Drives the beginning of everything
Typical expression contexts: Founders • Explorers • Innovators

Registry-issued. Identity registered.

Return to registry: https://ligs.io
```

---

## 4. Exact Order of Content Blocks in the Email

1. **Header** — Logo, “WHOIS Human Registration Card”, “LIGS Human Identity Registry”.  
2. **Core registry block** — Single table: Subject Name, Birth Date, Birth Location, Birth Time, Solar Segment, Archetype Classification, Registry Status, Created Date, Record Authority.  
3. **Genesis metadata block** — Section title “Identity Physics — Genesis Metadata”, then table of 8 rows (Solar Light Vector, Seasonal Context, Solar Anchor Type, Chrono-Imprint, Origin Coordinates, Magnetic Field Index, Climate Signature, Sensory Field Conditions). Omitted entirely if `display.genesisRows.length === 0`.  
4. **Identity block** — Section title “Identity”, then: Cosmic Twin, Archetype (classification), optional expression line, optional “Typical expression contexts: …”.  
5. **Artifact block** — Single image (280×280) when `report.artifactImageUrl` is set; otherwise nothing.  
6. **Footer** — “Registry-issued. Identity registered.” then “Return to registry” link (HTML) or “Return to registry: {siteUrl}” (plain text).

---

## 5. Copy That May Read Like System/Debug Rather Than Registry Artifact

- **“Restricted Node Data”** — Used for Origin Coordinates, Magnetic Field Index, Climate Signature, Sensory Field Conditions when data is withheld. Reads like a placeholder or access-control label rather than human-facing registry language.  
- **“Limited Access”** — Used for Chrono-Imprint (and optionally Solar Light Vector / Seasonal Context) when value is missing. Clearly a status/access string.  
- **“Registry artifact”** — Image `alt` text. Neutral but generic; could be read as a technical label.  
- **“Return to registry”** — Link text; fine for navigation but could be “Return to the registry” or “Visit the registry” if you want more natural phrasing.  
- **“Identity”** — Section title is a single word; consistent with “Identity Physics — Genesis Metadata” but very short.  
- **Label “Archetype”** in Identity block — Same as “Archetype Classification” in the core table; brief and consistent but could be “Archetype Classification” in both places if you want exact repetition.

All other labels and lines (“WHOIS Human Registration Card”, “LIGS Human Identity Registry”, “Registry-issued. Identity registered.”, Cosmic Twin, Chrono-Imprint, Solar Light Vector, etc.) read as intentional registry/artifact copy rather than debug or system strings.
