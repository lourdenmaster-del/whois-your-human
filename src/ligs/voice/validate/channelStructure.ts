import type { VoiceProfile } from "../schema";
import type { ValidationResult, ValidationIssue } from "./types";

/**
 * Basic check that output contains expected structure elements for the channel.
 * Uses heuristics: headings (## or ###), bullets (- or *), paragraph breaks.
 */
export function validateChannelStructure(
  text: string,
  profile: VoiceProfile,
  channel: string | null
): ValidationResult {
  if (!channel) return { pass: true, issues: [] };

  const adapter = profile.channel_adapters?.[channel];
  if (!adapter || adapter.structure.length === 0) {
    return { pass: true, issues: [] };
  }

  const issues: ValidationIssue[] = [];
  const structure = adapter.structure.map((s) => s.toLowerCase());

  const hasHeadings = /^#{1,6}\s/m.test(text) || /^(?:headline|subhead|heading)/im.test(text);
  const hasBullets = /^\s*[-*•]\s/m.test(text) || /^\s*\d+\.\s/m.test(text);
  const hasParagraphs = /\n\n+/.test(text);

  if (structure.some((s) => s.includes("headline") || s.includes("head"))) {
    if (!hasHeadings && text.length > 100) {
      issues.push({
        rule: "channel_structure",
        message: `Channel "${channel}" expects headline/heading`,
        severity: "warning",
        detail: "No clear headline detected",
      });
    }
  }

  if (structure.some((s) => s.includes("bullet") || s.includes("list"))) {
    if (!hasBullets && text.length > 150) {
      issues.push({
        rule: "channel_structure",
        message: `Channel "${channel}" expects bullet/list structure`,
        severity: "warning",
        detail: "No bullets detected",
      });
    }
  }

  if (structure.some((s) => s.includes("cta") || s.includes("call"))) {
    const hasCta = /\b(shop|buy|learn more|get started|sign up|subscribe)\b/i.test(text);
    if (!hasCta && text.length > 100) {
      issues.push({
        rule: "channel_structure",
        message: `Channel "${channel}" expects CTA`,
        severity: "warning",
        detail: "No clear call-to-action detected",
      });
    }
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}
