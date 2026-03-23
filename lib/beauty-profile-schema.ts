/**
 * @deprecated Use @/lib/whois-profile-schema instead.
 * Re-exports from whois-profile-schema for backward compatibility.
 */

export {
  SCHEMA_VERSION,
  getEngineVersion,
  buildRegistryForRegistered,
  buildRegistryForResolved,
  mergeRegistryMinted,
} from "@/lib/whois-profile-schema";
export type { RegistryState, RegistryRecordSchema } from "@/lib/whois-profile-schema";

import type { WhoisProfileV1 } from "@/lib/whois-profile-schema";
import { assertWhoisProfileV1 } from "@/lib/whois-profile-schema";

/** @deprecated Use WhoisProfileV1 from @/lib/whois-profile-schema */
export type BeautyProfileV1 = WhoisProfileV1;

/** @deprecated Use assertWhoisProfileV1 from @/lib/whois-profile-schema */
export function assertBeautyProfileV1(json: unknown): asserts json is BeautyProfileV1 {
  assertWhoisProfileV1(json);
}
