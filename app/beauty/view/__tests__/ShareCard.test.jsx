/**
 * Unit tests for ShareCard component.
 */

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ShareCard, {
  extractArchetypeFromProfile,
  pickSignatureImage,
} from "../ShareCard";

afterEach(cleanup);

describe("ShareCard", () => {
  const mockProfile = {
    reportId: "test-123",
    dominantArchetype: "Radiantis",
    imageUrls: [
      "data:image/svg+xml,placeholder1",
      "https://example.com/light-signature.png",
      "https://example.com/final.png",
    ],
  };

  it("renders archetype label", () => {
    render(
      <ShareCard
        profile={mockProfile}
        shareUrl="https://example.com/view?reportId=test"
        onCopyLink={vi.fn()}
      />
    );
    expect(screen.getByText("Radiantis")).toBeInTheDocument();
  });

  it("renders tagline from getMarketingDescriptor", () => {
    render(
      <ShareCard
        profile={mockProfile}
        shareUrl="https://example.com/view"
        onCopyLink={vi.fn()}
      />
    );
    expect(screen.getByText("Illuminate. Expand. Clarify.")).toBeInTheDocument();
  });

  it("renders Copy share link and Download image buttons", () => {
    render(
      <ShareCard
        profile={mockProfile}
        shareUrl="https://example.com"
        onCopyLink={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /copy share link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download image/i })).toBeInTheDocument();
  });

  it("renders up to 3 hit points", () => {
    render(
      <ShareCard
        profile={mockProfile}
        shareUrl="https://example.com/view"
        onCopyLink={vi.fn()}
      />
    );
    expect(screen.getByText("Luminous, warm expression")).toBeInTheDocument();
    expect(screen.getByText("Clarity and openness")).toBeInTheDocument();
  });

  it("renders (L) brand mark", () => {
    render(
      <ShareCard
        profile={mockProfile}
        shareUrl="https://example.com"
        onCopyLink={vi.fn()}
      />
    );
    expect(screen.getByText("(L)")).toBeInTheDocument();
  });

  it("uses dominantArchetype when present", () => {
    render(
      <ShareCard
        profile={{ ...mockProfile, dominantArchetype: "Stabiliora" }}
        shareUrl="https://example.com"
        onCopyLink={vi.fn()}
      />
    );
    expect(screen.getByText("Stabiliora")).toBeInTheDocument();
    expect(screen.getByText("Restore balance. Stay coherent.")).toBeInTheDocument();
  });

  it("extracts archetype from profile when dominantArchetype missing", () => {
    const profile = {
      reportId: "x",
      archetype: {
        raw_signal: "Dominant Radiantis with Structoris.",
        custodian: "",
        oracle: "",
      },
    };
    const arch = extractArchetypeFromProfile(profile);
    expect(arch).toBe("Radiantis");
  });

  it("pickSignatureImage prefers index 1 (Light Signature)", () => {
    const urls = ["url0", "url1", "url2"];
    expect(pickSignatureImage(urls)).toBe("url1");
  });

  it("pickSignatureImage falls back to first when index 1 missing", () => {
    expect(pickSignatureImage(["url0"])).toBe("url0");
  });
});
