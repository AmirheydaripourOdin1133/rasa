/**
 * همراه درمان — core domain types.
 * All dates are ISO `yyyy-mm-dd` strings; times are `HH:mm` (24h, local).
 * Medication amounts are stored as decimal strings to avoid float drift;
 * conversion math lives in `src/lib/medication-units` (fixed-point BigInt).
 */

export type Formulation = "tablet" | "liquid";

/** Unit used for *recording* actual intake. Never mixed with mg silently. */
export type RecordingUnit = "tablet" | "mL";

export type InfoSource = "self-reported" | "imported-record" | "clinician-approved";

export interface MedicationProfile {
  id: string;
  /** Name exactly as printed on the product package. */
  productName: string;
  /** Active ingredient name as printed (e.g. متادون). */
  ingredientName: string;
  formulation: Formulation;
  /** Labeled strength: mg per tablet. Tablet formulation only. */
  tabletStrengthMg: string | null;
  /** Labeled concentration: mg per mL. Liquid formulation only. */
  concentrationMgPerMl: string | null;
  /** Prescribed daily amount, expressed in the recording unit. Patient-reported. */
  prescribedDailyAmount: string | null;
  administrationsPerDay: number;
  /** `HH:mm` entries, length === administrationsPerDay. */
  administrationTimes: string[];
  regimenStartDate: string | null;
  /** Months of continuous use, if the user knows it. Optional. */
  durationOfUseMonths: string | null;
  infoSource: InfoSource;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  /** Free-text, optional; only what the user chooses to record. */
  otherMedicationsNote: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = "taken" | "missed" | "delayed" | "uncertain";

export interface DoseEntry {
  id: string;
  /** Index of the schedule slot this entry belongs to. */
  slotIndex: number;
  plannedTime: string;
  /** Planned amount in recording unit — copied from the plan/prescription for display only. */
  plannedAmount: string | null;
  status: DoseStatus;
  actualTime: string | null;
  /** Actual amount in recording unit. */
  actualAmount: string | null;
  note: string | null;
  updatedAt: string;
}

export interface DailyMedicationLog {
  /** ISO date key. */
  date: string;
  entries: DoseEntry[];
  createdAt: string;
  updatedAt: string;
}

export type PlanStatus =
  | "draft"
  | "awaiting-review"
  | "active"
  | "review-required"
  | "paused"
  | "superseded"
  | "completed";

export type PlanSource = "clinician-approved" | "user-recorded" | "imported-record";

export type AuthorizationStatus = "authorized" | "unauthorized" | "pending";

export type PlanGoal =
  | "reduce"
  | "maintain"
  | "stabilize-then-decide"
  | "other"
  | null;

export interface PlanMilestone {
  id: string;
  /** ISO date supplied with the plan — never computed by the app. */
  date: string;
  title: string;
  description: string | null;
  /** Informational amount in recording unit; may be null. */
  amount: string | null;
  unit: RecordingUnit | null;
}

export interface TreatmentPlan {
  id: string;
  version: number;
  title: string;
  status: PlanStatus;
  source: PlanSource;
  authorization: AuthorizationStatus;
  /** Free-text label only; the MVP does not verify clinician identity. */
  authorizedBy: string | null;
  authorizedAt: string | null;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  goal: PlanGoal;
  milestones: PlanMilestone[];
  notes: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanEvent {
  id: string;
  planId: string;
  type:
    | "created"
    | "updated"
    | "status-changed"
    | "authorized"
    | "review-recorded"
    | "superseded";
  fromStatus: PlanStatus | null;
  toStatus: PlanStatus | null;
  summary: string;
  at: string;
}

/* ------------------------------ Daily check-in ----------------------------- */

export type SymptomKey =
  | "sleepQuality"
  | "anxiety"
  | "craving"
  | "gi"
  | "sweatingChills"
  | "achesRestlessness"
  | "mood";

/** 0–4 scale; direction differs per item and is documented in the UI. */
export interface SymptomLog {
  date: string;
  /** 0 = خیلی بد … 4 = خیلی خوب */
  sleepQuality: number | null;
  /** 0 = هیچ … 4 = خیلی شدید */
  anxiety: number | null;
  /** 0 = هیچ … 4 = خیلی شدید */
  craving: number | null;
  /** 0 = هیچ … 4 = خیلی شدید */
  gi: number | null;
  /** 0 = هیچ … 4 = خیلی شدید */
  sweatingChills: number | null;
  /** 0 = هیچ … 4 = خیلی شدید */
  achesRestlessness: number | null;
  /** 0 = خیلی بد … 4 = خیلی خوب */
  mood: number | null;
  adherenceDifficulty: "none" | "minor" | "major" | null;
  /** Keys the user marked as "مطمئن نیستم". */
  unsure: SymptomKey[];
  other: string | null;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- Reminders -------------------------------- */

export interface ReminderPrefs {
  medication: boolean;
  /** Editable copy of administration times; defaults from profile. */
  medicationTimes: string[];
  checkin: boolean;
  checkinTime: string;
  logReview: boolean;
  logReviewTime: string;
  /** Days before plan review date to remind. */
  reviewLeadDays: number;
  /** Master mute — hides all notification text. */
  muted: boolean;
}

/* ---------------------------------- Safety ---------------------------------- */

export interface SafetyEvent {
  id: string;
  type: "escalation-flag" | "guidance-shown" | "emergency-info-opened";
  at: string;
  detail: string;
}

export interface EmergencyContact {
  id: string;
  label: string;
  phone: string;
}

/* ---------------------------------- Profile --------------------------------- */

export interface Profile {
  /** Optional nickname — no real names or identifiers required. */
  displayName: string | null;
  /** Patient's own goal, free text. Never treated as a clinical instruction. */
  personalGoal: string | null;
  jurisdiction: string;
  emergencyContacts: EmergencyContact[];
  onboardedAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  at: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
}

/* ---------------------------------- Root ----------------------------------- */

export type AppMode = "demo" | "user";

export interface AppData {
  schemaVersion: number;
  mode: AppMode;
  profile: Profile;
  medicationProfile: MedicationProfile | null;
  /** Newest plan first; `currentPlan` helper picks the operative one. */
  treatmentPlans: TreatmentPlan[];
  planEvents: PlanEvent[];
  medicationLogs: DailyMedicationLog[];
  symptomLogs: SymptomLog[];
  reminders: ReminderPrefs;
  safetyEvents: SafetyEvent[];
  auditLogs: AuditLog[];
}
