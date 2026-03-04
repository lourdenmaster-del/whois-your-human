"use client";

/**
 * Root-level error boundary. Replaces root layout when triggered.
 * Must define own <html> and <body> per Next.js convention.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-[#050814] text-[#F5F5F5]">
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <p className="text-[#7A4FFF] text-sm uppercase tracking-widest mb-4">Something went wrong</p>
          <p className="text-[#F5F5F5]/80 mb-6 text-center max-w-md">{error?.message ?? "An error occurred"}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-3 bg-[#7A4FFF] text-white text-sm font-semibold rounded-lg hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
