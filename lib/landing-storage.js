/**
 * localStorage helpers for persisting landing form state.
 * Keys: ligs_lastFormData (stores { reportId, formData }).
 * Frontend-only; safe to call from useEffect.
 */

const STORAGE_KEY = "ligs_lastFormData";

export function saveLastFormData(reportId, formData) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      reportId,
      formData: {
        name: formData?.name ?? "",
        birthDate: formData?.birthDate ?? "",
        birthTime: formData?.birthTime ?? "",
        birthLocation: formData?.birthLocation ?? "",
        email: formData?.email ?? "",
        notes: formData?.notes ?? "",
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to save lastFormData to localStorage", e);
  }
}

export function loadLastFormData() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.reportId || !parsed?.formData) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

export function clearLastFormData() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear lastFormData to localStorage", e);
  }
}

/** Beauty pay-first: unlocked = user completed checkout (set from success page). */
const BEAUTY_UNLOCK_KEY = "ligs_beauty_unlocked";

export function setBeautyUnlocked() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEAUTY_UNLOCK_KEY, "1");
  } catch (e) {
    console.warn("Failed to set beauty unlocked", e);
  }
}

export function isBeautyUnlocked() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BEAUTY_UNLOCK_KEY) === "1";
  } catch (e) {
    return false;
  }
}

/** Beauty prepurchase: draft form data saved before Stripe redirect. */
const BEAUTY_DRAFT_KEY = "ligs_beauty_draft";

export function getBeautyDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BEAUTY_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setBeautyDraft(formData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEAUTY_DRAFT_KEY, JSON.stringify(formData ?? {}));
  } catch (e) {
    console.warn("Failed to set beauty draft", e);
  }
}

export function clearBeautyDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BEAUTY_DRAFT_KEY);
  } catch (e) {
    console.warn("Failed to clear beauty draft", e);
  }
}
