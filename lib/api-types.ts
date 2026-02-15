import type { VectorZero } from "@/lib/vector-zero";

/** Same input as LIGS engine. */
export type EveBody = {
  fullName?: string;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  email?: string;
};

export type EngineResponse = {
  status?: string;
  error?: string;
  data?: {
    reportId?: string;
    emotional_snippet?: string;
    image_prompts?: string[];
    vector_zero?: VectorZero;
  };
};

export type ReportResponse = {
  full_report?: string;
  emotional_snippet?: string;
  image_prompts?: string[];
  vector_zero?: VectorZero;
};
