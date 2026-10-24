import type { AppData, AppMode, ReminderPrefs } from "@/types";

export const APP_NAME = "رسا";
export const APP_NAME_LATIN = "RASA";
export const APP_TAGLINE = "همراه مسیر پایدار بهبود";

export function defaultReminderPrefs(): ReminderPrefs {
  return {
    medication: false, // enabled when a profile with times exists
    medicationTimes: [],
    checkin: true,
    checkinTime: "20:00",
    logReview: true,
    logReviewTime: "21:30",
    reviewLeadDays: 3,
    muted: false,
  };
}

export function createEmptyAppData(mode: AppMode, now = new Date()): AppData {
  const iso = now.toISOString();
  return {
    schemaVersion: 1,
    mode,
    profile: {
      displayName: null,
      personalGoal: null,
      jurisdiction: "ir",
      emergencyContacts: [],
      onboardedAt: null,
      isDemo: mode === "demo",
      createdAt: iso,
      updatedAt: iso,
    },
    medicationProfile: null,
    treatmentPlans: [],
    planEvents: [],
    medicationLogs: [],
    symptomLogs: [],
    reminders: defaultReminderPrefs(),
    safetyEvents: [],
    auditLogs: [],
  };
}
