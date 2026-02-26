import { describe, it, expect } from "vitest";
import { pickBackgroundSource, backgroundToInputString } from "../ligs-studio-utils";

describe("pickBackgroundSource", () => {
  it("returns { url } from images[0].url", () => {
    const result = pickBackgroundSource({ images: [{ url: "https://example.com/img.png" }] });
    expect(result).toEqual({ url: "https://example.com/img.png" });
  });

  it("returns { b64 } from images[0].b64", () => {
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQHwAEBgIApD5fRAAAAABJRU5ErkJggg==";
    const result = pickBackgroundSource({ images: [{ b64 }] });
    expect(result).toEqual({ b64 });
  });

  it("returns { url } when images[0] is a string", () => {
    const result = pickBackgroundSource({ images: ["https://example.com/photo.jpg"] });
    expect(result).toEqual({ url: "https://example.com/photo.jpg" });
  });

  it("returns { url } from image.url", () => {
    const result = pickBackgroundSource({ image: { url: "https://cdn.example.com/bg.png" } });
    expect(result).toEqual({ url: "https://cdn.example.com/bg.png" });
  });

  it("returns { b64 } from image.b64", () => {
    const b64 = "abc123";
    const result = pickBackgroundSource({ image: { b64 } });
    expect(result).toEqual({ b64 });
  });

  it("returns null for empty/null input", () => {
    expect(pickBackgroundSource(null)).toBeNull();
    expect(pickBackgroundSource({})).toBeNull();
  });

  it("returns null when no valid url or b64", () => {
    expect(pickBackgroundSource({ images: [{}] })).toBeNull();
    expect(pickBackgroundSource({ images: [{ url: "" }] })).toBeNull();
    expect(pickBackgroundSource({ images: [{ url: 123 }] })).toBeNull();
  });
});

describe("backgroundToInputString", () => {
  it("returns url for { url }", () => {
    expect(backgroundToInputString({ url: "https://x.com/a.png" })).toBe("https://x.com/a.png");
  });

  it("returns data URL for { b64 }", () => {
    expect(backgroundToInputString({ b64: "xyz" })).toBe("data:image/png;base64,xyz");
  });

  it("returns empty string for null or empty", () => {
    expect(backgroundToInputString(null)).toBe("");
    expect(backgroundToInputString({})).toBe("");
  });
});
