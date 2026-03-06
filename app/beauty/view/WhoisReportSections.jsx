"use client";

import { sanitizeForDisplay, deduplicateFieldReference } from "@/lib/beauty-report-presentation";

/**
 * WHOIS-style report display: registry record + field interpretation + cohesion protocol.
 * Uses existing fullReport and three-voice data. No engine changes.
 */

function parseCondensedReport(text) {
  if (!text || typeof text !== "string") return null;
  const result = { sections: [], keyMoves: [] };

  if (!/Signal:|RAW SIGNAL:|Ground:|CUSTODIAN:|Reflection:|ORACLE:/i.test(text)) return null;

  const keyMovesIdx = text.search(/\nKey Moves\n/);
  const mainPart = keyMovesIdx >= 0 ? text.slice(0, keyMovesIdx).trim() : text;
  const keyMovesPart = keyMovesIdx >= 0 ? text.slice(keyMovesIdx + 1) : "";

  if (keyMovesPart.startsWith("Key Moves")) {
    const lines = keyMovesPart.split("\n").slice(1);
    result.keyMoves = lines.map((l) => l.replace(/^[•\-]\s*/, "").trim()).filter(Boolean);
  }

  const sectionTitles = ["Light Signature", "Archetype", "Deviations", "Corrective Vector"];
  const sectionRegex = new RegExp(
    `(${sectionTitles.join("|")})\\n\\n?([^\\n]*)\\n\\n(?:Signal|RAW SIGNAL):\\s*([\\s\\S]*?)\\n(?:Ground|CUSTODIAN):\\s*([\\s\\S]*?)\\n(?:Reflection|ORACLE):\\s*([\\s\\S]*?)(?=\\n\\n(?:${sectionTitles.join("|")})\\n|\\nKey Moves\\n|$)`,
    "gi"
  );

  let match;
  const seen = new Set();
  while ((match = sectionRegex.exec(mainPart)) !== null) {
    const title = match[1];
    const titleKey = title.toLowerCase();
    if (seen.has(titleKey)) continue;
    seen.add(titleKey);
    const bridge = match[2].trim();
    const signal = match[3].trim();
    const ground = match[4].trim();
    const reflection = match[5].trim();
    if (!signal && !ground && !reflection) continue;
    result.sections.push({
      title,
      bridge: bridge && !/^(Signal|RAW SIGNAL|Ground|CUSTODIAN|Reflection|ORACLE):/i.test(bridge) ? bridge : null,
      signal,
      ground,
      reflection,
    });
  }
  if (result.sections.length === 0) return null;
  return result;
}

function hasContent(v) {
  return v != null && typeof v === "string" && v.trim() !== "" && v !== "—";
}

function RegistrySection({ title, subtitle, children }) {
  return (
    <section className="border-b border-[var(--beauty-line)]/15 pb-8 last:border-0 last:pb-0">
      <h3 className="beauty-body text-xs font-bold uppercase tracking-[0.2em] beauty-text-muted mb-1">
        {title}
      </h3>
      {subtitle && (
        <p className="beauty-body text-sm beauty-text-muted mb-4 font-normal">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function FieldBlock({ label, value, sanitize = true }) {
  if (!hasContent(value)) return null;
  const display = sanitize ? sanitizeForDisplay(value) : value;
  if (!display || display.trim() === "") return null;
  return (
    <div className="mb-4 last:mb-0">
      <span className="beauty-body text-[11px] uppercase tracking-wider beauty-text-muted font-medium block mb-1">
        {label}
      </span>
      <p className="beauty-body beauty-text-inverse text-[15px] leading-relaxed whitespace-pre-wrap">
        {display}
      </p>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.profile - Beauty profile (fullReport, light_signature, archetype, deviations, corrective_vector, vector_zero)
 * @param {boolean} [props.isExemplar] - Whether this is a sample report
 * @param {"all"|"identity"|"interpretation"} [props.sections="all"] - "identity" = Field Conditions + Resolved Identity; "interpretation" = Deviations + Return to Coherence; "all" = everything
 */
export default function WhoisReportSections({ profile, isExemplar, sections = "all" }) {
  const parsed = profile.fullReport ? parseCondensedReport(profile.fullReport) : null;
  const v0 = profile.vector_zero;
  const baseline = v0?.beauty_baseline;
  const threeVoice = v0?.three_voice;

  const getSection = (title) => parsed?.sections?.find((s) => s.title === title) ?? null;
  const ls = getSection("Light Signature") ?? profile.light_signature;
  const arch = getSection("Archetype") ?? profile.archetype;
  const dev = getSection("Deviations") ?? profile.deviations;
  const cv = getSection("Corrective Vector") ?? profile.corrective_vector;
  const keyMoves = parsed?.keyMoves ?? [];

  const hasVectorZero = threeVoice && (hasContent(threeVoice.raw_signal) || hasContent(threeVoice.custodian) || hasContent(threeVoice.oracle));
  const hasBaseline = baseline && (hasContent(baseline.color_family) || hasContent(baseline.texture_bias));
  const hasResolved = (ls && (ls.signal || ls.raw_signal)) || (arch && (arch.signal || arch.raw_signal));
  const hasDeviations = dev && (dev.signal || dev.raw_signal);
  const hasCohesion = (cv && (cv.signal || cv.raw_signal)) || keyMoves.length > 0;

  const toSignal = (v) => (v?.signal ?? v?.raw_signal ?? "");
  const toGround = (v) => (v?.ground ?? v?.custodian ?? "");
  const toReflection = (v) => (v?.reflection ?? v?.oracle ?? "");

  const showIdentity = sections === "all" || sections === "identity";
  const showInterpretation = sections === "all" || sections === "interpretation";

  const hasIdentityContent = hasVectorZero || hasResolved;
  const hasInterpretationContent = hasDeviations || hasCohesion;

  if (!hasIdentityContent && !hasInterpretationContent) {
    if (hasContent(profile.fullReport) && sections === "all") {
      return (
        <div className="beauty-form-card rounded-3xl p-8">
          <h2 className="beauty-body text-xs font-bold uppercase tracking-[0.25em] beauty-text-muted mb-6">
            Identity Field Interpretation
          </h2>
          <pre className="beauty-body text-sm beauty-text-inverse font-normal leading-relaxed whitespace-pre-wrap text-left">
            {deduplicateFieldReference(profile.fullReport)}
          </pre>
        </div>
      );
    }
    return null;
  }
  if (sections === "identity" && !hasIdentityContent) return null;
  if (sections === "interpretation" && !hasInterpretationContent) return null;

  return (
    <div className="beauty-form-card rounded-3xl p-8">
      <h2 className="beauty-body text-xs font-bold uppercase tracking-[0.25em] beauty-text-muted mb-6">
        {sections === "identity" ? "Field Conditions & Resolved Identity" : sections === "interpretation" ? "Field Interpretation" : "Identity Field Interpretation"}
      </h2>

      <div className="space-y-10">
        {/* Field Conditions — baseline at rest */}
        {showIdentity && hasVectorZero && (
          <RegistrySection
            title="Field Conditions"
            subtitle="The identity field at rest, before environmental modulation."
          >
            <FieldBlock label="Signal" value={threeVoice.raw_signal} />
            <FieldBlock label="Ground" value={threeVoice.custodian} />
            <FieldBlock label="Cohesion" value={threeVoice.oracle} />
            {hasBaseline && (
              <div className="mt-4 pt-4 border-t border-[var(--beauty-line)]/20">
                <span className="beauty-body text-[11px] uppercase tracking-wider beauty-text-muted font-medium block mb-2">
                  Baseline
                </span>
                <p className="beauty-body beauty-text-inverse text-sm">
                  {[baseline.color_family, baseline.texture_bias].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
          </RegistrySection>
        )}

        {/* Resolved Identity — Light Signature + Archetype */}
        {showIdentity && hasResolved && (
          <>
            {ls && (ls.signal || ls.raw_signal) && (
              <RegistrySection
                title="Light Signature"
                subtitle="How the field resolves into a structural pattern."
              >
                <FieldBlock label="Signal" value={toSignal(ls)} />
                <FieldBlock label="Ground" value={toGround(ls)} />
                <FieldBlock label="Cohesion" value={toReflection(ls)} />
              </RegistrySection>
            )}
            {arch && (arch.signal || arch.raw_signal) && (
              <RegistrySection
                title="Archetype Expression"
                subtitle="The regime this field tends to express."
              >
                <FieldBlock label="Signal" value={toSignal(arch)} />
                <FieldBlock label="Ground" value={toGround(arch)} />
                <FieldBlock label="Cohesion" value={toReflection(arch)} />
              </RegistrySection>
            )}
          </>
        )}

        {/* Field Deviations */}
        {showInterpretation && hasDeviations && (
          <RegistrySection
            title="Field Deviations"
            subtitle="Where the field drifts under pressure or destabilizing conditions."
          >
            <FieldBlock label="Signal" value={toSignal(dev)} />
            <FieldBlock label="Ground" value={toGround(dev)} />
            <FieldBlock label="Cohesion" value={toReflection(dev)} />
          </RegistrySection>
        )}

        {/* RETURN TO COHERENCE — elevated, practical; clear structure */}
        {showInterpretation && hasCohesion && (
          <RegistrySection
            title="Return to Coherence"
            subtitle="What restores coherence when the field drifts, and how to return to baseline."
          >
            {/* What restores coherence — corrective vector mechanism */}
            {cv && (cv.signal || cv.raw_signal || cv.ground || cv.custodian) && (
              <div className="mb-6">
                <span className="beauty-body text-[11px] uppercase tracking-wider beauty-text-muted font-medium block mb-2">
                  What restores coherence
                </span>
                <p className="beauty-body beauty-text-inverse text-[15px] leading-relaxed whitespace-pre-wrap">
                  {sanitizeForDisplay(toSignal(cv) || toGround(cv))}
                </p>
              </div>
            )}
            {/* How to return to baseline — cohesion + practices */}
            {(cv?.reflection || cv?.oracle || keyMoves.length > 0) && (
              <div>
                <span className="beauty-body text-[11px] uppercase tracking-wider beauty-text-muted font-medium block mb-2">
                  How to return to baseline
                </span>
                {toReflection(cv) && (
                  <p className="beauty-body beauty-text-inverse text-[15px] leading-relaxed mb-4">
                    {sanitizeForDisplay(toReflection(cv))}
                  </p>
                )}
                {keyMoves.length > 0 && (
                  <ul className="space-y-3">
                    {keyMoves.map((move, i) => {
                      const sanitized = sanitizeForDisplay(move);
                      if (!sanitized) return null;
                      return (
                        <li
                          key={i}
                          className="beauty-body beauty-text-inverse text-[15px] leading-relaxed flex items-start gap-3"
                        >
                          <span className="text-[#7A4FFF] font-semibold shrink-0 mt-0.5">→</span>
                          <span>{sanitized}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </RegistrySection>
        )}
      </div>
    </div>
  );
}
