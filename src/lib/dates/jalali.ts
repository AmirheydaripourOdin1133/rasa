/**
 * Jalali (Persian / Shamsi) calendar — the single source of truth for every
 * date shown or entered in the app.
 *
 * Storage stays ISO `yyyy-mm-dd` (Gregorian) so data remains portable; every
 * conversion and rendering goes through this module, so the UI is 100% Jalali
 * (no Gregorian pickers, no mixed calendars).
 *
 * Conversion uses `jalaali-js` (Borkowski algorithm, MIT).
 */

import {
  toJalaali,
  toGregorian,
  jalaaliMonthLength,
  isValidJalaaliDate,
  jalaaliToDateObject,
} from "jalaali-js";
import { toFaDigits } from "./digits";

export const JALAALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** Week starts on Saturday — ش ی د س چ پ ج */
export const JALAALI_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

export const JALAALI_WEEKDAYS_FULL = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
] as const;

export interface JalaliParts {
  jy: number;
  jm: number;
  jd: number;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when the string is a well-formed ISO calendar date. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime());
}

/** ISO date (or Date) → Jalali parts, or null when invalid. */
export function toJalaliParts(input: string | Date | null | undefined): JalaliParts | null {
  if (input === null || input === undefined || input === "") return null;
  let gy: number;
  let gm: number;
  let gd: number;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    gy = input.getFullYear();
    gm = input.getMonth() + 1;
    gd = input.getDate();
  } else {
    if (!ISO_DATE_RE.test(input)) return null;
    const [y, m, d] = input.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    gy = y;
    gm = m;
    gd = d;
  }
  try {
    const j = toJalaali(gy, gm, gd);
    return { jy: j.jy, jm: j.jm, jd: j.jd };
  } catch {
    return null;
  }
}

/** Jalali parts → ISO `yyyy-mm-dd`, or null when the date is invalid. */
export function jalaliToIso(jy: number, jm: number, jd: number): string | null {
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  try {
    const g = toGregorian(jy, jm, jd);
    const y = String(g.gy).padStart(4, "0");
    const m = String(g.gm).padStart(2, "0");
    const d = String(g.gd).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

/** Number of days in a Jalali month (29/30/31). */
export function jalaliDaysInMonth(jy: number, jm: number): number {
  try {
    return jalaaliMonthLength(jy, jm);
  } catch {
    return 30;
  }
}

/** Weekday index with Saturday = 0. */
export function jalaliWeekdayIndex(iso: string): number {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 0;
  // JS: 0 = Sunday … 6 = Saturday → shift so Saturday = 0
  return (d.getDay() + 1) % 7;
}

/** «شنبه» for an ISO date. */
export function jalaliWeekdayName(iso: string): string {
  return JALAALI_WEEKDAYS_FULL[jalaliWeekdayIndex(iso)];
}

/** «۱۵ مرداد ۱۴۰۳» — long Jalali date with Persian digits. */
export function faJalaliLong(input: string | Date | null | undefined): string {
  const j = toJalaliParts(input);
  if (!j) return "—";
  return `${toFaDigits(j.jd)} ${JALAALI_MONTHS[j.jm - 1]} ${toFaDigits(j.jy)}`;
}

/** «۱۴۰۳/۰۸/۱۵» — numeric Jalali date with Persian digits. */
export function faJalaliNumeric(input: string | Date | null | undefined): string {
  const j = toJalaliParts(input);
  if (!j) return "—";
  return `${toFaDigits(j.jy)}/${toFaDigits(String(j.jm).padStart(2, "0"))}/${toFaDigits(String(j.jd).padStart(2, "0"))}`;
}

/** «مرداد ۱۴۰۳» — month label (chart axes, pickers). */
export function faJalaliMonthYear(jy: number, jm: number): string {
  return `${JALAALI_MONTHS[jm - 1]} ${toFaDigits(jy)}`;
}

/** Compact axis label: «۲ آبان» (day + month, no year) for chart ticks. */
export function faJalaliAxisShort(input: string | Date | null | undefined): string {
  const j = toJalaliParts(input);
  if (!j) return "—";
  return `${toFaDigits(j.jd)} ${JALAALI_MONTHS[j.jm - 1]}`;
}

/** Month label for an ISO date: «آبان ۱۴۰۵». */
export function faJalaliMonthLabel(input: string | Date | null | undefined): string {
  const j = toJalaliParts(input);
  if (!j) return "—";
  return faJalaliMonthYear(j.jy, j.jm);
}

export interface JalaliDayCell {
  iso: string | null;
  jd: number;
  inMonth: boolean;
}

/**
 * 6×7 grid (Saturday-first) for a Jalali month. Days outside the month are
 * returned with `iso: null` so the calendar keeps a stable shape.
 */
export function jalaliMonthGrid(jy: number, jm: number): JalaliDayCell[][] {
  const days = jalaliDaysInMonth(jy, jm);
  const firstIso = jalaliToIso(jy, jm, 1);
  if (!firstIso) return [];
  const lead = jalaliWeekdayIndex(firstIso); // 0 = Saturday
  const cells: JalaliDayCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ iso: null, jd: 0, inMonth: false });
  for (let d = 1; d <= days; d++) {
    cells.push({ iso: jalaliToIso(jy, jm, d), jd: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, jd: 0, inMonth: false });
  const rows: JalaliDayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** Today in Jalali parts (local time). */
export function todayJalali(now: Date = new Date()): JalaliParts {
  const j = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}

/** Date object for a Jalali day (local midnight) — used by the picker. */
export function jalaliDateObject(jy: number, jm: number, jd: number): Date {
  return jalaaliToDateObject(jy, jm, jd);
}

/** Shift a Jalali date by whole days (keeps everything Jalali). */
export function addJalaliDays(jy: number, jm: number, jd: number, days: number): JalaliParts | null {
  const iso = jalaliToIso(jy, jm, jd);
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const j = toJalaali(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}
