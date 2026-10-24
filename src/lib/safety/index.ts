/**
 * Safety signals & guidance — conservative, neutral, nonjudgmental.
 * Uses thresholds ONLY from `src/lib/clinical/rules.ts`.
 * Never suggests a dose change, a catch-up dose, or a taper action.
 */

import type { DailyMedicationLog, SymptomLog } from "@/types";
import { deviationPercent } from "@/lib/medication-units";
import { CLINICAL_DISCLAIMER, FLAG_THRESHOLDS, type ClinicalFlag } from "@/lib/clinical/rules";
import type { ClinicalFlag as ClinicalFlagT } from "@/lib/clinical/rules";

export type { ClinicalFlagT as SafetySignal };

/* ------------------------------ Static copy ------------------------------ */

export function missedDoseGuidance(): ClinicalFlag {
  return {
    id: "missed-dose",
    severity: "caution",
    title: "یک نوبت دارو ثبت نشده است",
    body:
      "برای این نوبت، مصرف ثبت نشده یا ثبت نشدن آن مشخص نیست. دوز بعدی را دوبرابر نکنید. درباره زمان‌بندی دوز جاافتاده، فقط با پزشک یا داروساز خود مشورت کنید.",
    disclaimerRequired: true,
  };
}

export function uncertainDoseGuidance(): ClinicalFlag {
  return {
    id: "uncertain-dose",
    severity: "caution",
    title: "یک نوبت با اطمینان ثبت نشده است",
    body:
      "یکی از نوبت‌ها را «مطمئن نیستم» ثبت کرده‌اید. تا روشن شدن موضوع، چیزی اضافه مصرف نکنید و در نخستین فرصت با درمانگر یا داروساز خود صحبت کنید.",
    disclaimerRequired: true,
  };
}

export function discrepancyGuidance(percent: number): ClinicalFlag {
  const dir = percent > 0 ? "بیشتر" : "کمتر";
  const rounded = Math.abs(Math.round(percent));
  return {
    id: "dose-discrepancy",
    severity: "caution",
    title: "تفاوت میان برنامه و ثبت امروز",
    body: `مقدار ثبت‌شده امروز حدود ${rounded}٪ ${dir} از مقدار ثبت‌شده در برنامه است. این فقط یک تذکر اطلاعاتی است؛ برنامه را بدون هماهنگی با درمانگر تغییر ندهید.`,
    disclaimerRequired: true,
  };
}

export function checkinConsultFlag(highDomains: string[], hasCritical: boolean): ClinicalFlag {
  return {
    id: "symptom-consult",
    severity: "caution",
    title: "نشانگرهای امروز بالاتر از حالت معمول شماست",
    body:
      "در ثبت امروز، چند مورد از نشانه‌ها سطح بالایی داشته‌اند" +
      (hasCritical ? " و دست‌کم یک مورد در بالاترین سطح بوده است." : ".") +
      " این یک هشدار محتاطانه برای پیگیری است: وضعیت خود را با درمانگر یا مراکز درمانی خود در میان بگذارید. هیچ تغییری در دارو بر اساس این امتیاز پیشنهاد نمی‌شود. " +
      (highDomains.length > 0 ? `(موارد سطح بالا: ${highDomains.join("، ")})` : ""),
    disclaimerRequired: true,
  };
}

export const GENERAL_DISCLAIMER = CLINICAL_DISCLAIMER;

/** Static, non-computed emergency red flags (shown on the Safety page). */
export function emergencyCriteria(): string[] {
  return [
    "تنفس به‌طور محسوس کند، سطحی یا سخت است.",
    "نمی‌توان فرد را بیدار کرد یا آگاهی به‌شدت کاهش یافته است.",
    "لب‌ها یا ناخن‌ها آبی/بنفش شده‌اند.",
    "نشانه‌های مسمومیت با مواد افیونی: خواب‌آلودگی شدید، صدای خرخ‌خرش، عضلات شل.",
    "درد قفسه سینه، تشنج، یا بیهوشی.",
  ];
}

export function emergencyCallToAction(): string {
  return "اگر هرکدام از این موارد را می‌بینید فوراً اورژانس (۱۱۵) را خبر کنید. اعلان داخل اپ جایگزین خدمات اورژانس نیست.";
}

/* --------------------------- Computed signals ---------------------------- */

const SYMPTOM_LABELS: Record<string, string> = {
  sleepQuality: "خواب",
  anxiety: "اضطراب",
  craving: "میل شدید به مصرف",
  gi: "نشانه‌های گوارشی",
  sweatingChills: "عرق‌سرد/لرز",
  achesRestlessness: "درد عضلانی/بی‌قراری",
  mood: "خلق",
};

/** Conservative escalation flags from one daily check-in. Non-diagnostic. */
export function evaluateCheckinSignals(log: SymptomLog | null): ClinicalFlag[] {
  if (!log) return [];
  const fields = [
    "anxiety",
    "craving",
    "gi",
    "sweatingChills",
    "achesRestlessness",
  ] as const;
  const highDomains: string[] = [];
  let hasCritical = false;
  for (const f of fields) {
    const v = log[f];
    if (v === null || log.unsure.includes(f)) continue;
    if (v >= FLAG_THRESHOLDS.criticalLevel) hasCritical = true;
    if (v >= FLAG_THRESHOLDS.highLevel) highDomains.push(SYMPTOM_LABELS[f] ?? f);
  }
  const flags: ClinicalFlag[] = [];
  if (hasCritical || highDomains.length >= FLAG_THRESHOLDS.minHighDomainsForConsult) {
    flags.push(checkinConsultFlag(highDomains, hasCritical));
  }
  if (log.adherenceDifficulty === "major") {
    flags.push({
      id: "adherence-difficulty",
      severity: "caution",
      title: "دشواری جدی در مصرف طبق برنامه ثبت شده است",
      body:
        "این ثبت قضاوت درباره شما نیست؛ مشکلات رایج و قابل حل هستند. این موضوع را با تیم درمان در میان بگذارید تا راهکار متناسب با شما پیدا شود.",
      disclaimerRequired: true,
    });
  }
  return flags;
}

/**
 * Signals for one medication day. Missing data is treated as missing — never zero.
 * Compares recorded intake against the *stored* plan values only.
 */
export function evaluateDaySignals(log: DailyMedicationLog | null): ClinicalFlag[] {
  if (!log) return [];
  const flags: ClinicalFlag[] = [];
  const missed = log.entries.filter((e) => e.status === "missed");
  const uncertain = log.entries.filter((e) => e.status === "uncertain");
  if (missed.length > 0) flags.push(missedDoseGuidance());
  if (uncertain.length > 0) flags.push(uncertainDoseGuidance());
  for (const e of log.entries) {
    if (e.status === "taken" && e.plannedAmount && e.actualAmount) {
      const dev = deviationPercent(e.plannedAmount, e.actualAmount);
      if (dev !== null && Math.abs(dev) >= FLAG_THRESHOLDS.discrepancyPercent) {
        flags.push(discrepancyGuidance(dev));
        break; // one discrepancy flag per day is enough
      }
    }
  }
  return flags;
}
