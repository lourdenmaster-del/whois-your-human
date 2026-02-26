/**
 * Shared context schema for real-world birth data.
 * Carries input, geo, solar/lunar/sky, space weather, weather, and environment context.
 */

export type BirthInput = {
  name?: string;
  localDate: string; // YYYY-MM-DD
  localTime: string; // HH:mm (or HH:mm:ss)
  locationText: string;
};

export type BirthGeo = {
  placeName: string;
  lat: number;
  lon: number;
  elevationM?: number;
  timezoneId: string; // IANA
  utcTimestamp: string; // ISO
};

export type SolarContext = {
  sunAboveHorizon: boolean;
  altitudeDeg: number;
  azimuthDeg: number;
  sunriseLocal?: string;
  solarNoonLocal?: string;
  sunsetLocal?: string;
  twilightPhase: "day" | "civil" | "nautical" | "astronomical" | "night";
  dayLengthMinutes: number;
  seasonAnchor: "near_equinox" | "near_solstice" | "between";
};

export type LunarContext = {
  moonAboveHorizon: boolean;
  altitudeDeg: number;
  azimuthDeg: number;
  illuminationFrac: number; // 0..1
  lunarAgeDays: number; // 0..29.53
  moonriseLocal?: string;
  moonsetLocal?: string;
  sunMoonSeparationDeg: number;
};

export type SkyContext = {
  localSiderealTime: string; // HH:mm:ss
  lightPollutionClass?: number; // e.g. Bortle 1..9 if you later add dataset
  skyBrightnessMagArcsec2?: number;
};

export type SpaceWeatherContext = {
  kpIndex?: number;
  dstIndex?: number;
  solarCyclePhase?: "min" | "rising" | "max" | "declining";
};

export type WeatherContext = {
  source?: "station" | "reanalysis" | "none";
  temperatureC?: number;
  dewpointC?: number;
  humidityPct?: number;
  pressureHpa?: number;
  windSpeedMps?: number;
  windDirDeg?: number;
  cloudCoverPct?: number;
  precipMm?: number;
  conditionsText?: string;
};

export type GeoEnvironmentContext = {
  koppenClass?: string;
  terrainHint?:
    | "coastal"
    | "mountain"
    | "plains"
    | "urban"
    | "forest"
    | "desert"
    | "mixed";
  distanceToOceanKm?: number;
};

export type BirthContext = {
  input: BirthInput;
  geo: BirthGeo;
  solar: SolarContext;
  lunar: LunarContext;
  sky: SkyContext;
  spaceWeather: SpaceWeatherContext;
  weather: WeatherContext;
  environment: GeoEnvironmentContext;

  highlights: string[]; // pre-digested bullet facts for prompts
};
