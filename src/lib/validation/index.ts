/**
 * Input validation schemas (zod). Used at every trust boundary — today the
 * UI + local store, tomorrow the server (API routes) with the same schemas.
 * Error messages are Persian so the UI can show them directly.
 */

import { z } from "zod";
import { parsePositiveDecimal, normalizeNumericInput } from "@/lib/medication-units";

export const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Decimal-as-string: strict, no negatives, ≤4 dp, accepts Persian digits. */
export function decimalString(allowZero = false) {
  return z
    .string()
    .transform((v) => normalizeNumericInput(v))
    .refine((v) => parsePositiveDecimal(v, { allowZero }).ok, {
      message: "عدد اعشاری معتبر (بدون منفی و بیش از ۴ رقم اعشار) وارد کنید.",
    });
}

export const optionalDecimal = (allowZero = false) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .refine((v) => v === null || parsePositiveDecimal(v, { allowZero }).ok, {
      message: "عدد اعشاری معتبر وارد کنید.",
    });

export const optionalIsoDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || ISO_DATE_RE.test(v), {
    message: "تاریخ معتبر نیست.",
  });

/** Full ISO timestamp (date + time), e.g. authorization moments. */
export const optionalIsoDateTime = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), {
    message: "زمان معتبر نیست.",
  });

export const hhmm = z.string().refine((v) => HHMM_RE.test(v), {
  message: "ساعت را به قالب ۲۴ساعته (مثل ۰۸:۳۰) وارد کنید.",
});

export const medicationProfileSchema = z
  .object({
    id: z.string().min(1),
    productName: z.string().trim().min(1, "نام دقیق محصول روی بسته را وارد کنید."),
    ingredientName: z.string().trim().min(1, "نام ماده مؤثره را وارد کنید."),
    formulation: z.enum(["tablet", "liquid"], { message: "شکل دارویی را انتخاب کنید." }),
    tabletStrengthMg: optionalDecimal(),
    concentrationMgPerMl: optionalDecimal(),
    prescribedDailyAmount: optionalDecimal(),
    administrationsPerDay: z
      .number()
      .int("تعداد نوبت‌ها باید عدد صحیح باشد.")
      .min(1, "حداقل یک نوبت در روز.")
      .max(6, "حداکثر ۶ نوبت در روز پشتیبانی می‌شود."),
    administrationTimes: z.array(hhmm).min(1),
    regimenStartDate: optionalIsoDate,
    durationOfUseMonths: optionalDecimal(true),
    infoSource: z.enum(["self-reported", "imported-record", "clinician-approved"]),
    lastReviewDate: optionalIsoDate,
    nextReviewDate: optionalIsoDate,
    otherMedicationsNote: z.union([z.string(), z.null()]).optional(),
    isDemo: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((mp, ctx) => {
    if (mp.formulation === "tablet" && !mp.tabletStrengthMg) {
      ctx.addIssue({
        code: "custom",
        path: ["tabletStrengthMg"],
        message: "برای قرص، قدرت روی بسته (mg در هر قرص) الزامی است.",
      });
    }
    if (mp.formulation === "liquid" && !mp.concentrationMgPerMl) {
      ctx.addIssue({
        code: "custom",
        path: ["concentrationMgPerMl"],
        message: "برای شربت، غلظت روی بسته (mg/mL) الزامی است.",
      });
    }
    if (mp.administrationTimes.length !== mp.administrationsPerDay) {
      ctx.addIssue({
        code: "custom",
        path: ["administrationTimes"],
        message: "تعداد ساعت‌های نوبت باید با تعداد نوبت‌ها برابر باشد.",
      });
    }
    if (mp.lastReviewDate && mp.nextReviewDate && mp.nextReviewDate < mp.lastReviewDate) {
      ctx.addIssue({
        code: "custom",
        path: ["nextReviewDate"],
        message: "تاریخ بررسی بعدی نمی‌تواند قبل از آخرین بررسی باشد.",
      });
    }
  });

export const planMilestoneSchema = z.object({
  id: z.string().min(1),
  date: z.string().regex(ISO_DATE_RE, "تاریخ نقطه عطف معتبر نیست."),
  title: z.string().trim().min(1, "عنوان نقطه عطف را وارد کنید."),
  description: z.union([z.string(), z.null()]).optional(),
  amount: optionalDecimal(true),
  unit: z.enum(["tablet", "mL"]).nullable().optional(),
});

export const treatmentPlanSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().min(1),
    title: z.string().trim().min(1, "عنوان برنامه را وارد کنید."),
    status: z.enum([
      "draft",
      "awaiting-review",
      "active",
      "review-required",
      "paused",
      "superseded",
      "completed",
    ]),
    source: z.enum(["clinician-approved", "user-recorded", "imported-record"]),
    authorization: z.enum(["authorized", "unauthorized", "pending"]),
    authorizedBy: z.union([z.string(), z.null()]).optional(),
    authorizedAt: optionalIsoDateTime,
    effectiveDate: optionalIsoDate,
    nextReviewDate: optionalIsoDate,
    goal: z
      .enum(["reduce", "maintain", "stabilize-then-decide", "other"])
      .nullable()
      .optional(),
    milestones: z.array(planMilestoneSchema).default([]),
    notes: z.union([z.string(), z.null()]).optional(),
    isDemo: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((plan, ctx) => {
    if (plan.authorization === "authorized" && !plan.authorizedBy?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["authorizedBy"],
        message: "برای وضعیت تأییدشده، نام/عنوان تأییدکننده را ثبت کنید.",
      });
    }
  });

export const symptomLogSchema = z.object({
  date: z.string().regex(ISO_DATE_RE),
  sleepQuality: z.number().int().min(0).max(4).nullable(),
  anxiety: z.number().int().min(0).max(4).nullable(),
  craving: z.number().int().min(0).max(4).nullable(),
  gi: z.number().int().min(0).max(4).nullable(),
  sweatingChills: z.number().int().min(0).max(4).nullable(),
  achesRestlessness: z.number().int().min(0).max(4).nullable(),
  mood: z.number().int().min(0).max(4).nullable(),
  adherenceDifficulty: z.enum(["none", "minor", "major"]).nullable().optional(),
  unsure: z
    .array(
      z.enum([
        "sleepQuality",
        "anxiety",
        "craving",
        "gi",
        "sweatingChills",
        "achesRestlessness",
        "mood",
      ]),
    )
    .default([]),
  other: z.union([z.string(), z.null()]).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const reminderPrefsSchema = z
  .object({
    medication: z.boolean(),
    medicationTimes: z.array(hhmm),
    checkin: z.boolean(),
    checkinTime: hhmm,
    logReview: z.boolean(),
    logReviewTime: hhmm,
    reviewLeadDays: z.number().int().min(0).max(14),
    muted: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (p.medication && p.medicationTimes.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["medicationTimes"],
        message: "حداقل یک ساعت یادآور دارو لازم است.",
      });
    }
  });

export const emergencyContactSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, "عنوان تماس را وارد کنید."),
  phone: z.string().trim().min(3, "شماره تماس را وارد کنید."),
});

export const profileSchema = z.object({
  displayName: z.union([z.string(), z.null()]).optional(),
  personalGoal: z.union([z.string(), z.null()]).optional(),
  jurisdiction: z.string().default("ir"),
  emergencyContacts: z.array(emergencyContactSchema).default([]),
  onboardedAt: optionalIsoDate,
  isDemo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MedicationProfileInput = z.input<typeof medicationProfileSchema>;
export type TreatmentPlanInput = z.input<typeof treatmentPlanSchema>;
