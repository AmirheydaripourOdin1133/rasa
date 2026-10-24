/**
 * Reminder preference behavior (requirement 11.9) + dates.
 */
import { describe, expect, it } from "vitest";
import {
  buildDayOccurrences,
  nextOccurrence,
  notificationCopy,
  NEUTRAL_NOTIFICATION_TITLE,
} from "@/lib/reminders";
import { defaultReminderPrefs } from "@/lib/store/empty-data";
import type { ReminderPrefs } from "@/types";
import { addDaysIso, faDate, toFaDigits, daysBetweenIso, todayIso } from "@/lib/dates";

const prefs = (over: Partial<ReminderPrefs>): ReminderPrefs => ({
  ...defaultReminderPrefs(),
  medication: true,
  medicationTimes: ["08:00", "20:00"],
  ...over,
});

describe("reminder building", () => {
  it("creates one occurrence per medication time plus check-in and log review", () => {
    const occ = buildDayOccurrences(prefs({}), null, "2026-10-24");
    expect(occ.map((o) => o.type)).toContain("medication");
    expect(occ.filter((o) => o.type === "medication")).toHaveLength(2);
    expect(occ.some((o) => o.type === "checkin")).toBe(true);
    expect(occ.some((o) => o.type === "log-review")).toBe(true);
  });

  it("respects disabled medication reminders", () => {
    const occ = buildDayOccurrences(prefs({ medication: false }), null, "2026-10-24");
    expect(occ.some((o) => o.type === "medication")).toBe(false);
  });

  it("master mute silences everything", () => {
    const occ = buildDayOccurrences(prefs({ muted: true }), null, "2026-10-24");
    expect(occ).toHaveLength(0);
  });

  it("plan-review reminder appears only within the lead window", () => {
    const plan = { nextReviewDate: "2026-10-27" };
    const within = buildDayOccurrences(prefs({ reviewLeadDays: 3 }), plan, "2026-10-24");
    expect(within.some((o) => o.type === "plan-review")).toBe(true);

    const outside = buildDayOccurrences(prefs({ reviewLeadDays: 3 }), plan, "2026-10-20");
    expect(outside.some((o) => o.type === "plan-review")).toBe(false);
  });

  it("nextOccurrence picks the upcoming slot or wraps to tomorrow", () => {
    const p = prefs({});
    const morning = nextOccurrence(p, null, "2026-10-24", "07:00");
    expect(morning?.occurrence.time).toBe("08:00");
    expect(morning?.tomorrow).toBe(false);
    const late = nextOccurrence(p, null, "2026-10-24", "23:00");
    expect(late?.tomorrow).toBe(true);
  });
});

describe("lock-screen privacy", () => {
  it("notification copy never mentions medication or addiction terms", () => {
    const types = ["medication", "checkin", "log-review", "plan-review"] as const;
    for (const t of types) {
      const { title, body } = notificationCopy(t);
      expect(title).toBe(NEUTRAL_NOTIFICATION_TITLE);
      expect(body).not.toMatch(/متادون|مصرف|دارو|ترک|اوپیویید/);
    }
  });
});

describe("dates & Persian presentation", () => {
  it("faDate renders a Persian (Jalali) string", () => {
    const s = faDate("2026-10-24");
    expect(s).toMatch(/۱۴۰۵/); // Jalali year
  });
  it("addDaysIso and daysBetweenIso are consistent", () => {
    const a = "2026-10-24";
    const b = addDaysIso(a, 8);
    expect(daysBetweenIso(a, b)).toBe(8);
    expect(daysBetweenIso(b, a)).toBe(-8);
  });
  it("todayIso is a valid ISO key", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("toFaDigits converts Latin digits", () => {
    expect(toFaDigits(123)).toBe("۱۲۳");
  });
});
