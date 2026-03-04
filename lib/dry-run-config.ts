/**
 * Client-side DRY_RUN flag for strict no-network mode.
 * When true, all "Generate" flows must show Dry Run Preview and never send requests.
 */
export const DRY_RUN =
  process.env.NEXT_PUBLIC_DRY_RUN === "1" ||
  process.env.NEXT_PUBLIC_DRY_RUN === "true";

/** Client-side fake payment mode for marketing testing. No Stripe calls; sets unlock and redirects. */
export const FAKE_PAY =
  process.env.NEXT_PUBLIC_FAKE_PAY === "1" ||
  process.env.NEXT_PUBLIC_FAKE_PAY === "true";

/** Global safe testing mode: dry image gen, deterministic overlay, no Blob writes. Logs "TEST MODE" on load. */
export const TEST_MODE =
  process.env.NEXT_PUBLIC_TEST_MODE === "1" ||
  process.env.NEXT_PUBLIC_TEST_MODE === "true";

/**
 * PROOF_ONLY: Blocks ALL live imagery calls (DALL·E, compose, generate).
 * Only "Render Proof Card (FREE)" works — zero external calls, zero spend.
 * Set NEXT_PUBLIC_PROOF_ONLY=1 until glyph + overlay render correctly locally.
 */
export const PROOF_ONLY =
  process.env.NEXT_PUBLIC_PROOF_ONLY === "1" ||
  process.env.NEXT_PUBLIC_PROOF_ONLY === "true";
