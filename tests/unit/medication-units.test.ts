/**
 * Unit conversions for tablet and liquid records (requirement 11.1, 11.2).
 */
import { describe, expect, it } from "vitest";
import {
  convertTabletsToMg,
  convertVolumeToMg,
  formatAmount,
  formatMg,
  parsePositiveDecimal,
  deviationPercent,
  normalizeNumericInput,
} from "@/lib/medication-units";

describe("parsePositiveDecimal", () => {
  it("accepts plain decimals", () => {
    expect(parsePositiveDecimal("1.5")).toEqual({ ok: true, value: 1.5 });
  });

  it("accepts Persian and Arabic digits", () => {
    expect(parsePositiveDecimal("۳۵٫۵").ok).toBe(true);
    expect(parsePositiveDecimal("٣٫٥").ok).toBe(true);
  });

  it("treats ',' and '٬' as thousands separators", () => {
    expect(parsePositiveDecimal("1,500")).toEqual({ ok: true, value: 1500 });
  });

  it("rejects negatives", () => {
    const r = parsePositiveDecimal("-5");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("negative");
  });

  it("rejects empty and invalid input", () => {
    expect(parsePositiveDecimal("").ok).toBe(false);
    expect(parsePositiveDecimal(null).ok).toBe(false);
    expect(parsePositiveDecimal("abc").ok).toBe(false);
    expect(parsePositiveDecimal("1.2.3").ok).toBe(false);
  });

  it("rejects more than 4 decimal places (ambiguity guard)", () => {
    const r = parsePositiveDecimal("1.12345");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("too-many-decimals");
  });

  it("rejects zero unless explicitly allowed", () => {
    expect(parsePositiveDecimal("0").ok).toBe(false);
    expect(parsePositiveDecimal("0", { allowZero: true }).ok).toBe(true);
  });
});

describe("liquid conversion (mg/mL)", () => {
  it("converts 35 mL at 1 mg/mL to 35 mg", () => {
    const r = convertVolumeToMg("1", "35");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalMg).toBe(35);
  });

  it("handles decimal concentration exactly (0.1+0.2 class of errors)", () => {
    // 5.5 mL × 1.4 mg/mL = 7.7 exactly
    const r = convertVolumeToMg("1.4", "5.5");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalMg).toBe(7.7);
  });

  it("converts Persian-digit inputs", () => {
    const r = convertVolumeToMg("۱٫۵", "۱۰");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalMg).toBe(15);
  });

  it("refuses to convert without an explicit labeled concentration", () => {
    const r = convertVolumeToMg(null as unknown as string, "35");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing-concentration");
  });

  it("refuses negative volumes", () => {
    const r = convertVolumeToMg("1", "-2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("negative");
  });
});

describe("tablet conversion", () => {
  it("converts 1.5 tablets at 5 mg to 7.5 mg", () => {
    const r = convertTabletsToMg("5", "1.5");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalMg).toBe(7.5);
  });

  it("requires labeled strength", () => {
    const r = convertTabletsToMg("", "2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing-concentration");
  });
});

describe("formatting & deviation", () => {
  it("formats amounts with Persian digits and unit", () => {
    expect(formatAmount("35", "mL")).toContain("۳۵");
    expect(formatAmount("35", "mL")).toContain("میلی‌لیتر");
    expect(formatMg(7.5)).toContain("۷٫۵");
  });

  it("computes deviation only when both values exist", () => {
    expect(deviationPercent("35", "38.5")).toBeCloseTo(10, 6);
    expect(deviationPercent(null, "38.5")).toBeNull();
    expect(deviationPercent("35", null)).toBeNull();
  });

  it("normalizes mixed Persian digits", () => {
    expect(normalizeNumericInput("۱٬۲۰۰٫۵")).toBe("1200.5");
  });
});
