"use client";

import { useState } from "react";

const EMPTY_DEFAULTS = {
  name: "",
  birthDate: "",
  birthTime: "",
  birthLocation: "",
  email: "",
  notes: "",
};

const DEV_TEST_DEFAULTS =
  process.env.NODE_ENV === "development"
    ? {
        name: "Test User",
        birthDate: "1990-01-15",
        birthTime: "14:30",
        birthLocation: "New York, NY",
        email: "test@example.com",
        notes: "",
      }
    : null;

const getInitialDefaults = () =>
  process.env.NODE_ENV === "development" && DEV_TEST_DEFAULTS
    ? { ...EMPTY_DEFAULTS, ...DEV_TEST_DEFAULTS }
    : EMPTY_DEFAULTS;

export default function LightIdentityForm({
  onSubmit,
  showOptionalNotes = false,
  submitButtonLabel = "Generate My Light Identity Report",
  showDryRunButton = false,
}) {
  const [formData, setFormData] = useState(getInitialDefaults());
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const runSubmit = async (dryRun) => {
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(formData, { dryRun });
      }
    } catch (err) {
      console.error("Form submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runSubmit(false);
  };

  const handleDryRunClick = (e) => {
    e.preventDefault();
    runSubmit(true);
  };

  const handleFullClick = (e) => {
    e.preventDefault();
    runSubmit(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-sm text-[#F5F5F5] mb-2 font-normal">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0A0F1C]/80 border border-[#F5F5F5]/25 text-[#F5F5F5] text-base font-normal placeholder:text-[#F5F5F5]/50 focus:outline-none focus:border-[#7A4FFF] focus:ring-1 focus:ring-[#7A4FFF]/50 transition-colors duration-200 disabled:opacity-50"
            placeholder=""
          />
        </div>

        {/* Birth Date */}
        <div>
          <label htmlFor="birthDate" className="block text-sm text-[#F5F5F5] mb-2 font-normal">
            Birth Date
          </label>
          <input
            type="text"
            id="birthDate"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="e.g. 1990-01-15 or Jan 15, 1990"
            className="w-full px-4 py-3 bg-[#0A0F1C]/80 border border-[#F5F5F5]/25 text-[#F5F5F5] text-base font-normal placeholder:text-[#F5F5F5]/50 focus:outline-none focus:border-[#7A4FFF] focus:ring-1 focus:ring-[#7A4FFF]/50 transition-colors duration-200 disabled:opacity-50"
          />
          <p className="mt-1.5 text-xs text-[#F5F5F5]/50 font-normal">
            Any clear date format is fine (e.g. 15 January 1990, 01/15/1990, 1990-01-15).
          </p>
        </div>

        {/* Birth Time */}
        <div>
          <label htmlFor="birthTime" className="block text-sm text-[#F5F5F5] mb-2 font-normal">
            Birth Time
          </label>
          <input
            type="time"
            id="birthTime"
            name="birthTime"
            value={formData.birthTime}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0A0F1C]/80 border border-[#F5F5F5]/25 text-[#F5F5F5] text-base font-normal focus:outline-none focus:border-[#7A4FFF] focus:ring-1 focus:ring-[#7A4FFF]/50 transition-colors duration-200 disabled:opacity-50"
          />
        </div>

        {/* Birth Location */}
        <div>
          <label htmlFor="birthLocation" className="block text-sm text-[#F5F5F5] mb-2 font-normal">
            Birth Location
          </label>
          <input
            type="text"
            id="birthLocation"
            name="birthLocation"
            value={formData.birthLocation}
            onChange={handleChange}
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0A0F1C]/80 border border-[#F5F5F5]/25 text-[#F5F5F5] text-base font-normal placeholder:text-[#F5F5F5]/50 focus:outline-none focus:border-[#7A4FFF] focus:ring-1 focus:ring-[#7A4FFF]/50 transition-colors duration-200 disabled:opacity-50"
            placeholder=""
          />
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="email" className="block text-sm text-[#F5F5F5] mb-2 font-normal">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-[#0A0F1C]/80 border border-[#F5F5F5]/25 text-[#F5F5F5] text-base font-normal placeholder:text-[#F5F5F5]/50 focus:outline-none focus:border-[#7A4FFF] focus:ring-1 focus:ring-[#7A4FFF]/50 transition-colors duration-200 disabled:opacity-50"
            placeholder=""
          />
        </div>

        {/* Optional Notes */}
        {showOptionalNotes && (
          <div>
            <label htmlFor="notes" className="block text-sm text-[#F5F5F5] mb-2 font-normal">
              Optional Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              rows={3}
              className="w-full px-4 py-3 bg-[#0A0F1C]/80 border border-[#F5F5F5]/25 text-[#F5F5F5] text-base font-normal placeholder:text-[#F5F5F5]/50 focus:outline-none focus:border-[#7A4FFF] focus:ring-1 focus:ring-[#7A4FFF]/50 transition-colors duration-200 disabled:opacity-50 resize-y"
              placeholder="Any context you’d like to share (optional)"
            />
          </div>
        )}

        {/* Submit Button(s) */}
        <div className="pt-4 space-y-3">
          {showDryRunButton ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={handleDryRunClick}
                className="w-full px-6 py-3 border border-[#7A4FFF] text-[#7A4FFF] text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#7A4FFF]/10"
              >
                {loading ? "..." : "Dry run (no API)"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleFullClick}
                className="w-full px-6 py-3.5 bg-[#FF3B3B] text-white text-sm font-semibold relative overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: "0 0 0 rgba(255, 59, 59, 0)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 59, 59, 0.4)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 rgba(255, 59, 59, 0)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {loading ? "Generating..." : submitButtonLabel}
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 bg-[#FF3B3B] text-white text-sm font-semibold relative overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: "0 0 0 rgba(255, 59, 59, 0)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 59, 59, 0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 0 rgba(255, 59, 59, 0)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
            >
              {loading ? "Generating..." : submitButtonLabel}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
