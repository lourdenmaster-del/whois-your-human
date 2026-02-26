"use client";

/**
 * Premium center band overlay for artifact hero image.
 * Subtle translucency, soft blur, crisp type. Slightly above true center.
 * @param scrimVariant - "dark" for dark images, "light" for light images (better contrast on very dark)
 */
export default function ArchetypeNameOverlay({ archetype, scrimVariant = "dark" }) {
  const label = archetype ?? "—";
  const scrimVar = scrimVariant === "light" ? "var(--artifact-scrim-light, rgba(253, 248, 245, 0.6))" : "var(--artifact-scrim, rgba(13, 11, 16, 0.55))";
  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{
        top: "42%",
        transform: "translateY(-50%)",
        zIndex: 2,
      }}
    >
      <div
        className="px-6 py-3 rounded-sm"
        style={{
          backgroundColor: scrimVar,
          backdropFilter: `blur(var(--artifact-overlay-blur, 12px))`,
          WebkitBackdropFilter: `blur(var(--artifact-overlay-blur, 12px))`,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 2px 24px rgba(0,0,0,0.2)",
        }}
      >
        <span
          className={`font-semibold tracking-[0.08em] uppercase ${scrimVariant === "light" ? "text-[var(--artifact-value,#0d0b10)]" : "text-white"}`}
          style={{
            fontFamily: "var(--font-beauty-serif), Georgia, serif",
            fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
            letterSpacing: "0.12em",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
