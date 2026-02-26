"use client";

/**
 * Left vertical info panel (gallery placard style).
 * Renders pertinent data; missing fields shown as "—".
 */
const ROW = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 py-1.5 border-b border-[var(--artifact-panel-border)] last:border-0">
    <span
      className="text-[10px] uppercase tracking-widest font-medium"
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

export default function ArtifactInfoPanel({ artifacts = {}, showDevFields = false }) {
  const {
    archetype,
    variationKey,
    dateTime,
    location,
    schemaVersion,
    engineVersion,
    solarAzimuth,
    lightSeasonSegment,
    colorFamily,
    textureBias,
    reportId,
    subjectName,
  } = artifacts;

  const hasBaseline = colorFamily || textureBias;
  const hasIds = (showDevFields && reportId && reportId !== "—") || subjectName;

  return (
    <div
      className="flex flex-col p-4 w-full min-w-[140px] max-w-[180px]"
      style={{
        backgroundColor: "var(--artifact-panel-bg)",
        borderRight: "1px solid var(--artifact-panel-border)",
        borderBottom: "1px solid var(--artifact-panel-border)",
      }}
    >
      <ROW label="Archetype" value={archetype} />
      <ROW label="Variation" value={variationKey} />
      <ROW label="Date / Time" value={dateTime} />
      {showDevFields && schemaVersion && schemaVersion !== "—" && <ROW label="Schema" value={schemaVersion} />}
      {showDevFields && engineVersion && engineVersion !== "—" && <ROW label="Engine" value={engineVersion} />}
      <ROW label="Location" value={location} />
      <ROW label="Solar azimuth" value={solarAzimuth} />
      <ROW label="Light segment" value={lightSeasonSegment} />
      {hasBaseline && (
        <>
          <ROW label="Color family" value={colorFamily} />
          <ROW label="Texture" value={textureBias} />
        </>
      )}
      {hasIds && (
        <>
          {showDevFields && reportId && reportId !== "—" && <ROW label="Report" value={reportId} />}
          {subjectName && <ROW label="Subject" value={subjectName} />}
        </>
      )}
    </div>
  );
}
