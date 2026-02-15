"use client";

import { useState, useEffect } from "react";
import { unwrapResponse } from "@/lib/unwrap-response";

/**
 * Test pattern page: shows where reports are stored and how to fetch them.
 * Open /report-storage-test to verify storage and API flow.
 */
export default function ReportStorageTestPage() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/report/debug")
      .then((r) => unwrapResponse(r))
      .then(setInfo)
      .catch((e) => {
        console.error("API error", e);
        setError(e.message);
      });
  }, []);

  if (error) {
    return (
      <main className="min-h-screen p-8 bg-[#0A0F1C] text-[#F5F5F5] font-mono text-sm">
        <h1 className="text-xl font-semibold mb-4">Report storage test</h1>
        <p className="text-red-400">Error: {error}</p>
      </main>
    );
  }

  if (!info) {
    return (
      <main className="min-h-screen p-8 bg-[#0A0F1C] text-[#F5F5F5] font-mono text-sm">
        <h1 className="text-xl font-semibold mb-4">Report storage test</h1>
        <p className="text-[#F5F5F5]/60">Loading…</p>
      </main>
    );
  }

  const { storage, blobPathnamePattern, fetchHint, inMemoryCount, blobPathnames, memoryReportIds, testPattern } = info;

  return (
    <main className="min-h-screen p-8 bg-[#0A0F1C] text-[#F5F5F5] font-mono text-sm max-w-2xl">
      <h1 className="text-xl font-semibold mb-2 text-[#7A4FFF]">
        Where the report is stored
      </h1>
      <p className="text-[#F5F5F5]/70 mb-6">
        Use this page to confirm storage and the correct API flow.
      </p>

      <section className="mb-8 p-4 border border-[#0A0F1C] bg-[#0A0F1C]/50">
        <h2 className="text-sm uppercase tracking-wider text-[#7A4FFF] mb-3">
          Current storage
        </h2>
        <p><strong>Backend:</strong> {storage}</p>
        <p><strong>In-memory count:</strong> {inMemoryCount}</p>
        {blobPathnamePattern && (
          <p><strong>Blob pathname pattern:</strong> <code className="text-[#7A4FFF]">{blobPathnamePattern}</code></p>
        )}
        <p className="mt-2 text-[#F5F5F5]/80">{fetchHint}</p>
      </section>

      <section className="mb-8 p-4 border border-[#0A0F1C] bg-[#0A0F1C]/50">
        <h2 className="text-sm uppercase tracking-wider text-[#7A4FFF] mb-3">
          Test pattern (where the report should be)
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-[#F5F5F5]/90">
          <li>{testPattern?.step1}</li>
          <li>{testPattern?.step2}</li>
          <li>{testPattern?.step3}</li>
        </ol>
        <p className="mt-3 text-[#7A4FFF]">
          <strong>Where stored:</strong> {testPattern?.whereStored}
        </p>
      </section>

      {blobPathnames && blobPathnames.length > 0 && (
        <section className="mb-8 p-4 border border-[#0A0F1C] bg-[#0A0F1C]/50">
          <h2 className="text-sm uppercase tracking-wider text-[#7A4FFF] mb-3">
            Reports currently in Blob (sample)
          </h2>
          <p className="text-[#F5F5F5]/70 mb-2">
            To load one: <code className="text-[#7A4FFF]">GET /api/report/{"{id}"}</code> where id is the filename without <code>.json</code>.
          </p>
          <ul className="list-disc list-inside space-y-1">
            {blobPathnames.map((path) => {
              const id = path.replace(/^ligs-reports\//, "").replace(/\.json$/, "");
              return (
                <li key={path}>
                  <code className="text-[#F5F5F5]/90">{path}</code>
                  {" → "}
                  <a
                    href={`/api/report/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7A4FFF] hover:underline"
                  >
                    /api/report/{id}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {memoryReportIds && memoryReportIds.length > 0 && (
        <section className="mb-8 p-4 border border-[#0A0F1C] bg-[#0A0F1C]/50">
          <h2 className="text-sm uppercase tracking-wider text-[#7A4FFF] mb-3">
            Report IDs currently in memory
          </h2>
          <p className="text-[#F5F5F5]/70 mb-2">
            To load one: <code className="text-[#7A4FFF]">GET /api/report/{"{reportId}"}</code>
          </p>
          <ul className="list-disc list-inside space-y-1">
            {memoryReportIds.map((id) => (
              <li key={id}>
                <code className="text-[#F5F5F5]/90">{id}</code>
                {" → "}
                <a
                  href={`/api/report/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7A4FFF] hover:underline"
                >
                  /api/report/{id}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[#F5F5F5]/50 text-xs">
        This page is for debugging. Generate a report on the home page, then use the reportId in GET /api/report/{"{reportId}"}.
      </p>
    </main>
  );
}
