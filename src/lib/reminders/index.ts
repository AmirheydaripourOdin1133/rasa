/**
 * Reminder computation — pure logic. Delivery (Notification API) is handled in
 * components; this module only decides WHAT is due and WHAT text may appear
 * outside the app (lock screen must not reveal medication/addiction info).
 */

import type { ReminderPrefs, TreatmentPlan } from "@/types";
import { daysBetweenIso } from "@/lib/dates";

export type ReminderType = "medication" | "checkin" | "log-review" | "plan-review";

export interface ReminderOccurrence {
  id: string;
  type: ReminderType;
  /** `HH:mm` */
  time: string;
  /** Neutral label for in-app lists. */
  label: string;
}

export const NEUTRAL_NOTIFICATION_TITLE = "یادآور همراه درمان";

/**
 * Lock-screen-safe copy: no medication names, no treatment terms.
 * Details stay inside the app.
 */
export function notificationCopy(type: ReminderType): { title: string; body: string } {
  switch (type) {
    case "medication":
      return {
        title: NEUTRAL_NOTIFICATION_TITLE,
        body: "یادداشت امروز شما آماده ثبت است.",
      };
    case "checkin":
      return {
        title: NEUTRAL_NOTIFICATION_TITLE,
        body: "دقیقه‌ای برای ثبت حال امروز وقت دارید؟",
      };
    case "log-review":
      return {
        title: NEUTRAL_NOTIFICATION_TITLE,
        body: "مرور امروز ثبت‌های شما در انتظار است.",
      };
    case "plan-review":
      return {
        title: NEUTRAL_NOTIFICATION_TITLE,
        body: "یادآور برنامه‌ریزی پیش رو.",
      };
  }
}

function enabledFor(prefs: ReminderPrefs, type: ReminderType): boolean {
  if (prefs.muted) return false;
  switch (type) {
    case "medication":
      return prefs.medication;
    case "checkin":
      return prefs.checkin;
    case "log-review":
      return prefs.logReview;
    case "plan-review":
      return prefs.reviewLeadDays >= 0;
  }
}

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  medication: "ثبت دارو",
  checkin: "ثبت حال امروز",
  "log-review": "مرور روز",
  "plan-review": "مرور برنامه درمان",
};

/** All occurrences scheduled for `today` (ISO). */
export function buildDayOccurrences(
  prefs: ReminderPrefs,
  plan: Pick<TreatmentPlan, "nextReviewDate"> | null,
  today: string,
): ReminderOccurrence[] {
  const out: ReminderOccurrence[] = [];
  if (enabledFor(prefs, "medication")) {
    for (const [i, t] of prefs.medicationTimes.entries()) {
      out.push({
        id: `med-${i}-${t}`,
        type: "medication",
        time: t,
        label: REMINDER_TYPE_LABELS.medication,
      });
    }
  }
  if (enabledFor(prefs, "checkin")) {
    out.push({
      id: "checkin",
      type: "checkin",
      time: prefs.checkinTime,
      label: REMINDER_TYPE_LABELS.checkin,
    });
  }
  if (enabledFor(prefs, "log-review")) {
    out.push({
      id: "log-review",
      type: "log-review",
      time: prefs.logReviewTime,
      label: REMINDER_TYPE_LABELS["log-review"],
    });
  }
  if (plan?.nextReviewDate && enabledFor(prefs, "plan-review")) {
    const diff = daysBetweenIso(today, plan.nextReviewDate);
    if (diff >= 0 && diff <= prefs.reviewLeadDays) {
      out.push({
        id: "plan-review",
        type: "plan-review",
        time: prefs.checkinTime,
        label: `${REMINDER_TYPE_LABELS["plan-review"]} (${diff} روز مانده)`,
      });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

/** The next occurrence at/after `nowHhmm`; wraps to «فردا» via `tomorrow` flag. */
export function nextOccurrence(
  prefs: ReminderPrefs,
  plan: Pick<TreatmentPlan, "nextReviewDate"> | null,
  today: string,
  nowHhmm: string,
): { occurrence: ReminderOccurrence; tomorrow: boolean } | null {
  const all = buildDayOccurrences(prefs, plan, today);
  if (all.length === 0) return null;
  const upcoming = all.find((o) => o.time >= nowHhmm);
  if (upcoming) return { occurrence: upcoming, tomorrow: false };
  return { occurrence: all[0]!, tomorrow: true };
}
