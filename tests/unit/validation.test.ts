/**
 * Validation schemas (zod) — trusted-boundary behavior.
 */
import { describe, expect, it } from "vitest";
import {
  medicationProfileSchema,
  treatmentPlanSchema,
  reminderPrefsSchema,
} from "@/lib/validation";
import { generateDemoData } from "@/lib/store/demo-data";

describe("medicationProfileSchema", () => {
  it("accepts a valid liquid profile", () => {
    const demo = generateDemoData("liquid");
    const res = medicationProfileSchema.safeParse(demo.medicationProfile);
    expect(res.success).toBe(true);
  });

  it("requires tablet strength for tablet formulation", () => {
    const demo = generateDemoData("tablet");
    const res = medicationProfileSchema.safeParse({
      ...demo.medicationProfile,
      tabletStrengthMg: null,
    });
    expect(res.success).toBe(false);
  });

  it("requires concentration for liquid formulation", () => {
    const demo = generateDemoData("liquid");
    const res = medicationProfileSchema.safeParse({
      ...demo.medicationProfile,
      concentrationMgPerMl: null,
    });
    expect(res.success).toBe(false);
  });

  it("rejects negative amounts via decimal rules", () => {
    const demo = generateDemoData("liquid");
    const res = medicationProfileSchema.safeParse({
      ...demo.medicationProfile,
      prescribedDailyAmount: "-5",
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid time format", () => {
    const demo = generateDemoData("liquid");
    const res = medicationProfileSchema.safeParse({
      ...demo.medicationProfile,
      administrationTimes: ["25:00"],
    });
    expect(res.success).toBe(false);
  });
});

describe("treatmentPlanSchema", () => {
  it("accepts the demo plan", () => {
    const demo = generateDemoData("liquid");
    expect(treatmentPlanSchema.safeParse(demo.treatmentPlans[0]).success).toBe(true);
  });

  it("requires authorizedBy when authorization is authorized", () => {
    const demo = generateDemoData("liquid");
    const plan = { ...demo.treatmentPlans[0]!, authorizedBy: null };
    const res = treatmentPlanSchema.safeParse(plan);
    expect(res.success).toBe(false);
  });
});

describe("reminderPrefsSchema", () => {
  it("requires at least one medication time when medication reminders are on", () => {
    const res = reminderPrefsSchema.safeParse({
      medication: true,
      medicationTimes: [],
      checkin: true,
      checkinTime: "20:00",
      logReview: false,
      logReviewTime: "21:30",
      reviewLeadDays: 3,
      muted: false,
    });
    expect(res.success).toBe(false);
  });

  it("accepts valid prefs", () => {
    const demo = generateDemoData("liquid");
    expect(reminderPrefsSchema.safeParse(demo.reminders).success).toBe(true);
  });
});
