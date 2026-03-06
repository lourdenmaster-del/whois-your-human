/**
 * GET /api/dev/solar-seasons-table
 * Dev-only: returns a table of all 12 solar seasons with physics-derived values at center.
 */

import { NextResponse } from "next/server";
import {
  SOLAR_SEASONS,
  getSolarSeasonProfile,
  type SolarSeasonEntry,
} from "@/src/ligs/astronomy/solarSeason";

function allowDev(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_PREVIEW_LIVE_TEST === "1" ||
    process.env.ALLOW_PREVIEW_LIVE_TEST === "true"
  );
}

export async function GET() {
  if (!allowDev()) {
    return NextResponse.json({ error: "solar-seasons-table is dev-only" }, { status: 403 });
  }

  const rows: Array<{
    seasonIndex: number;
    archetype: string;
    lonCenterDeg: number;
    declinationDegAtCenter: number;
    polarity: "waxing" | "waning";
    anchorType: string;
  }> = [];

  for (const entry of SOLAR_SEASONS as readonly SolarSeasonEntry[]) {
    const profile = getSolarSeasonProfile({
      sunLonDeg: entry.lonCenterDeg,
      latitudeDeg: 40, // mid-latitude for illustration
      date: new Date("2024-06-15T12:00:00Z"),
    });
    rows.push({
      seasonIndex: entry.index,
      archetype: entry.archetype,
      lonCenterDeg: entry.lonCenterDeg,
      declinationDegAtCenter: Math.round(profile.solarDeclinationDeg * 100) / 100,
      polarity: profile.seasonalPolarity,
      anchorType: entry.anchorType,
    });
  }

  return NextResponse.json({
    table: rows,
    columns: ["seasonIndex", "archetype", "lonCenterDeg", "declinationDegAtCenter", "polarity", "anchorType"],
  });
}
