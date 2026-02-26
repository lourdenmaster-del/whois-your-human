/**
 * Integration tests for POST /api/voice/generate.
 * Calls the route handler directly with Request objects.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST } from "../route";

const validProfile = {
  id: "vp_test",
  version: "1.0.0",
  created_at: "2025-02-20T12:00:00.000Z",
  owner_user_id: "u1",
  brand: { name: "Test", products: [], audience: "" },
  ligs: { primary_archetype: "Stabiliora", secondary_archetype: null, blend_weights: {} },
  descriptors: ["calm", "clear", "precise"],
  cadence: {
    sentence_length: { target_words: 14, range: [8, 22] },
    paragraph_length: { target_sentences: 2, range: [1, 4] },
  },
  lexicon: { preferred_words: [], avoid_words: [], banned_words: [] },
  formatting: {
    emoji_policy: "none",
    exclamation_policy: "rare",
    capitalization: "standard",
    bullets: "allowed",
    headline_style: "",
  },
  claims_policy: {
    medical_claims: "prohibited",
    before_after_promises: "prohibited",
    substantiation_required: true,
    allowed_phrasing: [],
  },
  channel_adapters: {},
  examples: { do: [], dont: [] },
};

function jsonRequest(body: unknown) {
  return new Request("http://test/api/voice/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/voice/generate", () => {
  it("returns 400 for invalid body (malformed JSON)", async () => {
    const req = new Request("http://test/api/voice/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("VOICE_REQUEST_INVALID");
  });

  it("returns 400 for invalid profile", async () => {
    const req = jsonRequest({
      profile: { id: "x" },
      task: "Write a product description for our serum.",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("VOICE_REQUEST_INVALID");
    expect(data.issues).toBeDefined();
  });

  it("returns 400 for invalid channel", async () => {
    const req = jsonRequest({
      profile: validProfile,
      task: "Write a product description.",
      channel: "instagram",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("VOICE_REQUEST_INVALID");
  });

  it("returns 400 for task too short", async () => {
    const req = jsonRequest({
      profile: validProfile,
      task: "Short",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 with valid body and includes requestId, dryRun, modelUsed", async () => {
    const req = jsonRequest({
      profile: validProfile,
      task: "Write a product description for our serum.",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.requestId).toBeDefined();
    expect(typeof data.requestId).toBe("string");
    expect(data.text).toBeDefined();
    expect(data.validation).toBeDefined();
    expect(data.chosen).toMatch(/^draft|rewrite$/);
    expect(typeof data.dryRun).toBe("boolean");
    expect(data.modelUsed).toBeDefined();
    expect(data.didRewrite).toBe(false);
  });

  it("runs rewrite pass when score is low (didRewrite true, includes validationBefore/After)", async () => {
    const req = jsonRequest({
      profile: validProfile,
      task: "Write a product description for our serum.",
      minScore: 100,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.didRewrite).toBe(true);
    expect(data.validationBefore).toBeDefined();
    expect(data.validationAfter).toBeDefined();
    expect(data.chosen).toMatch(/^draft|rewrite$/);
  });

  it("chosen logic: prefers rewrite when it passes and draft did not", async () => {
    const req = jsonRequest({
      profile: {
        ...validProfile,
        lexicon: {
          preferred_words: [],
          avoid_words: [],
          banned_words: ["testword123"],
        },
      },
      task: "Write exactly: This product testword123 delivers results.",
      minScore: 100,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.didRewrite).toBe(true);
  });
});
