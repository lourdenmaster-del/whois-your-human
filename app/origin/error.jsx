"use client";

export default function OriginError({ error, reset }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0A0F1C] text-white">
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-white/70 text-sm mb-6">Please try again.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-6 py-2 bg-[#7A4FFF] text-white rounded-lg hover:bg-[#8b5fff] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
