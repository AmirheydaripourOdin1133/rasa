/**
 * Treatment-plan status model.
 *
 * CRITICAL SAFETY INVARIANT:
 * The passage of time is NEVER clinical authorization. `deriveDisplayedPlan`
 * may surface a *display* flag (review overdue) but it never mutates the
 * stored plan, never advances milestones, and never changes any dose.
 * Status changes happen only through explicit `transitionPlan` calls that
 * record an audit `PlanEvent`.
 */

import type { PlanStatus, TreatmentPlan } from "@/types";
import { daysBetweenIso } from "@/lib/dates";

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "پیش‌نویس",
  "awaiting-review": "در انتظار بررسی",
  active: "فعال و تأییدشده",
  "review-required": "نیازمند بررسی",
  paused: "متوقف‌شده",
  superseded: "جایگزین‌شده",
  completed: "تکمیل‌شده",
};

export const PLAN_STATUS_TONES: Record<PlanStatus, "neutral" | "info" | "success" | "caution" | "danger"> = {
  draft: "neutral",
  "awaiting-review": "info",
  active: "success",
  "review-required": "caution",
  paused: "neutral",
  superseded: "neutral",
  completed: "info",
};

export const PLAN_SOURCE_LABELS: Record<TreatmentPlan["source"], string> = {
  "clinician-approved": "تأییدشده توسط درمانگر",
  "user-recorded": "ثبت شخصی کاربر",
  "imported-record": "پرونده واردشده",
};

export const AUTHORIZATION_LABELS: Record<TreatmentPlan["authorization"], string> = {
  authorized: "مجاز — تأیید درمانگر ثبت شده است",
  unauthorized: "غیرمجاز — بدون تأیید درمانگر",
  pending: "در انتظار تأیید",
};

/** Explicit, reviewed state machine. Any change here requires a ruleset bump. */
export const ALLOWED_TRANSITIONS: Record<PlanStatus, readonly PlanStatus[]> = {
  draft: ["awaiting-review", "active", "superseded"],
  "awaiting-review": ["draft", "active", "superseded"],
  active: ["review-required", "paused", "superseded", "completed"],
  "review-required": ["active", "paused", "superseded", "completed"],
  paused: ["active", "superseded", "completed"],
  superseded: [],
  completed: ["superseded"],
};

export function canTransition(from: PlanStatus, to: PlanStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export type TransitionResult =
  | { ok: true; nextStatus: PlanStatus }
  | { ok: false; error: string };

/** Pure validation of a requested status change. Caller records the event. */
export function validateTransition(from: PlanStatus, to: PlanStatus): TransitionResult {
  if (from === to) return { ok: false, error: "وضعیت فعلی و مقصد یکسان‌اند." };
  if (!canTransition(from, to)) {
    return {
      ok: false,
      error: `تغییر وضعیت از «${PLAN_STATUS_LABELS[from]}» به «${PLAN_STATUS_LABELS[to]}» مجاز نیست.`,
    };
  }
  return { ok: true, nextStatus: to };
}

export interface PlanFlags {
  /** Overdue review — plan is NOT silently advanced. */
  reviewOverdue: boolean;
  unauthorized: boolean;
  missingReviewDate: boolean;
  missingEffectiveDate: boolean;
  noMilestones: boolean;
}

export interface DisplayedPlan {
  /** Status for display — may differ from stored status (review overdue). */
  status: PlanStatus;
  storedStatus: PlanStatus;
  flags: PlanFlags;
  /** Days until/since next review; negative = overdue. */
  reviewInDays: number | null;
}

export function deriveDisplayedPlan(plan: TreatmentPlan, today: string): DisplayedPlan {
  const flags: PlanFlags = {
    reviewOverdue: false,
    unauthorized: plan.authorization !== "authorized",
    missingReviewDate: plan.nextReviewDate === null,
    missingEffectiveDate: plan.effectiveDate === null,
    noMilestones: plan.milestones.length === 0,
  };

  let displayStatus = plan.status;
  if (
    (plan.status === "active" || plan.status === "review-required") &&
    plan.nextReviewDate !== null
  ) {
    const diff = daysBetweenIso(plan.nextReviewDate, today);
    if (diff > 0) {
      flags.reviewOverdue = true;
      // Display-level only. Stored plan and milestones stay untouched.
      displayStatus = "review-required";
    }
  }

  return {
    status: displayStatus,
    storedStatus: plan.status,
    flags,
    reviewInDays:
      plan.nextReviewDate === null ? null : daysBetweenIso(today, plan.nextReviewDate),
  };
}

/** The operative plan: active first, else most recently updated non-superseded. */
export function currentPlan(plans: TreatmentPlan[]): TreatmentPlan | null {
  const active = plans
    .filter((p) => p.status === "active")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  if (active.length > 0) return active[0] ?? null;
  const others = plans
    .filter((p) => p.status !== "superseded" && p.status !== "completed")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  if (others.length > 0) return others[0] ?? null;
  return null;
}

/** Only an explicitly authorized plan exposes its recorded schedule. */
export type ScheduleResult =
  | { ok: true; milestones: TreatmentPlan["milestones"] }
  | { ok: false; reason: "unauthorized" | "inactive" };

export function getAuthorizedSchedule(plan: TreatmentPlan): ScheduleResult {
  if (plan.authorization !== "authorized") {
    return { ok: false, reason: "unauthorized" };
  }
  if (plan.status !== "active" && plan.status !== "review-required") {
    return { ok: false, reason: "inactive" };
  }
  return { ok: true, milestones: plan.milestones };
}

export function isPlanEditable(plan: TreatmentPlan): boolean {
  return (
    plan.status === "draft" ||
    plan.status === "awaiting-review" ||
    plan.status === "review-required" ||
    plan.status === "paused"
  );
}
