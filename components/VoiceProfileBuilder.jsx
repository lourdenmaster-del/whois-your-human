"use client";

import { useState } from "react";
import { safeParseVoiceProfile } from "@/src/ligs/voice/schema";
import { zodToVoiceEngineError } from "@/src/ligs/voice/errors";

const LIGS_ARCHETYPES = [
  "Ignispectrum",
  "Stabiliora",
  "Duplicaris",
  "Tenebris",
  "Radiantis",
  "Precisura",
  "Aequilibris",
  "Obscurion",
  "Vectoris",
  "Structoris",
  "Innovaris",
  "Fluxionis",
];
const CHANNELS = ["website", "email", "social_caption", "longform", "ads"];

const DEFAULT_CADENCE = {
  sentence_length: { target_words: 14, range: [8, 22] },
  paragraph_length: { target_sentences: 2, range: [1, 4] },
  rhythm_notes: "smooth transitions, balanced clauses",
};

function parseCommaList(str) {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function VoiceProfileBuilder() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    archetype: "Stabiliora",
    descriptors: "calm, regulated, premium, clear, warmly precise",
    bannedWords: "guarantee, miracle, cure",
    medicalClaims: "prohibited",
    beforeAfterPromises: "prohibited",
    substantiationRequired: true,
    channelAdapters: {
      website: { tone_shift: "slightly more polished", structure: "headline, subhead, 3 bullets, cta" },
      email: { tone_shift: "more direct + personal", structure: "subject options, preview line, body, ps" },
      social_caption: { tone_shift: "more concise", structure: "hook, value, soft CTA" },
    },
  });
  const [profile, setProfile] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const totalSteps = 5;

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  };

  const updateChannelAdapter = (channel, field, value) => {
    setForm((prev) => ({
      ...prev,
      channelAdapters: {
        ...prev.channelAdapters,
        [channel]: {
          ...(prev.channelAdapters[channel] || {}),
          [field]: value,
        },
      },
    }));
  };

  const buildProfile = () => {
    const descriptors = parseCommaList(form.descriptors);
    const banned_words = parseCommaList(form.bannedWords);
    const channel_adapters = {};
    for (const ch of CHANNELS) {
      const adapter = form.channelAdapters[ch];
      if (!adapter) continue;
      const structure = parseCommaList(adapter.structure || "");
      if (adapter.tone_shift || structure.length > 0) {
        channel_adapters[ch] = {
          tone_shift: (adapter.tone_shift || "").trim(),
          structure,
        };
      }
    }

    return {
      id: `vp_${Date.now()}`,
      version: "1.0.0",
      created_at: new Date().toISOString(),
      owner_user_id: "local",
      brand: {
        name: "Builder Profile",
        products: [],
        audience: "",
      },
      ligs: {
        primary_archetype: form.archetype,
        secondary_archetype: null,
        blend_weights: { [form.archetype]: 1.0 },
      },
      descriptors,
      cadence: DEFAULT_CADENCE,
      lexicon: {
        preferred_words: [],
        avoid_words: [],
        banned_words,
      },
      formatting: {
        emoji_policy: "none",
        exclamation_policy: "rare",
        capitalization: "standard",
        bullets: "allowed",
        headline_style: "clean minimal",
      },
      claims_policy: {
        medical_claims: form.medicalClaims,
        before_after_promises: form.beforeAfterPromises,
        substantiation_required: form.substantiationRequired,
        allowed_phrasing: ["may help", "supports", "designed to"],
      },
      channel_adapters,
      examples: { do: [], dont: [] },
    };
  };

  const handleSubmit = () => {
    const candidate = buildProfile();
    const result = safeParseVoiceProfile(candidate);
    if (result.success) {
      setProfile(result.data);
      setValidationError(null);
    } else {
      const err = zodToVoiceEngineError(result.error);
      setValidationError(err);
      setProfile(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-medium text-white">Voice Profile Builder</h1>

      {/* Step indicator */}
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i + 1)}
            className={`h-2 flex-1 rounded transition-colors ${
              step === i + 1 ? "bg-violet-500" : "bg-white/20 hover:bg-white/30"
            }`}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Step 1: Archetype */}
        {step === 1 && (
          <fieldset>
            <legend className="text-sm font-medium text-white/80 mb-2">
              Step 1: Primary Archetype
            </legend>
            <select
              value={form.archetype}
              onChange={(e) => updateForm("archetype", e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {LIGS_ARCHETYPES.map((a) => (
                <option key={a} value={a} className="bg-[#050814]">
                  {a}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        {/* Step 2: Descriptors */}
        {step === 2 && (
          <fieldset>
            <legend className="text-sm font-medium text-white/80 mb-2">
              Step 2: Voice Descriptors (comma separated, 3–24)
            </legend>
            <textarea
              value={form.descriptors}
              onChange={(e) => updateForm("descriptors", e.target.value)}
              placeholder="calm, regulated, premium, clear, warmly precise"
              rows={3}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </fieldset>
        )}

        {/* Step 3: Banned words */}
        {step === 3 && (
          <fieldset>
            <legend className="text-sm font-medium text-white/80 mb-2">
              Step 3: Banned Words (comma separated)
            </legend>
            <textarea
              value={form.bannedWords}
              onChange={(e) => updateForm("bannedWords", e.target.value)}
              placeholder="guarantee, miracle, cure"
              rows={2}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </fieldset>
        )}

        {/* Step 4: Claims policy */}
        {step === 4 && (
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-white/80 mb-2 block">
              Step 4: Claims Policy
            </legend>
            <div>
              <label className="block text-xs text-white/60 mb-1">Medical claims</label>
              <select
                value={form.medicalClaims}
                onChange={(e) => updateForm("medicalClaims", e.target.value)}
                className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="prohibited" className="bg-[#050814]">Prohibited</option>
                <option value="allowed_with_disclaimer" className="bg-[#050814]">Allowed with disclaimer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Before/after promises</label>
              <select
                value={form.beforeAfterPromises}
                onChange={(e) => updateForm("beforeAfterPromises", e.target.value)}
                className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="prohibited" className="bg-[#050814]">Prohibited</option>
                <option value="allowed_with_proof" className="bg-[#050814]">Allowed with proof</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.substantiationRequired}
                onChange={(e) => updateForm("substantiationRequired", e.target.checked)}
                className="rounded border-white/30"
              />
              <span className="text-sm text-white/80">Substantiation required</span>
            </label>
          </fieldset>
        )}

        {/* Step 5: Channel adapters */}
        {step === 5 && (
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-white/80 mb-2 block">
              Step 5: Channel Adapters (tone + structure)
            </legend>
            {CHANNELS.map((ch) => (
              <div key={ch} className="p-3 rounded bg-white/5 space-y-2">
                <div className="text-sm font-medium text-violet-300 capitalize">
                  {ch.replace(/_/g, " ")}
                </div>
                <input
                  type="text"
                  value={form.channelAdapters[ch]?.tone_shift || ""}
                  onChange={(e) => updateChannelAdapter(ch, "tone_shift", e.target.value)}
                  placeholder="Tone shift"
                  className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
                <input
                  type="text"
                  value={form.channelAdapters[ch]?.structure || ""}
                  onChange={(e) => updateChannelAdapter(ch, "structure", e.target.value)}
                  placeholder="Structure (comma separated)"
                  className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>
            ))}
          </fieldset>
        )}

        {/* Validation errors */}
        {validationError && validationError.kind === "VALIDATION_ERROR" && (
          <div className="p-3 rounded bg-red-950/50 border border-red-500/50 text-red-200 text-sm">
            <div className="font-medium mb-1">Validation failed</div>
            <ul className="list-disc list-inside space-y-0.5">
              {validationError.issues.map((i, idx) => (
                <li key={idx}>
                  {i.path ? `${i.path}: ` : ""}{i.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation + Submit */}
        <div className="flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Back
            </button>
          )}
          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 rounded bg-violet-600 text-white hover:bg-violet-500 transition-colors"
            >
              Build Profile
            </button>
          )}
        </div>
      </form>

      {/* Result */}
      {profile && (
        <div className="p-4 rounded bg-white/5 border border-white/20">
          <h2 className="text-sm font-medium text-violet-300 mb-2">Profile (local state)</h2>
          <pre className="text-xs text-white/80 overflow-auto max-h-64 font-mono">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
