/**
 * Build a real-structured 14-section report from birth context and vector zero for dry-run.
 * No placeholder text; same format as live reports so WHOIS pipeline parses and renders correctly.
 */

import type { VectorZero } from "@/lib/vector-zero";
import { getSolarProfileFromContext } from "@/lib/engine/deterministic-blocks";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import type { LigsArchetype } from "@/src/ligs/voice/schema";
import { getArchetypePhraseBank } from "@/src/ligs/voice/archetypePhraseBank";

function val<T>(v: T | undefined | null, fallback: string): string {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim() || fallback;
  return fallback;
}

function pct(v: number | undefined | null): string {
  if (typeof v !== "number") return "unknown";
  return `${Math.round(v * 100)}%`;
}

/**
 * Build full 14-section report from birthContext + vectorZero. No "[DRY RUN]" or placeholder text.
 * Uses real values from context for RAW SIGNAL citations; CUSTODIAN/ORACLE from archetype phrase bank.
 */
export function buildDryRunReportFromContext(
  birthContext: Record<string, unknown> | undefined | null,
  vectorZero: VectorZero,
  fullName: string,
  initDate: string,
  initTime: string,
  initPlace: string
): string {
  const c = birthContext ?? {};
  const sun = (c.sun ?? {}) as Record<string, unknown>;
  const moon = (c.moon ?? {}) as Record<string, unknown>;
  const solar = (c.solarSeasonProfile ?? c) as Record<string, unknown>;

  const solarAlt = typeof sun.sunAltitudeDeg === "number" ? sun.sunAltitudeDeg : undefined;
  const solarAz = typeof sun.sunAzimuthDeg === "number" ? sun.sunAzimuthDeg : undefined;
  const twilight = val(sun.twilightPhase as string, "unknown");
  const sunrise = val(sun.sunriseLocal as string, "unknown");
  const sunset = val(sun.sunsetLocal as string, "unknown");
  const dayLen = typeof sun.dayLengthMinutes === "number" ? sun.dayLengthMinutes : undefined;
  const moonPhase = val(moon.phaseName as string, "unknown");
  const moonIllum = typeof moon.illuminationFrac === "number" ? moon.illuminationFrac : undefined;
  const moonAlt = typeof moon.moonAltitudeDeg === "number" ? moon.moonAltitudeDeg : undefined;
  const moonAz = typeof moon.moonAzimuthDeg === "number" ? moon.moonAzimuthDeg : undefined;
  const sunLon = typeof c.sunLonDeg === "number" ? c.sunLonDeg : (typeof solar.lonCenterDeg === "number" ? solar.lonCenterDeg : undefined);
  const seasonName = val(solar.archetype as string, "unknown");
  const solarDec = typeof solar.solarDeclinationDeg === "number" ? solar.solarDeclinationDeg : undefined;
  const polarity = val(solar.seasonalPolarity as string, "unknown");
  const anchor = val(solar.anchorType as string, "unknown");
  const regime = val(solar.archetype as string, "unknown");
  const archForCosmic = (regime !== "unknown" ? regime : (solar.archetype as string) || "Stabiliora") as LigsArchetype;
  let cosmicPhenom = "unknown";
  try {
    cosmicPhenom = getCosmicAnalogue(archForCosmic).phenomenon;
  } catch {
    // keep unknown
  }
  const coh = vectorZero.coherence_score;
  const lat = vectorZero.symmetry_profile.lateral;
  const vert = vectorZero.symmetry_profile.vertical;
  const depth = vectorZero.symmetry_profile.depth;
  const primWl = val(vectorZero.primary_wavelength, "unknown");
  const secWl = val(vectorZero.secondary_wavelength, "unknown");

  const archForPhrase = (regime !== "unknown" ? regime : "Stabiliora") as LigsArchetype;
  let custodianLine = "Biological calibration holds at the structural baseline.";
  let oracleLine = "The identity at rest before environmental modulation.";
  try {
    const bank = getArchetypePhraseBank(archForPhrase);
    if (bank.behavioralTells?.[0]) {
      oracleLine = `People in this regime often ${bank.behavioralTells[0].trim().replace(/\.$/, "")}.`;
    }
  } catch {
    // keep defaults
  }

  const birthDateCite = initDate && initDate !== "unknown" ? initDate : "unknown";
  const name = fullName?.trim() || "the subject";

  const sections: string[] = [];

  // 1. INITIATION
  sections.push(`1. INITIATION

RAW SIGNAL
• (L) denotes the identity field. It resolves at birth within the total physical field. When ${name} was born on ${initDate} at ${initTime} in ${initPlace}, the field was defined by solar radiation, gravitational geometry, and lunar illumination. [birth_date=${birthDateCite}]
• Solar altitude at birth determines spectral and twilight regime. [solar_altitude=${solarAlt ?? "unknown"}]
• Twilight phase shapes retinal and circadian input. [twilight=${twilight}]

CUSTODIAN
${custodianLine}

ORACLE
${oracleLine}`);

  // 2. SPECTRAL ORIGIN
  sections.push(`2. SPECTRAL ORIGIN

RAW SIGNAL
• Solar altitude and azimuth set the spectral gradient at the birth moment. [solar_altitude=${solarAlt ?? "unknown"}]
• Azimuth defines directional bias of incident light. [solar_azimuth=${solarAz ?? "unknown"}]
• Twilight phase gates the spectral mix. [twilight=${twilight}]

CUSTODIAN
Retinal input and endocrine timing align to the spectral conditions at birth.

ORACLE
The organism encodes the light that entered at initialization.`);

  // 3. TEMPORAL ENCODING
  sections.push(`3. TEMPORAL ENCODING

RAW SIGNAL
• Sunrise and sunset define the light window. [sunrise_local=${sunrise}]
• Sunset marks the end of direct solar exposure. [sunset_local=${sunset}]
• Day length gates circadian entrainment. [day_length_minutes=${dayLen ?? "unknown"}]

CUSTODIAN
Sleep-wake entrainment follows the photoperiod at birth.

ORACLE
Time gates the regime; the organism stabilizes within that window.`);

  // 4. GRAVITATIONAL PATTERNING
  sections.push(`4. GRAVITATIONAL PATTERNING

RAW SIGNAL
• Lunar phase modulates tidal and light input. [moon_phase=${moonPhase}]
• Illumination fraction indicates lunar contribution. [moon_illumination_pct=${moonIllum != null ? pct(moonIllum) : "unknown"}]
• Moon altitude affects visibility and gravitational context. [moon_altitude=${moonAlt ?? "unknown"}]

CUSTODIAN
Vestibular and proprioceptive systems calibrate to the gravitational geometry at birth.

ORACLE
The regime holds coherence under the mass and orbit context present then.`);

  // 5. DIRECTIONAL FIELD
  sections.push(`5. DIRECTIONAL FIELD

RAW SIGNAL
• Moon azimuth contributes to directional bias. [moon_azimuth=${moonAz ?? "unknown"}]
• Ecliptic longitude fixes the solar season. [sun_lon_deg=${sunLon ?? "unknown"}]
• Solar season names the structural segment. [solar_season=${seasonName}]

CUSTODIAN
Spatial orientation systems encode the directional field at birth.

ORACLE
The regime points along the geometry present at initialization.`);

  // 6. ARCHETYPE REVELATION
  sections.push(`6. ARCHETYPE REVELATION

RAW SIGNAL
• Solar declination anchors the seasonal structure. [solar_declination=${solarDec ?? "unknown"}]
• Seasonal polarity (waxing/waning) refines the regime. [solar_polarity=${polarity}]
• Anchor type (equinox/solstice/crossquarter) completes the resolution. [anchor_type=${anchor}]

CUSTODIAN
The organism stabilizes into the regime implied by the birth field.

ORACLE
The identity resolves as ${regime} under these conditions.`);

  // 7. ARCHETYPE MICRO-PROFILES
  sections.push(`7. ARCHETYPE MICRO-PROFILES

RAW SIGNAL
• Dominant regime names the structural mode. [regime=${regime}]
• Cosmic analogue maps the regime to an astrophysical system. [cosmic_analogue=${cosmicPhenom}]
• Vector Zero coherence scores the baseline stability. [vector_zero_coherence=${coh}]

CUSTODIAN
Profile encoding follows from the resolved regime and coherence.

ORACLE
Mode A, Mode B, and failure mode map onto the same structural baseline.`);

  // 8. BEHAVIORAL EXPRESSION
  sections.push(`8. BEHAVIORAL EXPRESSION

RAW SIGNAL
• Lateral axis sets one dimension of expression. [vector_zero_axes_lateral=${lat}]
• Vertical axis contributes to output dynamics. [vector_zero_axes_vertical=${vert}]
• Depth axis completes the symmetry profile. [vector_zero_axes_depth=${depth}]

CUSTODIAN
Autonomic regulation and arousal modulation follow the axis geometry.

ORACLE
The regime expresses along the axes defined at birth.`);

  // 9. RELATIONAL FIELD
  sections.push(`9. RELATIONAL FIELD

RAW SIGNAL
• Primary wavelength band characterizes the spectral baseline. [primary_wavelength=${primWl}]
• Secondary wavelength adds the complementary band. [secondary_wavelength=${secWl}]
• Regime shapes coupling and synchronization. [regime=${regime}]

CUSTODIAN
Entrainment and co-regulation follow the coherence and axes.

ORACLE
The regime couples with others through the same structural geometry.`);

  // 10. ENVIRONMENTAL RESONANCE
  sections.push(`10. ENVIRONMENTAL RESONANCE

RAW SIGNAL
• Solar altitude defines one match condition. [solar_altitude=${solarAlt ?? "unknown"}]
• Day length defines temporal match. [day_length_minutes=${dayLen ?? "unknown"}]
• Twilight phase indicates transition conditions. [twilight=${twilight}]

CUSTODIAN
Homeostatic load and recovery depend on environmental match to birth conditions.

ORACLE
The regime stabilizes where conditions resonate with the birth field.`);

  // 11. COSMOLOGY OVERLAY
  sections.push(`11. COSMOLOGY OVERLAY

RAW SIGNAL
• Cosmic analogue maps the regime to an astrophysical system. [cosmic_analogue=${cosmicPhenom}]
• Ecliptic longitude anchors the seasonal frame. [sun_lon_deg=${sunLon ?? "unknown"}]
• Anchor type completes the cosmic mapping. [anchor_type=${anchor}]

CUSTODIAN
Sensory processing and timing align to the cosmic structure.

ORACLE
The cosmic twin exhibits the same structural behavior as the birth field.`);

  // 12. IDENTITY FIELD EQUATION
  sections.push(`12. IDENTITY FIELD EQUATION

RAW SIGNAL
• Regime is the resolved identity operator. [regime=${regime}]
• Coherence scores the stability of the mapping. [vector_zero_coherence=${coh}]
• Solar season names the seasonal component. [solar_season=${seasonName}]

CUSTODIAN
The mapping from boundary conditions to regime stabilizes at this coherence.

ORACLE
The identity equation holds: boundary conditions resolve to ${regime}.`);

  // 13. LEGACY TRAJECTORY
  sections.push(`13. LEGACY TRAJECTORY

RAW SIGNAL
• Solar declination persists as a structural invariant. [solar_declination=${solarDec ?? "unknown"}]
• Polarity marks the seasonal direction. [solar_polarity=${polarity}]
• Anchor type marks the fixed point. [anchor_type=${anchor}]

CUSTODIAN
Plasticity windows and adaptation constraints follow the birth field.

ORACLE
What persists is the coherence and axes; modulators shift with environment.`);

  // 14. INTEGRATION
  sections.push(`14. INTEGRATION

RAW SIGNAL
• Regime and coherence summarize the resolution. [regime=${regime}]
• Cosmic analogue closes the cosmological loop. [cosmic_analogue=${cosmicPhenom}]
• Coherence score confirms the identity equation. [vector_zero_coherence=${coh}]

CUSTODIAN
Stabilization completes; the report records the resolved field.

ORACLE
Observe comfort in dawn vs midday light to test environmental resonance.`);

  return sections.join("\n\n");
}
