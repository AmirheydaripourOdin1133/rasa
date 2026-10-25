/**
 * Date helpers — storage is always ISO `yyyy-mm-dd`; display is ALWAYS Jalali
 * (Persian/Shamsi) through `src/lib/dates/jalali.ts`. Pure functions only.
 */

import {
  isIsoDate,
  toJalaliParts,
  jalaliToIso,
  jalaliWeekdayName,
  faJalaliLong,
  faJalaliNumeric,
  faJalaliMonthLabel,
  todayJalali,
  type JalaliParts,
} from "./jalali";
import { toLatinDigits, toFaDigits } from "./digits";

export {
  isIsoDate,
  toJalaliParts,
  jalaliToIso,
  jalaliWeekdayName,
  faJalaliLong,
  faJalaliNumeric,
  faJalaliMonthLabel,
  todayJalali,
  toLatinDigits,
  toFaDigits,
};
export type { JalaliParts };
export * from "./jalali";

/** Local-time ISO date key (no UTC shifting). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayIso(dt);
}

/** b - a, in whole calendar days. */
export function daysBetweenIso(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86_400_000);
}

/**
 * ISO date (or Date) → Persian (Jalali) text, e.g. «۲ آبان ۱۴۰۵».
 * With `withWeekday` → «شنبه، ۲ آبان ۱۴۰۵».
 */
export function faDate(
  iso: string | Date | null | undefined,
  opts: { withWeekday?: boolean } = {},
): string {
  if (iso === null || iso === undefined || iso === "") return "—";
  if (!toJalaliParts(iso)) return "—";
  const dateText = faJalaliLong(iso);
  if (!opts.withWeekday) return dateText;
  const weekday = iso instanceof Date ? jalaliWeekdayName(todayIso(iso)) : jalaliWeekdayName(iso);
  return `${weekday}، ${dateText}`;
}

/** Short numeric Persian date, e.g. «۱۴۰۵/۰۸/۲۴». */
export function faDateShort(iso: string | Date | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "—";
  return faJalaliNumeric(iso);
}

/** `HH:mm` → Persian-friendly display, e.g. «۰۸:۰۰». */
export function faTime(hhmm: string | null | undefined): string {
  if (!hhmm) return "—";
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return hhmm.replace(/\d/g, (c) => faDigits[Number(c)]);
}

/** Month label for chart axes: «آبان ۱۴۰۵» for an ISO date. */
export function faMonthLabel(iso: string): string {
  return faJalaliMonthLabel(iso);
}
