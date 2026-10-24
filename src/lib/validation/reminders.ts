/**
 * Lightweight reminder validation for the UI layer (no zod → keeps the
 * client bundle small). The full zod schemas live in `src/lib/validation`
 * and are used at trusted boundaries and in tests.
 */

import type { ReminderPrefs } from "@/types";

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateReminderPrefs(prefs: ReminderPrefs): ValidationResult {
  if (prefs.medication && prefs.medicationTimes.length === 0) {
    return { ok: false, error: "حداقل یک ساعت یادآور دارو لازم است." };
  }
  if (!prefs.medicationTimes.every((t) => HHMM_RE.test(t))) {
    return { ok: false, error: "ساعت یادآور باید به قالب ۲۴ساعته (مثل ۰۸:۳۰) باشد." };
  }
  if (!HHMM_RE.test(prefs.checkinTime)) {
    return { ok: false, error: "ساعت چک‌این معتبر نیست." };
  }
  if (!HHMM_RE.test(prefs.logReviewTime)) {
    return { ok: false, error: "ساعت مرور روز معتبر نیست." };
  }
  if (!Number.isInteger(prefs.reviewLeadDays) || prefs.reviewLeadDays < 0 || prefs.reviewLeadDays > 14) {
    return { ok: false, error: "یادآور مرور برنامه باید عددی بین ۰ تا ۱۴ باشد." };
  }
  return { ok: true };
}
