"use client";

import { useState } from "react";

const SECTIONS = [
  { headline: "Identity is a physical imprint.", ideal: "Identity originates from measurable forces at birth, not personality or choice." },
  { headline: "(L)igs defines identity structurally.", ideal: "The equation models how force‑imprint data becomes a stable identity architecture." },
  { headline: "Your identity begins as light.", ideal: "The Light Signature is the raw identity imprint created at birth." },
  { headline: "Structure determines expression.", ideal: "The Grid organizes the Light Signature into a stable identity architecture." },
  { headline: "Identity is shaped by physics.", ideal: "Light, gravity, motion, angle, and position converge to create the imprint." },
  { headline: "Identity is an internal structure.", ideal: "Identity is an architecture with constraints, efficiencies, and predictable patterns." },
  { headline: "Identity types are structural.", ideal: "The twelve archetypes represent distinct identity architectures, not personalities." },
  { headline: "Identity follows measurable laws.", ideal: "Five laws define identity as force‑imprinted, stable, structural, predictive, and measurable." },
  { headline: "Identity must be delivered structurally.", ideal: "The Raw Signal, Custodian, and Oracle form a three‑voice system for clarity and consistency." },
  { headline: "Identity unfolds in six phases.", ideal: "Initiation → Revelation → Archetype → Correlation → Integration → Closing." },
  { headline: "Your identity, mapped scientifically.", ideal: "The report is generated in real time and reveals the Light Signature, Grid, and Archetype." },
  { headline: "No symbolism. No metaphor.", ideal: "LIGS uses a precise, analytical, non‑emotional, non‑spiritual tone." },
  { headline: "LIGS is a scientific discipline.", ideal: "Identity is a physical phenomenon, not a symbolic or psychological one." },
  { headline: "A repeatable identity process.", ideal: "Capture the Light Signature → map the Grid → identify the archetype → deliver the transmission." },
  { headline: "Identity is stable and predictable.", ideal: "Structural consistency across individuals validates the LIGS model." },
  { headline: "Identity clarifies everything.", ideal: "LIGS explains internal organization, decision‑making, and interaction patterns." },
  { headline: "See your identity as structure.", ideal: "LIGS offers a scientific way to understand who you are." },
];

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
    console.log("Form submitted:", formData);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <main className="min-h-screen bg-[#050814] text-[#F5F5F5] font-[family-name:var(--font-space-grotesk)]">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(10,15,28,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10,15,28,0.8) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 sm:px-12 lg:px-24 pt-24 pb-16">
        {/* Soft glow behind hero */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(168,85,255,0.15) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl">
          <p className="text-[#7A4FFF] text-sm uppercase tracking-[0.3em] mb-6 font-medium" style={{ letterSpacing: "0.3em" }}>
            Light Identity Grid System
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-wide leading-[1.1] mb-6 text-[#F5F5F5]" style={{ letterSpacing: "0.02em" }}>
            Identity is a physical imprint.
          </h1>
          <p className="text-lg text-[#F5F5F5]/60 max-w-xl leading-relaxed mb-12 font-light">
            Identity originates from measurable forces at birth, not personality or choice.
          </p>
          <a
            href="#report"
            className="inline-flex items-center px-6 py-3 bg-[#FF3B3B] text-white text-sm font-semibold hover:bg-[#ff5252] transition-colors duration-300"
            style={{ borderRadius: 0 }}
          >
            Access your Light Identity Report
          </a>
        </div>
      </section>

      {/* 17 Sections */}
      <section className="relative px-6 sm:px-12 lg:px-24 py-24 border-t border-[#0A0F1C]">
        <div className="max-w-3xl mx-auto space-y-20">
          {SECTIONS.map(({ headline, ideal }, i) => (
            <div key={i} className="border-l-2 border-[#0A0F1C] pl-8">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-wide text-[#F5F5F5] mb-3" style={{ letterSpacing: "0.02em" }}>
                {headline}
              </h2>
              <p className="text-[#F5F5F5]/60 leading-relaxed font-light">
                {ideal}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Offer */}
      <section className="relative px-6 sm:px-12 lg:px-24 py-24 border-t border-[#0A0F1C]">
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(168,85,255,0.2) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-[#F5F5F5] mb-4" style={{ letterSpacing: "0.02em" }}>
            Access your Light Identity Report.
          </h2>
          <p className="text-lg text-[#F5F5F5]/60 max-w-2xl mx-auto leading-relaxed font-light">
            The report reveals your Light Signature, Grid, and Archetype using the LIGS transmission system. 
            It is a scientific, real‑time identity mapping that shows the structure of who you are.
          </p>
        </div>
      </section>

      {/* CTA + Form */}
      <section
        id="report"
        className="relative px-6 sm:px-12 lg:px-24 py-24 border-t border-[#0A0F1C]"
      >
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-[#F5F5F5] mb-4" style={{ letterSpacing: "0.02em" }}>
            Begin mapping your unique Light Signature.
          </h2>
          <p className="text-[#F5F5F5]/80 mb-2 font-light">
            The imagery you receive will be the map.
          </p>
          <p className="text-[#F5F5F5]/80 mb-8 font-light">
            The report you receive will be the key.
          </p>
          <p className="text-[#F5F5F5]/60 mb-12 font-light">
            Take the first step into the LIGS system by generating your Light Identity Report.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="fullName" className="block text-sm text-[#F5F5F5]/60 mb-2 font-light">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-transparent border border-[#0A0F1C] text-[#F5F5F5] placeholder:text-[#F5F5F5]/30 focus:outline-none focus:border-[#7A4FFF] transition-colors duration-300 font-light"
                style={{ borderRadius: 0 }}
                placeholder=""
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="birthDate" className="block text-sm text-[#F5F5F5]/60 mb-2 font-light">
                  Birth Date
                </label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-transparent border border-[#0A0F1C] text-[#F5F5F5] focus:outline-none focus:border-[#7A4FFF] transition-colors duration-300 font-light"
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <label htmlFor="birthTime" className="block text-sm text-[#F5F5F5]/60 mb-2 font-light">
                  Birth Time
                </label>
                <input
                  type="time"
                  id="birthTime"
                  name="birthTime"
                  value={formData.birthTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-transparent border border-[#0A0F1C] text-[#F5F5F5] focus:outline-none focus:border-[#7A4FFF] transition-colors duration-300 font-light"
                  style={{ borderRadius: 0 }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="birthLocation" className="block text-sm text-[#F5F5F5]/60 mb-2 font-light">
                Birth Location
              </label>
              <input
                type="text"
                id="birthLocation"
                name="birthLocation"
                value={formData.birthLocation}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-transparent border border-[#0A0F1C] text-[#F5F5F5] placeholder:text-[#F5F5F5]/30 focus:outline-none focus:border-[#7A4FFF] transition-colors duration-300 font-light"
                style={{ borderRadius: 0 }}
                placeholder="City, Country"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm text-[#F5F5F5]/60 mb-2 font-light">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-transparent border border-[#0A0F1C] text-[#F5F5F5] placeholder:text-[#F5F5F5]/30 focus:outline-none focus:border-[#7A4FFF] transition-colors duration-300 font-light"
                style={{ borderRadius: 0 }}
                placeholder=""
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-[#FF3B3B] text-white text-sm font-semibold hover:bg-[#ff5252] transition-colors duration-300"
              style={{ borderRadius: 0 }}
            >
              Generate Report
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-6 sm:px-12 lg:px-24 py-12 border-t border-[#0A0F1C]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#F5F5F5]/40 uppercase tracking-widest font-medium" style={{ letterSpacing: "0.2em" }}>
            LIGS — Light Identity Grid System
          </p>
          <p className="text-xs text-[#F5F5F5]/40 font-light">
            A scientific identity framework.
          </p>
        </div>
      </footer>
    </main>
  );
}
