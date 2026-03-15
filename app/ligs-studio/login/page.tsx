"use client";

import { useState } from "react";

export default function LigsStudioLoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/studio-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: token.trim() }),
      });
      if (res.ok) {
        window.location.href = "/ligs-studio";
        return;
      }
      if (res.status === 403) setError("Invalid token.");
      else setError("Request failed.");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0b]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        <label className="text-sm font-mono text-[#9a9aa0]">
          Studio token
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full px-3 py-2 rounded border border-[#2a2a2e] bg-[#0d0d0f] text-[#e8e8ec] font-mono text-sm"
          />
        </label>
        {error && (
          <p className="text-sm font-mono text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="py-2 rounded border border-[#2a2a2e] font-mono text-sm text-[#c8c8cc] hover:border-[#5a5a62] disabled:opacity-50"
        >
          {loading ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
