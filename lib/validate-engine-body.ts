const REQUIRED_400_MESSAGE =
  "Missing required fields: fullName, birthDate, birthLocation, email";

export type EngineBody = {
  fullName?: string;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: string;
  email?: string;
  dryRun?: boolean;
  notes?: string;
};

export type ValidatedEngineBody = EngineBody & {
  fullName: string;
  birthDate: string;
  birthLocation: string;
  email: string;
};

export function validateEngineBody(
  body: unknown
): { ok: true; value: ValidatedEngineBody } | { ok: false; error: { message: string } } {
  if (body == null || typeof body !== "object") {
    return { ok: false, error: { message: REQUIRED_400_MESSAGE } };
  }
  const b = body as Record<string, unknown>;
  const fullName = b.fullName;
  const birthDate = b.birthDate;
  const birthLocation = b.birthLocation;
  const email = b.email;
  if (!fullName || !birthDate || !birthLocation || !email) {
    return { ok: false, error: { message: REQUIRED_400_MESSAGE } };
  }
  return { ok: true, value: body as ValidatedEngineBody };
}
