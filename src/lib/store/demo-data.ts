/**
 * Synthetic demo data — clearly labeled, deterministic (seeded), and isolated
 * in the demo storage bucket. The sample plan is a DEMO ARTIFACT, not a
 * recommended medical regimen. Never mixed with user-bucket data.
 */

import type {
  AppData,
  DailyMedicationLog,
  DoseEntry,
  DoseStatus,
  MedicationProfile,
  PlanMilestone,
  SymptomLog,
  TreatmentPlan,
} from "@/types";
import { createEmptyAppData, defaultReminderPrefs } from "@/lib/store/empty-data";
import { addDaysIso, todayIso } from "@/lib/dates";

/** Deterministic PRNG (mulberry32) so tests and previews are stable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_SEED = 20261024;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

const DEMO_DAYS = 45;

function buildDemoMedication(formulation: "liquid" | "tablet", now: Date): MedicationProfile {
  const iso = now.toISOString();
  const base = {
    id: "demo-med-1",
    productName: formulation === "liquid" ? "شربت متادون (نمونه نمایشی)" : "قرص متادون (نمونه نمایشی)",
    ingredientName: "متادون",
    formulation,
    tabletStrengthMg: formulation === "tablet" ? "5" : null,
    concentrationMgPerMl: formulation === "liquid" ? "1" : null,
    prescribedDailyAmount: formulation === "liquid" ? "35" : "35",
    administrationsPerDay: 1,
    administrationTimes: ["08:00"],
    regimenStartDate: addDaysIso(todayIso(now), -60),
    durationOfUseMonths: "14",
    infoSource: "clinician-approved" as const,
    lastReviewDate: addDaysIso(todayIso(now), -14),
    nextReviewDate: addDaysIso(todayIso(now), 16),
    otherMedicationsNote: null,
    isDemo: true,
    createdAt: iso,
    updatedAt: iso,
  };
  return base;
}

function buildDemoPlan(formulation: "liquid" | "tablet", now: Date): {
  plan: TreatmentPlan;
  milestoneAmounts: { date: string; amount: number }[];
  effective: string;
} {
  const unit: "mL" | "tablet" = formulation === "liquid" ? "mL" : "tablet";
  const unitLabel = formulation === "liquid" ? "میلی‌لیتر" : "قرص";
  const today = todayIso(now);
  const effective = addDaysIso(today, -28);
  const amounts = [35, 33.5, 32, 30.5, 29];
  const milestones: PlanMilestone[] = amounts.map((a, i) => ({
    id: `demo-ms-${i}`,
    date: addDaysIso(effective, i * 7),
    title: `هفته ${i + 1} — مقدار روزانه ${a} ${unitLabel}`,
    description:
      i === 0
        ? "شروع برنامه (نمونه نمایشی)"
        : i === amounts.length - 1
          ? "آخرین نقطه ثبت‌شده در داده نمایشی — ادامه پس از بررسی درمانگر"
          : "کاهش کوچک ثبت‌شده در داده نمایشی",
    amount: String(a),
    unit,
  }));

  const plan: TreatmentPlan = {
    id: "demo-plan-1",
    version: 2,
    title: "برنامه پایدارسازی و کاهش تدریجی (داده نمایشی)",
    status: "active",
    source: "clinician-approved",
    authorization: "authorized",
    authorizedBy: "دکتر نمونه — کلینیک نمایشی",
    authorizedAt: `${effective}T09:00:00.000Z`,
    effectiveDate: effective,
    nextReviewDate: addDaysIso(today, 16),
    goal: "reduce",
    milestones,
    notes:
      "این برنامه یک نمونه‌ی نمایشی برای آزمودن اپ است و از هیچ دستور پزشکی واقعی ساخته نشده است. ادامه یا تغییر آن فقط با تأیید درمانگر واقعی انجام می‌شود.",
    isDemo: true,
    createdAt: `${effective}T09:00:00.000Z`,
    updatedAt: `${addDaysIso(today, -14)}T09:00:00.000Z`,
  };

  return {
    plan,
    milestoneAmounts: milestones.map((m) => ({
      date: m.date,
      amount: Number(m.amount ?? 0),
    })),
    effective,
  };
}

/** Planned amount on a given date, from the demo plan's milestones only. */
function plannedFor(date: string, milestones: { date: string; amount: number }[]): number {
  let amount = milestones[0]?.amount ?? 35;
  for (const m of milestones) {
    if (date >= m.date) amount = m.amount;
  }
  return amount;
}

export function generateDemoData(
  formulation: "liquid" | "tablet",
  now: Date = new Date(),
): AppData {
  const rand = mulberry32(DEMO_SEED);
  const data = createEmptyAppData("demo", now);
  const today = todayIso(now);

  data.profile = {
    ...data.profile,
    displayName: "کاربر نمایشی",
    personalGoal: "می‌خواهم با آرامش و طبق برنامه درمانگرم مسیرم را پیگیری کنم.",
    emergencyContacts: [
      { id: "demo-ec-1", label: "مرکز مشاوره (نمونه)", phone: "۰۲۱-۰۰۰۰۰۰۰" },
    ],
    onboardedAt: `${addDaysIso(today, -44)}T08:00:00.000Z`,
    isDemo: true,
  };

  data.medicationProfile = buildDemoMedication(formulation, now);

  const { plan, milestoneAmounts, effective } = buildDemoPlan(formulation, now);
  data.treatmentPlans = [plan];
  data.planEvents = [
    {
      id: "demo-pe-1",
      planId: plan.id,
      type: "created",
      fromStatus: null,
      toStatus: "draft",
      summary: "ایجاد برنامه (داده نمایشی)",
      at: `${effective}T08:30:00.000Z`,
    },
    {
      id: "demo-pe-2",
      planId: plan.id,
      type: "authorized",
      fromStatus: "awaiting-review",
      toStatus: "active",
      summary: "تأیید توسط «دکتر نمونه — کلینیک نمایشی» (داده نمایشی)",
      at: `${effective}T09:00:00.000Z`,
    },
    {
      id: "demo-pe-3",
      planId: plan.id,
      type: "updated",
      fromStatus: "active",
      toStatus: "active",
      summary: "به‌روزرسانی نقاط عطف (نسخه ۲ — داده نمایشی)",
      at: `${addDaysIso(today, -14)}T09:00:00.000Z`,
    },
  ];

  const unit: "mL" | "tablet" = formulation === "liquid" ? "mL" : "tablet";
  const unitLabel = unit === "mL" ? "میلی‌لیتر" : "قرص";

  const logs: DailyMedicationLog[] = [];
  const symptoms: SymptomLog[] = [];

  for (let i = DEMO_DAYS - 1; i >= 0; i--) {
    const date = addDaysIso(today, -i);
    const planned = plannedFor(date, milestoneAmounts);
    const createdAt = `${date}T08:05:00.000Z`;

    // Deterministic status mix: ~88% taken, 5% delayed, 4% missed, 3% uncertain
    const r = rand();
    let status: DoseStatus = "taken";
    if (r > 0.97) status = "uncertain";
    else if (r > 0.93) status = "missed";
    else if (r > 0.88) status = "delayed";

    const jitter = status === "taken" ? (rand() - 0.5) * 0.6 : status === "delayed" ? -0.3 : 0;
    const actual = status === "missed" ? null : Math.max(0, planned + jitter);
    const entry: DoseEntry = {
      id: `demo-entry-${date}`,
      slotIndex: 0,
      plannedTime: "08:00",
      plannedAmount: planned.toFixed(1),
      status,
      actualTime:
        status === "taken" ? "08:00" : status === "delayed" ? "10:30" : null,
      actualAmount: actual === null ? null : actual.toFixed(1),
      note:
        status === "uncertain"
          ? "مطمئن نیستم دقیقاً چقدر مصرف شد (داده نمایشی)"
          : null,
      updatedAt: createdAt,
    };
    logs.push({ date, entries: [entry], createdAt, updatedAt: createdAt });

    // Symptom trend: gently improving over time with noise
    const t = (DEMO_DAYS - i) / DEMO_DAYS; // 0 → 1
    const noise = () => Math.round((rand() - 0.5) * 1.2);
    const clamp = (v: number) => Math.max(0, Math.min(4, v));
    const unsure: SymptomLog["unsure"] = rand() > 0.92 ? ["sleepQuality"] : [];
    symptoms.push({
      date,
      sleepQuality: clamp(Math.round(1.5 + t * 2 + noise())),
      anxiety: clamp(Math.round(3 - t * 2 + noise())),
      craving: clamp(Math.round(3.4 - t * 2.6 + noise())),
      gi: clamp(Math.round(1.6 - t * 1.4 + noise())),
      sweatingChills: clamp(Math.round(1.4 - t * 1.1 + noise())),
      achesRestlessness: clamp(Math.round(2 - t * 1.6 + noise())),
      mood: clamp(Math.round(1.8 + t * 1.8 + noise())),
      adherenceDifficulty:
        status === "missed" ? "major" : status === "delayed" ? "minor" : "none",
      unsure,
      other: null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  data.medicationLogs = logs;
  data.symptomLogs = symptoms;
  data.reminders = {
    ...defaultReminderPrefs(),
    medication: true,
    medicationTimes: ["08:00"],
  };
  data.auditLogs = [
    {
      id: "demo-audit-1",
      at: now.toISOString(),
      action: "demo.generated",
      entity: "appData",
      entityId: null,
      summary: `داده نمایشی (${unitLabel}) تولید شد — جدای از داده‌های کاربر واقعی.`,
    },
  ];
  data.safetyEvents = [
    {
      id: "demo-safety-1",
      type: "guidance-shown",
      at: `${addDaysIso(today, -6)}T08:10:00.000Z`,
      detail: "راهنمای دوز ثبت‌نشده برای روز ۶ روز پیش نمایش داده شد (داده نمایشی).",
    },
  ];

  return data;
}
