/**
 * Versioned clinical-rules module.
 *
 * Everything medical-ish that the app computes lives HERE and only here, so
 * future validated rules can replace this file behind a stable interface.
 *
 * Scope of ruleset 1.0.0 — intentionally minimal and conservative:
 *   ✔ conservative trend/escalation *flags* (informational, non-diagnostic)
 *   ✔ neutral guidance triggers for missed/uncertain/discrepant records
 *   ✘ NO personalized taper generation
 *   ✘ NO automatic dose changes (up or down) from symptom scores
 *   ✘ NO diagnosis from the check-in questionnaire
 *   ✘ NO adjunct medication suggestions
 *
 * Any future autonomous recommendation feature requires: a specified clinical
 * protocol, specialist review, clinical validation, and a regulatory review
 * (medical-device software rules). See docs/clinical-safety-boundaries.md.
 */

export const RULESET_VERSION = "1.0.0";

/** Centralized thresholds so thresholds are never scattered in UI components. */
export const FLAG_THRESHOLDS = {
  /** A single symptom at this level counts as "high". */
  highLevel: 3,
  /** A single symptom at this level is itself a consult trigger. */
  criticalLevel: 4,
  /** How many high domains (in one check-in) trigger a consult flag. */
  minHighDomainsForConsult: 3,
  /** Relative deviation between planned vs recorded amount (percent) that flags a discrepancy. */
  discrepancyPercent: 10,
} as const;

export interface ClinicalFlag {
  id: string;
  severity: "info" | "caution" | "urgent";
  /** Persian, nonjudgmental copy. */
  title: string;
  body: string;
  /** Every flag must state that it is not a diagnosis/dose change. */
  disclaimerRequired: true;
}

export const CLINICAL_DISCLAIMER =
  "این گزارش فقط بر اساس اطلاعاتی است که خودتان ثبت کرده‌اید؛ ابزار تشخیص نیست و به‌جای نظر پزشک یا تغییر خودسرانه دوز نیست.";
