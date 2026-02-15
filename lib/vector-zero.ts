/**
 * Vector Zero: derived baseline state from the Light Signature.
 * Not a new system or calculation pipeline — the unperturbed baseline before deviations.
 */

export type VectorZero = {
  coherence_score: number;
  primary_wavelength: string;
  secondary_wavelength: string;
  symmetry_profile: {
    lateral: number;
    vertical: number;
    depth: number;
  };
  beauty_baseline: {
    color_family: string;
    texture_bias: string;
    shape_bias: string;
    motion_bias: string;
  };
  three_voice: {
    raw_signal: string;
    custodian: string;
    oracle: string;
  };
};

export const VECTOR_ZERO_SPEC = `You derive Vector Zero from an existing Light Identity Report. Vector Zero is the unperturbed baseline of the Light Signature before deviations — NOT a new system or calculation, only the baseline state.

RULES:
1. Extract from the report: primary_wavelength and secondary_wavelength (from spectral/light language in the report).
2. Symmetry profile: normalize to the "unbent" baseline — three numbers (lateral, vertical, depth) in the range 0–1 representing the default geometry of the archetype.
3. Beauty baseline: derive from the report's archetype and aesthetic language: color_family, texture_bias, shape_bias, motion_bias (short descriptive strings).
4. Coherence score: a single number 0–1 based on symmetry balance and wavelength stability implied by the report.
5. Three voices (same voice architecture as LIGS):
   - raw_signal: 1–2 lines describing the baseline field (physics, observation only).
   - custodian: 2–3 sentences explaining Vector Zero as the baseline coherence state (biological interpretation).
   - oracle: 2–3 sentences humanizing the baseline state (mythic synthesis, declarative).

Output valid JSON only, with exactly this structure (no other keys):
{
  "coherence_score": number,
  "primary_wavelength": string,
  "secondary_wavelength": string,
  "symmetry_profile": { "lateral": number, "vertical": number, "depth": number },
  "beauty_baseline": { "color_family": string, "texture_bias": string, "shape_bias": string, "motion_bias": string },
  "three_voice": { "raw_signal": string, "custodian": string, "oracle": string }
}`;
