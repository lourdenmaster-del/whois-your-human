import { approximateSunLongitudeFromDate } from "@/lib/ioc/approximate-sun-longitude";
import {
  getPrimaryArchetypePascalFromSolarLongitude,
  IOC_SOLAR_ARCHETYPE_PASCAL,
  type IocSolarArchetypePascal,
} from "@/lib/ioc/solar-archetype";

export type IocArchetypeKey =
  | "ignispectrum"
  | "fluxionis"
  | "stabiliora"
  | "duplicaris"
  | "tenebris"
  | "radiantis"
  | "precisura"
  | "aequilibris"
  | "obscurion"
  | "vectoris"
  | "structoris"
  | "innovaris";

const VALID_KEYS = new Set<string>([
  "ignispectrum",
  "fluxionis",
  "stabiliora",
  "duplicaris",
  "tenebris",
  "radiantis",
  "precisura",
  "aequilibris",
  "obscurion",
  "vectoris",
  "structoris",
  "innovaris",
]);

export function isIocArchetypeKey(s: string): s is IocArchetypeKey {
  return VALID_KEYS.has(s);
}

function pascalToIocKey(p: IocSolarArchetypePascal): IocArchetypeKey {
  return p.toLowerCase() as IocArchetypeKey;
}

function deterministicStubIndex(iso: string): number {
  let h = 0;
  const s = iso.replace(/\D/g, "") || "0";
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 12;
}

function indexToKey(i: number): IocArchetypeKey {
  return pascalToIocKey(IOC_SOLAR_ARCHETYPE_PASCAL[i]!);
}

export function getArchetypeFromBirthdate(birthdate: string): IocArchetypeKey {
  const trimmed = birthdate.trim().slice(0, 10);
  if (!trimmed) {
    return indexToKey(deterministicStubIndex("0"));
  }
  const lon = approximateSunLongitudeFromDate(trimmed);
  if (lon == null) {
    return indexToKey(deterministicStubIndex(trimmed));
  }
  const pascal = getPrimaryArchetypePascalFromSolarLongitude(lon);
  const k = pascal.toLowerCase();
  if (VALID_KEYS.has(k)) return k as IocArchetypeKey;
  return indexToKey(deterministicStubIndex(trimmed));
}
