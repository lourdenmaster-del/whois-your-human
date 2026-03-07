"use client";

/**
 * Left vertical info panel (gallery placard style).
 * Renders pertinent data; missing fields shown as "—".
 * For exemplars: only shows rows with real values (no "—" rows).
 */
const ROW = ({ label, value, registryVariant }) => (
  <div className="flex flex-col gap-0.5 py-1.5 border-b border-[var(--artifact-panel-border)] last:border-0">
    <span
      className={`text-[10px] uppercase tracking-widest font-medium ${registryVariant ? "font-mono" : ""}`}
      style={{ color: "var(--artifact-label)" }}
    >
      {label}
    </span>
    <span
      className="text-sm font-medium"
      style={{ color: "var(--artifact-value)" }}
    >
      {value ?? "—"}
    </span>
  </div>
);

function hasValue(v) {
  return v != null && v !== "" && v !== "—";
}

export default function ArtifactInfoPanel({ artifacts = {}, showDevFields = false, registryVariant = false }) {
  const {
    archetype,
    variationKey,
    dateTime,
    location,
    schemaVersion,
    engineVersion,
    solarAzimuth,
    lightSeasonSegment,
    solarSeason,
    declination,
    polarity,
    anchor,
    cosmicAnalogue,
    colorFamily,
    textureBias,
    reportId,
    subjectName,
    isExemplar,
  } = artifacts;

  const hasBaseline = colorFamily || textureBias;
  const hasIds = (showDevFields && reportId && reportId !== "—") || subjectName;
  const showRow = (value) => !isExemplar || hasValue(value);

  return (
    <div
      className="flex flex-col p-4 w-full min-w-0 sm:min-w-[140px] sm:max-w-[180px] shrink-0 sm:shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--artifact-panel-border)]"
      style={{
        backgroundColor: "var(--artifact-panel-bg)",
      }}
    >
      {showRow(archetype) && <ROW label="Archetype" value={archetype} registryVariant={registryVariant} />}
      {showRow(variationKey) && <ROW label="Variation" value={variationKey} registryVariant={registryVariant} />}
      {showRow(dateTime) && <ROW label="Date / Time" value={dateTime} registryVariant={registryVariant} />}
      {showDevFields && schemaVersion && schemaVersion !== "—" && <ROW label="Schema" value={schemaVersion} registryVariant={registryVariant} />}
      {showDevFields && engineVersion && engineVersion !== "—" && <ROW label="Engine" value={engineVersion} registryVariant={registryVariant} />}
      {showRow(location) && <ROW label="Location" value={location} registryVariant={registryVariant} />}
      {showRow(solarAzimuth) && <ROW label="Solar azimuth" value={solarAzimuth} registryVariant={registryVariant} />}
      {showRow(lightSeasonSegment) && <ROW label="Light segment" value={lightSeasonSegment} registryVariant={registryVariant} />}
      {showRow(solarSeason) && <ROW label="Solar season" value={solarSeason} registryVariant={registryVariant} />}
      {showRow(declination) && <ROW label="Declination" value={declination} registryVariant={registryVariant} />}
      {showRow(polarity) && <ROW label="Polarity" value={polarity} registryVariant={registryVariant} />}
      {showRow(anchor) && <ROW label="Anchor" value={anchor} registryVariant={registryVariant} />}
      {showRow(cosmicAnalogue) && <ROW label="Cosmic analogue" value={cosmicAnalogue} registryVariant={registryVariant} />}
      {hasBaseline && (
        <>
          {showRow(colorFamily) && <ROW label="Color family" value={colorFamily} registryVariant={registryVariant} />}
          {showRow(textureBias) && <ROW label="Texture" value={textureBias} registryVariant={registryVariant} />}
        </>
      )}
      {hasIds && (
        <>
          {showDevFields && reportId && reportId !== "—" && <ROW label="Report" value={reportId} registryVariant={registryVariant} />}
          {subjectName && <ROW label="Subject" value={subjectName} registryVariant={registryVariant} />}
        </>
      )}
    </div>
  );
}
