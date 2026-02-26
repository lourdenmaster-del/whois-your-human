"use client";

export default function BeautyError({ error, reset }) {
  return (
    <div className="beauty-theme min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--beauty-cream)]" style={{ background: "var(--beauty-cream, #fdf8f5)" }}>
      <p className="beauty-heading text-xl text-[var(--beauty-text)] mb-2">Something went wrong</p>
      <p className="beauty-body text-sm text-[var(--beauty-text-muted)] mb-6 text-center max-w-md">{error?.message ?? "An error occurred"}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-6 py-3 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
