/**
 * Date helpers — storage is always ISO `yyyy-mm-dd`; display is Persian (Jalali).
 * Pure functions only; no DOM access.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === undefined
    ? !Number.isNaN(d.getTime())
    : !Number.isNaN(d.getTime());
}

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

/** ISO date (or Date) → Persian calendar text, e.g. «۲۴ آبان ۱۴۰۵». */
export function faDate(
  iso: string | Date | null | undefined,
  opts: { withWeekday?: boolean } = {},
): string {
  if (iso === null || iso === undefined || iso === "") return "—";
  const d = iso instanceof Date ? iso : new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    const fmt = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dateText = fmt.format(d);
    // Compose manually: Intl merges weekday into the wrong position/order
    // (e.g. «۱۴۰۵ آبان ۲, شنبه»), so we format it separately and join.
    if (opts.withWeekday) {
      const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(d);
      return `${weekday}، ${dateText}`;
    }
    return dateText;
  } catch {
    return iso.toString();
  }
}

/** Short numeric Persian date, e.g. «۱۴۰۵/۰۸/۲۴». */
export function faDateShort(iso: string | Date | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "—";
  const d = iso instanceof Date ? iso : new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR-u-nu-fa", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return iso.toString();
  }
}

/** `HH:mm` → Persian-friendly display, e.g. «۰۸:۰۰». */
export function faTime(hhmm: string | null | undefined): string {
  if (!hhmm) return "—";
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return hhmm.replace(/\d/g, (c) => faDigits[Number(c)]);
}

/** Month label for chart axes: «آبان ۱۴۰۵» for an ISO date. */
export function faMonthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("fa-IR", { month: "long", year: "numeric" }).format(d);
  } catch {
    return iso;
  }
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Latin/Persian/Arabic digits to Latin digits. */
export function toLatinDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) {
      out += String(fa);
      continue;
    }
    const ar = AR_DIGITS.indexOf(ch);
    if (ar >= 0) {
      out += String(ar);
      continue;
    }
    out += ch;
  }
  return out;
}

/** Convert Latin digits to Persian digits (display only). */
export function toFaDigits(input: string | number): string {
  const s = String(input);
  return s.replace(/\d/g, (c) => FA_DIGITS[Number(c)]);
}
