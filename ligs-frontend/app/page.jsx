"use client";

import { useState } from "react";

export default function Home() {
  const [formData, setFormData] = useState({
    fullName: "",
    birthDate: "",
    birthTime: "",
    birthLocation: "",
    email: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder: will connect to engine later
    console.log("Form submitted:", formData);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#fafafa]">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 sm:px-12 lg:px-24 pt-24 pb-16">
        <div className="max-w-3xl">
          <p className="text-[#737373] text-sm uppercase tracking-[0.3em] mb-6 font-mono">
            Light Identity Grid System
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
            Identity is not random.
            <br />
            <span className="text-[#737373]">It is a structural imprint.</span>
          </h1>
          <p className="text-lg text-[#a3a3a3] max-w-xl leading-relaxed mb-12">
            Physical forces present at birth create a stable identity architecture. 
            LIGS maps your Light Signature, Grid, and Archetype—scientifically, structurally, measurably.
          </p>
          <a
            href="#report"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-medium rounded-sm hover:bg-[#e5e5e5] transition-colors"
          >
            Access your Light Identity Report
          </a>
        </div>
      </section>

      {/* Sections */}
      <section className="relative px-6 sm:px-12 lg:px-24 py-24 border-t border-[#262626]">
        <div className="max-w-3xl mx-auto space-y-24">
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#737373] font-mono mb-4">
              The Claim
            </h2>
            <p className="text-xl text-[#e5e5e5] leading-relaxed">
              Identity is a structural imprint created by measurable physical forces present at birth. 
              It is not random, chosen, or invented. It is a stable architecture that remains consistent throughout life.
            </p>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#737373] font-mono mb-4">
              The Equation
            </h2>
            <p className="text-2xl font-mono text-white mb-4">(L)igs</p>
            <p className="text-[#a3a3a3] leading-relaxed">
              The Light Identity Grid System. It models how external forces imprint a repeatable identity structure at birth. 
              The equation represents the conversion of force-imprint data into a stable identity architecture.
            </p>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#737373] font-mono mb-4">
              The Light Signature
            </h2>
            <p className="text-[#e5e5e5] leading-relaxed">
              The Light Signature is the unique identity imprint formed at the moment of birth. 
              It is created by the interaction of light, gravity, motion, angle, and position. 
              It establishes the baseline structure of identity.
            </p>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#737373] font-mono mb-4">
              The Grid
            </h2>
            <p className="text-[#e5e5e5] leading-relaxed">
              The Grid is the structural organization of the Light Signature. 
              It defines the individual&apos;s internal architecture, expression patterns, and behavioral tendencies. 
              The Grid is stable and does not change over time.
            </p>
          </div>

          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-[#737373] font-mono mb-4">
              The Archetypes
            </h2>
            <p className="text-[#a3a3a3] mb-6 leading-relaxed">
              Twelve structural identity types: Ignispectrum, Stabiliora, Duplicaris, Tenebris, 
              Radiantis, Precisura, Aequilibris, Obscurion, Vectoris, Structoris, Innovaris, Fluxionis.
            </p>
            <p className="text-[#e5e5e5] text-sm leading-relaxed">
              Each archetype represents a distinct structural identity type—not personality, but architecture.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section
        id="report"
        className="relative px-6 sm:px-12 lg:px-24 py-24 border-t border-[#262626]"
      >
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Light Identity Report
          </h2>
          <p className="text-[#737373] mb-12">
            Enter your birth data. The report reveals your Light Signature, Grid, and Archetype.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm text-[#a3a3a3] mb-2"
              >
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-sm text-white placeholder:text-[#525252] focus:outline-none focus:border-[#525252] transition-colors"
                placeholder=""
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="birthDate"
                  className="block text-sm text-[#a3a3a3] mb-2"
                >
                  Birth Date
                </label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-sm text-white focus:outline-none focus:border-[#525252] transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="birthTime"
                  className="block text-sm text-[#a3a3a3] mb-2"
                >
                  Birth Time
                </label>
                <input
                  type="time"
                  id="birthTime"
                  name="birthTime"
                  value={formData.birthTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-sm text-white focus:outline-none focus:border-[#525252] transition-colors"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="birthLocation"
                className="block text-sm text-[#a3a3a3] mb-2"
              >
                Birth Location
              </label>
              <input
                type="text"
                id="birthLocation"
                name="birthLocation"
                value={formData.birthLocation}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-sm text-white placeholder:text-[#525252] focus:outline-none focus:border-[#525252] transition-colors"
                placeholder="City, Country"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-[#a3a3a3] mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-transparent border border-[#262626] rounded-sm text-white placeholder:text-[#525252] focus:outline-none focus:border-[#525252] transition-colors"
                placeholder=""
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-white text-black text-sm font-medium rounded-sm hover:bg-[#e5e5e5] transition-colors"
            >
              Generate Report
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 sm:px-12 lg:px-24 py-12 border-t border-[#262626]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#525252] uppercase tracking-wider font-mono">
            LIGS — Light Identity Grid System
          </p>
          <p className="text-xs text-[#525252]">
            A scientific identity framework.
          </p>
        </div>
      </footer>
    </main>
  );
}
