/**
 * Plan status transitions, review-overdue behavior, and the hard clinical
 * safety invariants (requirements 11.5–11.8).
 */
import { describe, expect, it } from "vitest";
import {
  canTransition,
  deriveDisplayedPlan,
  getAuthorizedSchedule,
  validateTransition,
  currentPlan,
} from "@/lib/plan/status";
import { generateDemoData } from "@/lib/store/demo-data";
import type { TreatmentPlan } from "@/types";

function planWith(overrides: Partial<TreatmentPlan>): TreatmentPlan {
  const base: TreatmentPlan = {
    id: "p1",
    version: 1,
    title: "برنامه تست",
    status: "active",
    source: "clinician-approved",
    authorization: "authorized",
    authorizedBy: "دکتر تست",
    authorizedAt: "2026-10-01T00:00:00.000Z",
    effectiveDate: "2026-10-01",
    nextReviewDate: "2026-11-01",
    goal: "reduce",
    milestones: [
      { id: "m1", date: "2026-10-01", title: "شروع", description: null, amount: "35", unit: "mL" },
    ],
    notes: null,
    isDemo: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

describe("status transitions", () => {
  it("allows active → review-required and active → paused", () => {
    expect(canTransition("active", "review-required")).toBe(true);
    expect(canTransition("active", "paused")).toBe(true);
  });

  it("rejects superseded → anything (terminal)", () => {
    expect(canTransition("superseded", "active")).toBe(false);
    expect(validateTransition("superseded", "active").ok).toBe(false);
  });

  it("rejects identical status and unknown paths (draft → completed)", () => {
    expect(validateTransition("active", "active").ok).toBe(false);
    expect(validateTransition("draft", "completed").ok).toBe(false);
  });

  it("requires review-required → active to resume", () => {
    expect(canTransition("review-required", "active")).toBe(true);
  });
});

describe("review overdue — display flag only", () => {
  it("flags overdue review WITHOUT changing the stored status or advancing doses", () => {
    const plan = planWith({ nextReviewDate: "2026-10-10" });
    const displayed = deriveDisplayedPlan(plan, "2026-10-24");
    expect(displayed.flags.reviewOverdue).toBe(true);
    expect(displayed.status).toBe("review-required");
    // stored plan untouched
    expect(plan.status).toBe("active");
    expect(plan.milestones[0]!.amount).toBe("35");
  });

  it("keeps active status when review date is in the future", () => {
    const plan = planWith({ nextReviewDate: "2026-11-01" });
    const displayed = deriveDisplayedPlan(plan, "2026-10-24");
    expect(displayed.flags.reviewOverdue).toBe(false);
    expect(displayed.status).toBe("active");
    expect(displayed.reviewInDays).toBe(8);
  });

  it("reports missing review date instead of guessing", () => {
    const plan = planWith({ nextReviewDate: null });
    const displayed = deriveDisplayedPlan(plan, "2026-10-24");
    expect(displayed.flags.missingReviewDate).toBe(true);
    expect(displayed.reviewInDays).toBeNull();
  });
});

describe("no automatic dose change / no taper generation", () => {
  it("schedule comes ONLY from stored authorized milestones", () => {
    const plan = planWith({});
    const s = getAuthorizedSchedule(plan);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.milestones).toHaveLength(1);
  });

  it("refuses schedule for unauthorized plans", () => {
    const plan = planWith({ authorization: "pending" });
    const s = getAuthorizedSchedule(plan);
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.reason).toBe("unauthorized");
  });

  it("refuses schedule for paused plans", () => {
    const plan = planWith({ status: "paused" });
    const s = getAuthorizedSchedule(plan);
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.reason).toBe("inactive");
  });

  it("passing time NEVER mutates milestone amounts (no auto-advance)", () => {
    const plan = planWith({});
    const before = JSON.stringify(plan.milestones);
    deriveDisplayedPlan(plan, "2027-12-31");
    expect(JSON.stringify(plan.milestones)).toBe(before);
  });

  it("demo generator produces only recorded schedules, never computed tapers", () => {
    const demo = generateDemoData("liquid", new Date("2026-10-24T10:00:00Z"));
    const p = demo.treatmentPlans[0]!;
    expect(p.authorization).toBe("authorized");
    expect(p.isDemo).toBe(true);
    // milestones are fixed records
    expect(p.milestones[0]!.amount).toBe("35");
  });
});

describe("currentPlan selection", () => {
  it("prefers active over others; returns null when only superseded exist", () => {
    const superseded = planWith({ id: "old", status: "superseded" });
    const active = planWith({ id: "new", status: "active" });
    expect(currentPlan([superseded, active])?.id).toBe("new");
    expect(currentPlan([superseded])).toBeNull();
  });
});
