"use client";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-[#050814] text-[#F5F5F5] font-sans flex flex-col items-center justify-center px-6">
      <p className="text-[#7A4FFF] text-sm uppercase tracking-widest mb-4">Something went wrong</p>
      <p className="text-[#F5F5F5]/80 mb-6 text-center max-w-md">{error?.message ?? "An error occurred"}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-6 py-3 bg-[#FF3B3B] text-white text-sm font-semibold hover:bg-[#ff5252] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
