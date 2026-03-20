import { NextResponse } from "next/server";
import { getReport } from "@/lib/report-store";
import { loadBeautyProfileV1 } from "@/lib/beauty-profile-store";
import {
  getAgentEntitlementByToken,
  getLatestFeedbackForReport,
} from "@/lib/agent-entitlement-store";
import { generateLirId } from "@/src/ligs/marketing/identity-spec";
import { getCosmicAnalogue } from "@/src/ligs/cosmology/cosmicAnalogues";
import { getSolarSeasonByIndex, getSolarSeasonIndexFromLongitude } from "@/src/ligs/astronomy/solarSeason";
import { getPrimaryArchetypeFromSolarLongitude } from "@/src/ligs/image/triangulatePrompt";
import { resolveChronoImprintDisplay } from "@/lib/free-whois-report";
import {
  getCivilizationalFunction,
  hasCivilizationalFunction,
} from "@/src/ligs/voice/civilizationalFunction";
import {
  LIGS_ARCHETYPES,
  type LigsArchetype,
} from "@/src/ligs/archetypes/contract";

const CANONICAL_SOLAR_SEGMENT_NAMES: readonly string[] = [
  "March Equinox",
  "Early-Spring",
  "Mid-Spring",
  "June Solstice",
  "Early-Summer",
  "Mid-Summer",
  "September Equinox",
  "Early-Autumn",
  "Mid-Autumn",
  "December Solstice",
  "Early-Winter",
  "Late-Winter",
];

function parseCoordsFromLabel(label: string | null): {
  latitude: number | null;
  longitude: number | null;
} {
  if (!label) return { latitude: null, longitude: null };
  const m = label.match(
    /([0-9]+(?:\.[0-9]+)?)°\s*([NS])\s*,\s*([0-9]+(?:\.[0-9]+)?)°\s*([EW])/i
  );
  if (!m) return { latitude: null, longitude: null };
  const latMag = Number(m[1]);
  const latHem = m[2]?.toUpperCase();
  const lonMag = Number(m[3]);
  const lonHem = m[4]?.toUpperCase();
  if (!Number.isFinite(latMag) || !Number.isFinite(lonMag)) {
    return { latitude: null, longitude: null };
  }
  const latitude = latHem === "S" ? -latMag : latMag;
  const longitude = lonHem === "W" ? -lonMag : lonMag;
  return { latitude, longitude };
}

function splitSensory(value: string | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function isKnownArchetype(v: string | undefined): v is LigsArchetype {
  return !!v && LIGS_ARCHETYPES.includes(v as LigsArchetype);
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId")?.trim();
  const auth = request.headers.get("authorization") ?? "";
  const bearerToken = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const token = bearerToken || url.searchParams.get("token")?.trim() || "";
  if (!reportId) {
    return NextResponse.json(
      { error: "MISSING_REPORT_ID", message: "reportId is required" },
      { status: 400 }
    );
  }
  if (!token) {
    return NextResponse.json(
      { error: "MISSING_TOKEN", message: "Entitlement token is required" },
      { status: 401 }
    );
  }
  const entitlement = await getAgentEntitlementByToken(token);
  if (!entitlement) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 403 });
  }
  if (entitlement.status !== "active" || entitlement.reportId !== reportId) {
    return NextResponse.json({ error: "TOKEN_NOT_AUTHORIZED" }, { status: 403 });
  }

  const storedReport = await getReport(reportId);
  if (!storedReport) {
    return NextResponse.json(
      { error: "PAID_WHOIS_REPORT_NOT_FOUND", reportId },
      { status: 404 }
    );
  }

  let profile;
  try {
    profile = await loadBeautyProfileV1(reportId, requestId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (
      message === "BEAUTY_PROFILE_NOT_FOUND" ||
      message === "BEAUTY_PROFILE_PARSE_FAILED" ||
      message === "BEAUTY_PROFILE_SCHEMA_MISMATCH"
    ) {
      return NextResponse.json({ error: message, reportId }, { status: 404 });
    }
    return NextResponse.json(
      { error: "PROFILE_LOAD_FAILED", reportId, message },
      { status: 500 }
    );
  }

  const generatedAtIso =
    storedReport.createdAt != null
      ? new Date(storedReport.createdAt).toISOString()
      : new Date().toISOString();
  const registryId = generateLirId(`paid-${reportId}-${generatedAtIso}`);

  const birthDate = profile.birthDate ?? null;
  const birthTimeLocal = profile.birthTime ?? null;
  const birthLocation = profile.birthLocation ?? null;
  const originLabel =
    storedReport.originCoordinatesDisplay ??
    profile.originCoordinatesDisplay ??
    null;
  const parsedCoords = parseCoordsFromLabel(originLabel);

  let chronoLocal: string | null = birthTimeLocal;
  let chronoUtc: string | null = null;
  if (birthDate && birthTimeLocal && birthLocation) {
    const chrono = await resolveChronoImprintDisplay(
      birthDate,
      birthTimeLocal,
      birthLocation
    );
    if (chrono) {
      const m = chrono.match(/^(.+)\s+local\s*\/\s*(.+)\s+UTC$/i);
      if (m) {
        chronoLocal = m[1]?.trim() ?? chronoLocal;
        chronoUtc = m[2]?.trim() ?? null;
      }
    }
  }

  const solarProfile = profile.solarSeasonProfile;
  const storedSunLon = storedReport.field_conditions_context?.sunLonDeg;
  const fallbackSeasonIndex =
    typeof storedSunLon === "number"
      ? getSolarSeasonIndexFromLongitude(storedSunLon)
      : null;
  const solarSegment =
    solarProfile?.seasonIndex != null
      ? CANONICAL_SOLAR_SEGMENT_NAMES[solarProfile.seasonIndex] ?? null
      : fallbackSeasonIndex != null
      ? CANONICAL_SOLAR_SEGMENT_NAMES[fallbackSeasonIndex] ?? null
      : null;
  const solarAnchor =
    solarProfile?.seasonIndex != null
      ? getSolarSeasonByIndex(solarProfile.seasonIndex)?.anchorType ?? null
      : storedReport.field_conditions_context?.anchorType ?? null;

  const fallbackArchetype =
    typeof storedSunLon === "number"
      ? getPrimaryArchetypeFromSolarLongitude(storedSunLon)
      : null;
  const archetype = (
    solarProfile?.archetype ??
    profile.dominantArchetype ??
    fallbackArchetype ??
    null
  ) as string | null;
  const knownArchetype = isKnownArchetype(archetype ?? undefined)
    ? (archetype as Parameters<typeof getCosmicAnalogue>[0])
    : null;
  const cosmicTwin = knownArchetype
    ? getCosmicAnalogue(knownArchetype).phenomenon
    : null;

  const vectorZero = storedReport.vector_zero;
  const coherenceScore =
    typeof vectorZero?.coherence_score === "number"
      ? vectorZero.coherence_score
      : null;

  const cf = knownArchetype && hasCivilizationalFunction(knownArchetype)
    ? getCivilizationalFunction(knownArchetype)
    : null;

  const supportStyle = cf
    ? `Support through ${cf.structuralFunction}`
    : "Support through clear structure, concise options, and explicit tradeoffs.";
  const friction = cf ? [...cf.frictionEnvironments] : [];
  const contribution = cf ? [...cf.contributionEnvironments] : [];

  const predictedMatchFields = [
    "support_style",
    "decision_support",
    "likely_friction_patterns",
    "best_use_of_this_human",
  ] as const;

  const feedback = await getLatestFeedbackForReport(reportId);
  let observedMatchFields: string[] = [];
  let observedMismatchFields: string[] = [];
  let lastFeedback:
    | { state: "confirmed" | "partial" | "debunked"; createdAt: number }
    | undefined;

  if (feedback) {
    lastFeedback = { state: feedback.state, createdAt: feedback.createdAt };
    if (feedback.state === "confirmed") {
      observedMatchFields = [...predictedMatchFields];
    } else if (feedback.state === "debunked") {
      observedMismatchFields = [...predictedMatchFields];
    }
  }

  return NextResponse.json({
    schema: "whois-your-human/v1",
    record_type: "agent_calibration_record",
    registry: {
      authority: "LIGS Human WHOIS Registry",
      registry_id: registryId,
      record_status: "registered",
      generated_at: generatedAtIso,
      visibility: "agent-facing",
      verification_mode: "prediction-first",
    },
    human: {
      subject_name: profile.subjectName ?? null,
      birth_date: birthDate,
      birth_time_local: birthTimeLocal,
      birth_location: birthLocation,
      chrono_imprint: {
        local: chronoLocal,
        utc: chronoUtc,
      },
      origin_coordinates: {
        label: originLabel,
        latitude: parsedCoords.latitude,
        longitude: parsedCoords.longitude,
      },
    },
    measured_context: {
      solar: {
        solar_longitude_deg:
          solarProfile?.lonCenterDeg ??
          storedReport.field_conditions_context?.sunLonDeg ??
          null,
        solar_segment: solarSegment,
        anchor_type: solarAnchor,
        declination_deg:
          storedReport.field_conditions_context?.solarDeclinationDeg ??
          solarProfile?.solarDeclinationDeg ??
          null,
        polarity:
          storedReport.field_conditions_context?.solarPolarity ??
          solarProfile?.seasonalPolarity ??
          null,
        sun_altitude_deg:
          storedReport.field_conditions_context?.sunAltitudeDeg ?? null,
        sun_azimuth_deg:
          storedReport.field_conditions_context?.sunAzimuthDeg ?? null,
        sunrise_local:
          storedReport.field_conditions_context?.sunriseLocal ?? null,
        sunset_local:
          storedReport.field_conditions_context?.sunsetLocal ?? null,
        day_length_minutes:
          storedReport.field_conditions_context?.dayLengthMinutes ?? null,
      },
      lunar: {
        phase: storedReport.field_conditions_context?.moonPhaseName ?? null,
        illumination_pct:
          typeof storedReport.field_conditions_context?.moonIlluminationFrac ===
          "number"
            ? Math.round(
                storedReport.field_conditions_context.moonIlluminationFrac * 100
              )
            : null,
        moon_altitude_deg:
          storedReport.field_conditions_context?.moonAltitudeDeg ?? null,
        moon_azimuth_deg:
          storedReport.field_conditions_context?.moonAzimuthDeg ?? null,
      },
      environment: {
        magnetic_field_index: storedReport.magneticFieldIndexDisplay ?? null,
        climate_signature: storedReport.climateSignatureDisplay ?? null,
        sensory_field_conditions: splitSensory(
          storedReport.sensoryFieldConditionsDisplay
        ),
      },
    },
    derived_structure: {
      archetype: knownArchetype,
      cosmic_twin: cosmicTwin,
      coherence_score: coherenceScore,
      vector_zero: {
        primary_wavelength_nm: vectorZero?.primary_wavelength ?? null,
        secondary_wavelength_nm: vectorZero?.secondary_wavelength ?? null,
        axes: {
          lateral: vectorZero?.symmetry_profile?.lateral ?? null,
          vertical: vectorZero?.symmetry_profile?.vertical ?? null,
          depth: vectorZero?.symmetry_profile?.depth ?? null,
        },
      },
      civilizational_function: {
        structural_function: cf?.structuralFunction ?? null,
        civilizational_role: cf?.civilizationalRole ?? null,
        contribution_environments: contribution,
        friction_environments: friction,
      },
    },
    agent_guidance: {
      support_style: supportStyle,
      best_response_format:
        "Lead with structure, then provide concise options with explicit tradeoffs.",
      planning_mode: "prediction-first with checkpointed direction changes",
      decision_support: {
        preferred_option_count: 2,
        needs_clear_tradeoffs: true,
        avoid_excessive_branching: true,
      },
      interaction_rules: {
        lead_with_structure: true,
        name_the_frame_before_details: true,
        chunk_complexity: true,
        confirm_major_direction_changes: true,
      },
      agent_do: contribution.slice(0, 4),
      agent_avoid: friction.slice(0, 4),
      likely_friction_patterns: friction.slice(0, 4),
      best_use_of_this_human: contribution.slice(0, 4),
    },
    verification: {
      status: "unverified",
      ligs_alignment_score: null,
      predicted_match_fields: [...predictedMatchFields],
      observed_match_fields: observedMatchFields,
      observed_mismatch_fields: observedMismatchFields,
      ...(lastFeedback ? { last_feedback: lastFeedback } : {}),
      agent_instruction:
        "Use this profile as an initial operating hypothesis. Update trust upward when observed behavior repeatedly matches the predicted pattern.",
    },
    agent_summary: {
      one_line:
        knownArchetype && cf
          ? `${knownArchetype} structure with strongest contribution in ${cf.contributionEnvironments[0] ?? "defined contribution environments"}.`
          : "Archetype structure available; apply prediction-first support and validate against behavior.",
      help_strategy:
        "Start with two structured options, state tradeoffs, and confirm direction before branching.",
      failure_mode:
        friction[0] ??
        "Excessive branching and unframed detail can reduce response coherence.",
      alignment_test:
        "Check whether structured, role-aligned options increase response clarity and decision speed.",
    },
  });
}
