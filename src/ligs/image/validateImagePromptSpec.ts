import type { ImagePromptSpec } from "./schema";

export interface ImagePromptSpecIssue {
  rule: string;
  message: string;
  severity: "error" | "warning";
  detail?: string;
}

export interface ImagePromptSpecValidationResult {
  pass: boolean;
  score: number;
  issues: ImagePromptSpecIssue[];
}

const DISALLOWED_POSITIVE_PATTERNS = [
  /\btext\b/i,
  /\bletters?\b/i,
  /\blogo(s)?\b/i,
  /\bwatermark(s)?\b/i,
  /\bsignature(s)?\b/i,
  /\bface(s)?\b/i,
  /\bperson(s)?\b/i,
  /\bpeople\b/i,
  /\bhuman(s)?\b/i,
  /\bfigure(s)?\b/i,
  /\bsilhouette(s)?\b/i,
  /\bzodiac\b/i,
  /\bastrology\b/i,
  /\bsymbol(s)?\b/i,
  /\btrademark(s)?\b/i,
  /\bbrand(ing)?\b/i,
];

const REQUIRED_NEGATIVE_TERMS = [
  "text",
  "letters",
  "logo",
  "watermark",
  "signature",
  "face",
  "person",
  "figure",
  "silhouette",
  "astrology",
  "zodiac",
  "symbols",
  "busy texture",
  "high contrast",
];

function checkNegativeHasExclusions(negative: string): ImagePromptSpecIssue[] {
  const issues: ImagePromptSpecIssue[] = [];
  const lower = negative.toLowerCase();

  for (const term of REQUIRED_NEGATIVE_TERMS) {
    if (!lower.includes(term)) {
      issues.push({
        rule: "negative_prompt_exclusion",
        message: `Negative prompt should exclude "${term}"`,
        severity: "error",
        detail: `Missing: ${term}`,
      });
    }
  }

  return issues;
}

function checkPositiveNoDisallowed(positive: string): ImagePromptSpecIssue[] {
  const issues: ImagePromptSpecIssue[] = [];

  for (const re of DISALLOWED_POSITIVE_PATTERNS) {
    const match = positive.match(re);
    if (match) {
      issues.push({
        rule: "positive_prompt_disallowed",
        message: `Positive prompt contains disallowed pattern`,
        severity: "error",
        detail: `"${match[0]}"`,
      });
    }
  }

  return issues;
}

function checkConstraints(spec: ImagePromptSpec): ImagePromptSpecIssue[] {
  const issues: ImagePromptSpecIssue[] = [];

  const required: (keyof typeof spec.constraints)[] = [
    "no_text",
    "no_logos",
    "no_faces",
    "no_figures",
    "no_symbols",
    "no_astrology",
    "avoid_busy_textures",
  ];

  for (const key of required) {
    const val = spec.constraints[key];
    if (val !== true) {
      issues.push({
        rule: "constraints",
        message: `${key} should be true`,
        severity: "error",
      });
    }
  }

  return issues;
}

export function validateImagePromptSpec(
  spec: ImagePromptSpec
): ImagePromptSpecValidationResult {
  const issues: ImagePromptSpecIssue[] = [];

  issues.push(...checkConstraints(spec));
  issues.push(...checkNegativeHasExclusions(spec.prompt.negative));
  issues.push(...checkPositiveNoDisallowed(spec.prompt.positive));

  const uniqueByRule = new Map<string, ImagePromptSpecIssue[]>();
  for (const issue of issues) {
    const key = `${issue.rule}:${issue.message}`;
    if (!uniqueByRule.has(key)) uniqueByRule.set(key, []);
    uniqueByRule.get(key)!.push(issue);
  }
  const deduped = Array.from(uniqueByRule.values()).map((arr) => arr[0]);

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
