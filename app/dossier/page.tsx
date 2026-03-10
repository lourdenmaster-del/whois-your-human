/**
 * /dossier — Static sample Identity Dossier (white-paper style).
 * Shows what a full LIGS report looks like. Does not modify preview/report flow.
 */

import Link from "next/link";
import FlowNav from "@/components/FlowNav";
import { IGNIS_V1_ARTIFACTS } from "@/lib/exemplar-store";
import { SAMPLE_REPORT_IGNIS } from "@/lib/sample-report";

const ARC_IMAGE = "/arc-static-images/ignispectrum-static1.png";

export const metadata = {
  title: "Identity Dossier | LIGS",
  description: "Sample LIGS Human Identity Dossier — registry record and report sections.",
};

export default function DossierPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <article className="mx-auto max-w-3xl px-8 py-16 sm:px-12 sm:py-20">
        {/* Title */}
        <header className="mb-12 border-b border-black/20 pb-8">
          <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">
            LIGS HUMAN IDENTITY DOSSIER
          </h1>
          <p className="mt-2 text-sm text-black/70 uppercase tracking-widest">
            Human WHOIS Registry Record
          </p>
        </header>

        {/* Registry record block */}
        <div className="mb-12 rounded border-2 border-black/30 bg-black/[0.02] p-6 font-mono text-sm">
          <p><span className="text-black/60">Registry ID:</span> LIR-EX-0001</p>
          <p className="mt-2"><span className="text-black/60">Subject:</span> Sample Record</p>
          <p className="mt-2"><span className="text-black/60">Birth Timestamp:</span> March 21 1987 10:32</p>
          <p className="mt-2"><span className="text-black/60">Location:</span> Lisbon, Portugal</p>
          <p className="mt-2"><span className="text-black/60">Primary Archetype:</span> Ignispectrum</p>
        </div>

        {/* Section I — Identity Resolution */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/80">
            SECTION I — Identity Resolution
          </h2>
          <p className="leading-relaxed text-black/90">
            {SAMPLE_REPORT_IGNIS.initiation.slice(0, 340)}…
          </p>
        </section>

        {/* Section II — Archetype Profile */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/80">
            SECTION II — Archetype Profile
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="shrink-0">
              <img
                src={ARC_IMAGE}
                alt="Ignispectrum archetype"
                className="h-40 w-40 rounded object-cover object-center sm:h-48 sm:w-48"
              />
            </div>
            <p className="flex-1 leading-relaxed text-black/90">
              {SAMPLE_REPORT_IGNIS.archetypeExpression.slice(0, 380)}…
            </p>
          </div>
        </section>

        {/* Section III — Light Expression */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/80">
            SECTION III — Light Expression
          </h2>
          <p className="leading-relaxed text-black/90">
            {SAMPLE_REPORT_IGNIS.fieldConditions.slice(0, 400)}…
          </p>
        </section>

        {/* Section IV — Environmental Interaction */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/80">
            SECTION IV — Environmental Interaction
          </h2>
          <p className="leading-relaxed text-black/90">
            {SAMPLE_REPORT_IGNIS.deviations.slice(0, 380)}…
          </p>
        </section>

        {/* Section V — Cosmic Analog */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/80">
            SECTION V — Cosmic Analog
          </h2>
          <p className="leading-relaxed text-black/90">
            {SAMPLE_REPORT_IGNIS.cosmicTwin.slice(0, 420)}…
          </p>
        </section>

        {/* Section VI — Identity Artifact */}
        <section className="mb-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-black/80">
            SECTION VI — Identity Artifact
          </h2>
          <p className="mb-4 leading-relaxed text-black/90">
            {SAMPLE_REPORT_IGNIS.returnToCoherence.slice(0, 280)}…
          </p>
          <div className="overflow-hidden rounded border border-black/20">
            <img
              src={IGNIS_V1_ARTIFACTS.finalBeautyField}
              alt="Identity artifact — share card"
              className="w-full object-cover"
            />
          </div>
        </section>

        {/* CTA */}
        <footer className="border-t border-black/20 pt-8 space-y-4">
          <FlowNav variant="light" />
          <Link
            href="/origin"
            className="inline-block rounded bg-black px-6 py-3 text-sm font-medium text-white transition hover:bg-black/85"
          >
            Run your own identity query →
          </Link>
        </footer>
      </article>
    </div>
  );
}
