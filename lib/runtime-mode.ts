/**
 * Unified environment guard for Production vs DRY_RUN.
 * Use these flags to prevent accidental OpenAI, Stripe, or Blob writes in dev/dry environments.
 *
 * Safety rules:
 * - Production mode: real OpenAI, Stripe, Blob, Email
 * - DRY_RUN mode: never perform network writes; use placeholders
 * - TEST_MODE (NEXT_PUBLIC_TEST_MODE=1): dry image gen, deterministic overlay; Blob writes ON unless DISABLE_BLOB_WRITES=1
 * - Missing env vars imply dry run (fail safely)
 * - Stripe: use sk_test_ in non-prod; enforce in Stripe route
 */

export const isProd = process.env.NODE_ENV === "production";

export const isTestMode =
  process.env.NEXT_PUBLIC_TEST_MODE === "1" ||
  process.env.NEXT_PUBLIC_TEST_MODE === "true";

export const isDryRun =
  process.env.DRY_RUN === "1" ||
  !process.env.BLOB_READ_WRITE_TOKEN ||
  !process.env.OPENAI_API_KEY?.trim();

/**
 * True only when we allow external writes (Blob, OpenAI, Stripe, Email).
 * False in development, when DRY_RUN=1, when TEST_MODE=1, or when required env vars are missing.
 * Set ALLOW_EXTERNAL_WRITES_IN_DEV=1 to test image generation locally without deploying.
 */
export const allowExternalWrites =
  !isTestMode &&
  ((isProd && !isDryRun) || process.env.ALLOW_EXTERNAL_WRITES_IN_DEV === "1");

/**
 * When true, Stripe must use test keys (sk_test_). Non-prod always requires test mode.
 */
export const stripeTestModeRequired = !isProd;

/**
 * True when Blob writes are allowed.
 * False only when DISABLE_BLOB_WRITES=1 (optional hard off).
 * In TEST_MODE, Blob writes are ON by default so /beauty/view works end-to-end.
 */
export const allowBlobWrites =
  process.env.DISABLE_BLOB_WRITES !== "1" &&
  process.env.DISABLE_BLOB_WRITES !== "true";
