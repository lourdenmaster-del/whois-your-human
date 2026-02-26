"use client";

import ArchetypeArtifactCard, {
  buildArtifactsFromVariationRun,
} from "./ArchetypeArtifactCard";

/**
 * Two-column Compare Runs wrapper.
 * Renders left (previous) and right (current) ArchetypeArtifactCard side by side.
 * When leftRun is null, only renders the right (single) card.
 */
export default function ArtifactCompare({
  leftRun,
  rightRun,
  leftLabel = "Previous",
  rightLabel = "Current",
}) {
  const leftArtifacts = buildArtifactsFromVariationRun(leftRun);
  const rightArtifacts = buildArtifactsFromVariationRun(rightRun);

  const leftImage = leftRun?.variationImages?.[0];
  const rightImage = rightRun?.variationImages?.[0];

  const singleMode = !leftRun;

  return (
    <div className={singleMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
      {!singleMode && (
        <div>
          <p className="text-xs font-medium text-[var(--artifact-label)] mb-2 uppercase tracking-wider">
            {leftLabel}
          </p>
          <ArchetypeArtifactCard
            imageUrl={leftImage}
            archetype={leftRun?.primary_archetype}
            artifacts={leftArtifacts}
            imageAlt={`${leftLabel} run`}
          />
        </div>
      )}
      <div>
        {!singleMode && (
          <p className="text-xs font-medium text-[var(--artifact-label)] mb-2 uppercase tracking-wider">
            {rightLabel}
          </p>
        )}
        <ArchetypeArtifactCard
          imageUrl={rightImage}
          archetype={rightRun?.primary_archetype}
          artifacts={rightArtifacts}
          className={singleMode ? "" : "border-l-2 border-l-[#7A4FFF]/40"}
          imageAlt={`${rightLabel} run`}
        />
      </div>
    </div>
  );
}

