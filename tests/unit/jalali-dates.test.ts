/**
 * Jalali (Persian/Shamsi) calendar module — conversions, Persian digits and
 * formatting. Storage stays ISO `yyyy-mm-dd`; display is ALWAYS Jalali.
 */
import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  toJalaliParts,
  jalaliToIso,
  jalaliWeekdayName,
  faJalaliLong,
  faJalaliNumeric,
  faJalaliMonthYear,
  faJalaliAxisShort,
  todayJalali,
  todayIso,
  jalaliMonthGrid,
  jalaliDaysInMonth,
  addJalaliDays,
  faDate,
  faDateShort,
  faTime,
  faMonthLabel,
  toLatinDigits,
  toFaDigits,
  JALAALI_MONTHS,
} from "@/lib/dates";

describe("iso date validation", () => {
  it("accepts well-formed ISO dates", () => {
    expect(isIsoDate("2026-10-24")).toBe(true);
  });

  it("rejects malformed or impossible dates", () => {
    expect(isIsoDate("2026/10/24")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("jalali conversions", () => {
  it("converts a known Gregorian date to Jalali parts", () => {
    const parts = toJalaliParts("2026-10-24");
    expect(parts).not.toBeNull();
    // 2026-10-24 Gregorian = 2 Azar 1405 Jalali
    expect(parts?.jy).toBe(1405);
    expect(parts?.jm).toBe(8);
    expect(parts?.jd).toBe(2);
  });

  it("converts Jalali parts back to a valid ISO date (round trip)", () => {
    expect(jalaliToIso(1405, 8, 2)).toBe("2026-10-24");
    expect(jalaliToIso(1404, 12, 29)).toBe("2026-03-20");
  });

  it("returns null for invalid input", () => {
    expect(toJalaliParts("not-a-date")).toBeNull();
    expect(toJalaliParts(null)).toBeNull();
  });
});

describe("jalali helpers", () => {
  it("computes jalali month length (29/30/31)", () => {
    expect(jalaliDaysInMonth(1404, 1)).toBe(31);
    expect(jalaliDaysInMonth(1404, 4)).toBe(31);
    expect(jalaliDaysInMonth(1404, 7)).toBe(30);
  });

  it("returns the jalali weekday name for an ISO date", () => {
    // 2026-10-24 is a Saturday (شنبه)
    expect(jalaliWeekdayName("2026-10-24")).toBe("شنبه");
  });

  it("adds whole days keeping everything Jalali", () => {
    const next = addJalaliDays(1405, 8, 2, 1);
    expect(next).not.toBeNull();
    expect(jalaliToIso(next!.jy, next!.jm, next!.jd)).toBe("2026-10-25");
  });

  it("builds a 7×7 Saturday-first grid for a month", () => {
    const grid = jalaliMonthGrid(1405, 8);
    expect(grid.length).toBe(6);
    const firstInMonth = grid.flat().find((c) => c.inMonth);
    expect(firstInMonth?.jd).toBe(1);
  });
});

describe("persian formatting", () => {
  it("formats long jalali dates with Persian digits", () => {
    expect(faJalaliLong("2026-10-24")).toBe("۲ آبان ۱۴۰۵");
  });

  it("formats numeric jalali dates", () => {
    expect(faJalaliNumeric("2026-10-24")).toBe("۱۴۰۵/۰۸/۰۲");
  });

  it("formats month labels", () => {
    expect(faJalaliMonthYear(1405, 8)).toBe("آبان ۱۴۰۵");
    expect(faMonthLabel("2026-10-24")).toBe("آبان ۱۴۰۵");
  });

  it("formats short axis labels", () => {
    expect(faJalaliAxisShort("2026-10-24")).toBe("۲ آبان");
  });

  it("formats today with weekday: «شنبه، ۲ آبان ۱۴۰۵»", () => {
    expect(faDate("2026-10-24", { withWeekday: true })).toBe("شنبه، ۲ آبان ۱۴۰۵");
  });

  it("formats without weekday", () => {
    expect(faDate("2026-10-24")).toBe("۲ آبان ۱۴۰۵");
  });

  it("formats time with Persian digits: «۰۸:۰۰»", () => {
    expect(faTime("08:00")).toBe("۰۸:۰۰");
  });

  it("falls back to em-dash for unknown dates", () => {
    expect(faDate("")).toBe("—");
    expect(faDateShort(null)).toBe("—");
  });
});

describe("today", () => {
  it("computes today in Jalali parts and back to ISO", () => {
    const now = new Date();
    const j = todayJalali(now);
    // Jalali year is ~1405 while Gregorian year is 2026 — compare properly
    expect(j.jy).toBeGreaterThan(1300);
    expect(j.jy).toBeLessThan(1500);
    expect(jalaliToIso(j.jy, j.jm, j.jd)).toBe(todayIso(now));
  });
});

describe("digit helpers", () => {
  it("converts latin digits to persian and back", () => {
    expect(toFaDigits("1405")).toBe("۱۴۰۵");
    expect(toFaDigits(7)).toBe("۷");
    expect(toLatinDigits("۱۴۰۵")).toBe("1405");
  });
});

describe("jalali month names", () => {
  it("has 12 month labels starting with فروردین", () => {
    expect(JALAALI_MONTHS[0]).toBe("فروردین");
    expect(JALAALI_MONTHS).toHaveLength(12);
  });
});
