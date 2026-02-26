import type { MarketingOverlaySpec } from "./schema";

export interface OverlaySpecIssue {
  rule: string;
  message: string;
  severity: "error" | "warning";
  detail?: string;
}

export interface OverlaySpecValidationResult {
  pass: boolean;
  score: number;
  issues: OverlaySpecIssue[];
}

const MEDICAL_CLAIM_PATTERNS = [
  /\bcure[sd]?\b/i,
  /\bheal(s|ing|ed)?\b/i,
  /\btreat(s|ing|ment|ed)?\b/i,
  /\bdiagnos(e|is|ed)\b/i,
  /\bmedical(ly)?\s+(proven|effective)\b/i,
  /\beliminates?\s+(wrinkles?|aging)\b/i,
];

const GUARANTEE_PATTERNS = [
  /\bguaranteed?\b/i,
  /\bmiracle\b/i,
  /\b100%\s+(effective|success)\b/i,
  /\bbefore\s+and\s+after\b/i,
  /\binstant(ly)?\s+(results?|transformation)\b/i,
];

function checkCopyLengths(spec: MarketingOverlaySpec): OverlaySpecIssue[] {
  const issues: OverlaySpecIssue[] = [];
  if (spec.copy.headline.length > 60) {
    issues.push({ rule: "copy_length", message: "Headline exceeds 60 chars", severity: "error" });
  }
  if (spec.copy.subhead && spec.copy.subhead.length > 140) {
    issues.push({ rule: "copy_length", message: "Subhead exceeds 140 chars", severity: "error" });
  }
  if (spec.copy.cta && spec.copy.cta.length > 24) {
    issues.push({ rule: "copy_length", message: "CTA exceeds 24 chars", severity: "error" });
  }
  return issues;
}

function checkBannedWords(spec: MarketingOverlaySpec): OverlaySpecIssue[] {
  const issues: OverlaySpecIssue[] = [];
  const combined = [
    spec.copy.headline,
    spec.copy.subhead ?? "",
    spec.copy.cta ?? "",
  ].join(" ");
  const lower = combined.toLowerCase();

  for (const word of spec.constraints.bannedWords) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (re.test(lower)) {
      issues.push({
        rule: "banned_words",
        message: `Banned word "${word}" found in copy`,
        severity: "error",
        detail: word,
      });
    }
  }
  return issues;
}

function checkMedicalClaims(spec: MarketingOverlaySpec): OverlaySpecIssue[] {
  if (!spec.constraints.noMedicalClaims) return [];
  const issues: OverlaySpecIssue[] = [];
  const combined = [
    spec.copy.headline,
    spec.copy.subhead ?? "",
    spec.copy.cta ?? "",
  ].join(" ");

  for (const re of MEDICAL_CLAIM_PATTERNS) {
    const match = combined.match(re);
    if (match) {
      issues.push({
        rule: "medical_claims",
        message: "Medical claim detected",
        severity: "error",
        detail: `"${match[0]}"`,
      });
      break;
    }
  }
  return issues;
}

function checkGuarantees(spec: MarketingOverlaySpec): OverlaySpecIssue[] {
  if (!spec.constraints.noGuarantees) return [];
  const issues: OverlaySpecIssue[] = [];
  const combined = [
    spec.copy.headline,
    spec.copy.subhead ?? "",
    spec.copy.cta ?? "",
  ].join(" ");

  for (const re of GUARANTEE_PATTERNS) {
    const match = combined.match(re);
    if (match) {
      issues.push({
        rule: "no_guarantees",
        message: "Guarantee or before/after promise detected",
        severity: "error",
        detail: `"${match[0]}"`,
      });
      break;
    }
  }
  return issues;
}

function checkPlacement(spec: MarketingOverlaySpec): OverlaySpecIssue[] {
  const issues: OverlaySpecIssue[] = [];
  const p = spec.placement;

  const inBounds = (v: number) => v >= 0 && v <= 1;
  if (!inBounds(p.safeArea.x) || !inBounds(p.safeArea.y) || !inBounds(p.safeArea.w) || !inBounds(p.safeArea.h)) {
    issues.push({ rule: "placement", message: "safeArea out of 0..1 bounds", severity: "error" });
  }
  if (p.logo.maxWidthPct < 0.1 || p.logo.maxWidthPct > 0.3) {
    issues.push({ rule: "placement", message: "logo.maxWidthPct must be 0.1..0.3", severity: "error" });
  }
  if (p.logo.paddingPct < 0 || p.logo.paddingPct > 0.1) {
    issues.push({ rule: "placement", message: "logo.paddingPct must be 0..0.1", severity: "error" });
  }
  const box = p.textBlock.box;
  if (!inBounds(box.x) || !inBounds(box.y) || !inBounds(box.w) || !inBounds(box.h)) {
    issues.push({ rule: "placement", message: "textBlock.box out of 0..1 bounds", severity: "error" });
  }
  return issues;
}

function checkTemplateId(spec: MarketingOverlaySpec): OverlaySpecIssue[] {
  if (spec.templateId !== "square_card_v1") {
    return [{ rule: "templateId", message: "Invalid templateId", severity: "error", detail: spec.templateId }];
  }
  return [];
}

export function validateOverlaySpec(spec: MarketingOverlaySpec): OverlaySpecValidationResult {
  const issues: OverlaySpecIssue[] = [];

  issues.push(...checkCopyLengths(spec));
  issues.push(...checkBannedWords(spec));
  issues.push(...checkMedicalClaims(spec));
  issues.push(...checkGuarantees(spec));
  issues.push(...checkPlacement(spec));
  issues.push(...checkTemplateId(spec));

  const uniqueByRule = new Map<string, OverlaySpecIssue>();
  for (const issue of issues) {
    const key = `${issue.rule}:${issue.message}`;
    if (!uniqueByRule.has(key)) uniqueByRule.set(key, issue);
  }
  const deduped = Array.from(uniqueByRule.values());

  const errorCount = deduped.filter((i) => i.severity === "error").length;
  const warningCount = deduped.filter((i) => i.severity === "warning").length;
  const pass = errorCount === 0;
  const score = Math.max(0, 100 - errorCount * 25 - warningCount * 5);

  return {
    pass,
    score,
    issues: deduped,
  };
}
