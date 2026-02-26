import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOnThisDayContext } from "../onThisDay";

describe("getOnThisDayContext", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns <= 6 items from events, births, holidays", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          { text: "Event A", year: 1900 },
          { text: "Event B", year: 1950 },
          { text: "Event C", year: 2000 },
        ],
        births: [
          { text: "Person X born", year: 1920 },
          { text: "Person Y born", year: 1980 },
        ],
        holidays: [{ text: "Holiday Z", year: 0 }],
      }),
    });

    const result = await getOnThisDayContext(3, 15);
    expect(result).not.toBeNull();
    expect(result!.items.length).toBeLessThanOrEqual(6);
    expect(result!.month).toBe(3);
    expect(result!.day).toBe(15);
    expect(result!.source).toBe("wikimedia_onthisday");
  });

  it("truncates long text to ~140 chars", async () => {
    const long =
      "This is a very long event description that goes on and on " +
      "with many words and details that should definitely exceed " +
      "the one hundred forty character limit we have set for " +
      "each on-this-day item in our curation rules.";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [{ text: long, year: 1999 }],
      }),
    });

    const result = await getOnThisDayContext(1, 1);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0]!.text.length).toBeLessThanOrEqual(143);
    expect(result!.items[0]!.text).toMatch(/\.\.\.$/);
  });

  it("uses fallback when primary fails", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Primary failed"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          events: [{ text: "Fallback event", year: 1985 }],
        }),
      });

    const result = await getOnThisDayContext(6, 20);
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0]!.text).toBe("Fallback event");
    expect(result!.items[0]!.year).toBe(1985);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("caching returns same result without refetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [{ text: "Cached event", year: 1970 }],
      }),
    });

    const r1 = await getOnThisDayContext(7, 4);
    const r2 = await getOnThisDayContext(7, 4);

    expect(r1).toEqual(r2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when both fetches fail", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await getOnThisDayContext(12, 25);
    expect(result).toBeNull();
  });

  it("returns null when response has no usable items", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ events: [], births: [], holidays: [] }),
    });

    const result = await getOnThisDayContext(2, 14);
    expect(result).toBeNull();
  });
});
