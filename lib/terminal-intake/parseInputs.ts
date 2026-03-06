/**
 * Tolerant parsers for terminal intake: date, time, place.
 * Prefer interpretation and soft confirmation over hard failure.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ABBREV: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export interface DateParseResult {
  normalized: string; // e.g. "August 14, 1993"
  iso: string;       // e.g. "1993-08-14" for API
  interpreted?: string;
}

/** Parse loose human date formats. Returns null if unparseable. */
export function parseDate(input: string): DateParseResult | null {
  const s = input.trim();
  if (!s) return null;

  // ISO: 1993-08-14
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const month = parseInt(m!, 10) - 1;
    const day = parseInt(d!, 10);
    const year = parseInt(y!, 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return {
        normalized: `${MONTH_NAMES[month]} ${day}, ${year}`,
        iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      };
    }
  }

  // US: 8/14/93, 08/14/1993, 8-14-1993
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    let [, m, d, y] = slashMatch;
    let month = parseInt(m!, 10) - 1;
    let day = parseInt(d!, 10);
    let year = parseInt(y!, 10);
    if (y!.length === 2) year = year < 50 ? 2000 + year : 1900 + year;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
      return {
        normalized: `${MONTH_NAMES[month]} ${day}, ${year}`,
        iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      };
    }
  }

  // Aug 14 1993, August 14th, 1993, 14 Aug 1993
  const words = s.split(/\s+/);
  let month: number | null = null;
  let day: number | null = null;
  let year: number | null = null;

  for (const w of words) {
    const clean = w.replace(/[,.stndrdth]/gi, "");
    const num = parseInt(clean, 10);
    if (!isNaN(num)) {
      if (num >= 1 && num <= 31 && day === null) day = num;
      else if (num >= 1900 && num <= 2100) year = num;
      else if (num >= 1 && num <= 31 && year !== null && day === null) day = num;
    } else {
      const m = MONTH_ABBREV[clean.toLowerCase().slice(0, 3)];
      if (m !== undefined) month = m;
      else {
        const full = MONTH_NAMES.findIndex((m) => m.toLowerCase().startsWith(clean.toLowerCase()));
        if (full >= 0) month = full;
      }
    }
  }

  if (month !== null && day !== null && year !== null) {
    return {
      normalized: `${MONTH_NAMES[month]} ${day}, ${year}`,
      iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
  }

  return null;
}

export interface TimeParseResult {
  normalized: string; // e.g. "3:12 AM"
  api: string;        // HH:MM:SS for API
  unknown: boolean;
}

/** Parse loose human time formats. Handles "unknown". */
export function parseTime(input: string): TimeParseResult {
  const s = input.trim().toLowerCase();
  if (!s || s === "unknown" || s === "n/a" || s === "unavailable") {
    return {
      normalized: "—",
      api: "12:00:00",
      unknown: true,
    };
  }

  // noon, midnight
  if (/^noon$/i.test(s)) return { normalized: "12:00 PM", api: "12:00:00", unknown: false };
  if (/^midnight$/i.test(s)) return { normalized: "12:00 AM", api: "00:00:00", unknown: false };

  // 3, 3am, 3:12 am, 15:12, 0312
  let h = 0;
  let m = 0;

  const military = s.match(/^(\d{1,2}):?(\d{2})\s*(am|pm)?$/i);
  if (military) {
    h = parseInt(military[1]!, 10);
    m = parseInt(military[2]!, 10);
    const ampm = military[3]?.toLowerCase();
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    if (!ampm && h >= 0 && h <= 23) {
      // 24h
    } else if (!ampm && h >= 1 && h <= 12) {
      // assume AM for single digit
    }
  } else {
    const simple = s.match(/^(\d{1,2})\s*(am|pm)?$/i);
    if (simple) {
      h = parseInt(simple[1]!, 10);
      const ampm = simple[2]?.toLowerCase();
      if (ampm === "pm" && h < 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
    } else {
      const withColon = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
      if (withColon) {
        h = parseInt(withColon[1]!, 10);
        m = parseInt(withColon[2]!, 10);
        const ampm = withColon[3]?.toLowerCase();
        if (ampm === "pm" && h < 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
      } else {
        const digits = s.replace(/\D/g, "");
        if (digits.length >= 3) {
          h = parseInt(digits.slice(0, -2), 10);
          m = parseInt(digits.slice(-2), 10);
          if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            // 24h if h > 12
          } else if (h >= 1 && h <= 12) {
            // could be am
            const hasAm = /am|a\.m/i.test(s);
            const hasPm = /pm|p\.m/i.test(s);
            if (hasPm) h += 12;
          }
        }
      }
    }
  }

  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));

  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? "AM" : "PM";
  return {
    normalized: `${displayH}:${String(m).padStart(2, "0")} ${ampm}`,
    api: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
    unknown: false,
  };
}

/** Normalize place input. Best-effort; server does real geocoding. */
export function normalizePlace(input: string): string {
  const s = input.trim();
  if (!s) return "";
  return s
    .split(/[,\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(", ");
}
