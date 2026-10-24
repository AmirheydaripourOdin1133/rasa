/**
 * Safety signals: missed/uncertain guidance, discrepancy flags, check-in
 * escalation, and emergency criteria (requirements 11.14, 11.15).
 */
import { describe, expect, it } from "vitest";
import {
  evaluateCheckinSignals,
  evaluateDaySignals,
  emergencyCriteria,
  emergencyCallToAction,
  missedDoseGuidance,
  uncertainDoseGuidance,
} from "@/lib/safety";
import type { DailyMedicationLog, DoseEntry, SymptomLog } from "@/types";

function entry(partial: Partial<DoseEntry>): DoseEntry {
  return {
    id: "e1",
    slotIndex: 0,
    plannedTime: "08:00",
    plannedAmount: "35",
    status: "taken",
    actualTime: "08:00",
    actualAmount: "35",
    note: null,
    updatedAt: "2026-10-24T08:00:00.000Z",
    ...partial,
  };
}

describe("missed & uncertain dose behavior", () => {
  it("flags missed dose with neutral guidance (no catch-up dose advice)", () => {
    const g = missedDoseGuidance();
    expect(g.severity).toBe("caution");
    expect(g.body).toContain("دوبرابر نکنید");
    expect(g.disclaimerRequired).toBe(true);
  });

  it("flags uncertain dose and forbids extra intake", () => {
    const g = uncertainDoseGuidance();
    expect(g.body).toContain("اضافه مصرف نکنید");
  });

  it("day signals include missed guidance", () => {
    const log: DailyMedicationLog = {
      date: "2026-10-24",
      entries: [entry({ status: "missed", actualAmount: null, actualTime: null })],
      createdAt: "",
      updatedAt: "",
    };
    const signals = evaluateDaySignals(log);
    expect(signals.some((s) => s.id === "missed-dose")).toBe(true);
  });

  it("day signals include uncertain guidance", () => {
    const log: DailyMedicationLog = {
      date: "2026-10-24",
      entries: [entry({ status: "uncertain" })],
      createdAt: "",
      updatedAt: "",
    };
    expect(evaluateDaySignals(log).some((s) => s.id === "uncertain-dose")).toBe(true);
  });

  it("flags >=10% discrepancy between plan and recorded amount", () => {
    const log: DailyMedicationLog = {
      date: "2026-10-24",
      entries: [entry({ actualAmount: "20" })], // 35 → 20 ≈ -43%
      createdAt: "",
      updatedAt: "",
    };
    expect(evaluateDaySignals(log).some((s) => s.id === "dose-discrepancy")).toBe(true);
  });

  it("small deviation does not flag", () => {
    const log: DailyMedicationLog = {
      date: "2026-10-24",
      entries: [entry({ actualAmount: "35.2" })],
      createdAt: "",
      updatedAt: "",
    };
    expect(evaluateDaySignals(log)).toHaveLength(0);
  });

  it("treats missing data as missing — no flags, no zeros", () => {
    expect(evaluateDaySignals(null)).toHaveLength(0);
  });
});

describe("check-in escalation (conservative, non-diagnostic)", () => {
  function symptom(partial: Partial<SymptomLog>): SymptomLog {
    return {
      date: "2026-10-24",
      sleepQuality: 3,
      anxiety: 1,
      craving: 1,
      gi: 0,
      sweatingChills: 0,
      achesRestlessness: 0,
      mood: 3,
      adherenceDifficulty: "none",
      unsure: [],
      other: null,
      createdAt: "",
      updatedAt: "",
      ...partial,
    };
  }

  it("no flag for mild values", () => {
    expect(evaluateCheckinSignals(symptom({}))).toHaveLength(0);
  });

  it("flags a single critical (4) domain", () => {
    const flags = evaluateCheckinSignals(symptom({ craving: 4 }));
    expect(flags.some((f) => f.id === "symptom-consult")).toBe(true);
  });

  it("flags 3+ high domains", () => {
    const flags = evaluateCheckinSignals(
      symptom({ anxiety: 3, craving: 3, gi: 3 }),
    );
    expect(flags.some((f) => f.id === "symptom-consult")).toBe(true);
  });

  it("ignores domains marked unsure", () => {
    const flags = evaluateCheckinSignals(
      symptom({ anxiety: 3, craving: 3, gi: 3, unsure: ["anxiety", "craving", "gi"] }),
    );
    expect(flags.some((f) => f.id === "symptom-consult")).toBe(false);
  });

  it("flags major adherence difficulty with nonjudgmental copy", () => {
    const flags = evaluateCheckinSignals(symptom({ adherenceDifficulty: "major" }));
    const f = flags.find((x) => x.id === "adherence-difficulty");
    expect(f).toBeTruthy();
    expect(f!.body).toContain("قضاوت");
  });

  it("never suggests a dose change in any flag copy", () => {
    const all = [
      ...evaluateCheckinSignals(symptom({ anxiety: 4, craving: 4, gi: 4, adherenceDifficulty: "major" })),
      missedDoseGuidance(),
      uncertainDoseGuidance(),
    ];
    for (const f of all) {
      expect(f.body).not.toMatch(/دوز را (کم|زیاد) کن|کاهش بده|افزایش بده/);
    }
  });
});

describe("emergency states", () => {
  it("lists breathing/unconsciousness red flags and 115 call-to-action", () => {
    const criteria = emergencyCriteria().join(" ");
    expect(criteria).toContain("تنفس");
    expect(criteria).toContain("بیدار");
    expect(emergencyCallToAction()).toContain("۱۱۵");
    expect(emergencyCallToAction()).toContain("جایگزین");
  });
});
