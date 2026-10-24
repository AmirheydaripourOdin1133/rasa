/**
 * Medication unit handling — PURE functions, no UI, no medical judgement.
 *
 * Safety rules encoded here (and nowhere else):
 *  1. mg, mL, and tablet counts are NEVER conflated. Conversion only happens
 *     with an explicitly supplied labeled strength/concentration.
 *  2. Concentration is never inferred from a product name.
 *  3. Arithmetic uses fixed-point BigInt (4 decimal places) to avoid
 *     floating-point drift such as 0.1 + 0.2 !== 0.3.
 *  4. Negative, empty, ambiguous, or non-finite inputs are rejected with a
 *     typed reason — callers must surface them, not guess.
 *
 * Unit conversion is an informational calculation, NOT a dose recommendation.
 */

export const MAX_DECIMALS = 4;
const SCALE = BigInt(10) ** BigInt(MAX_DECIMALS);
const ZERO = BigInt(0);

export type UnitErrorReason =
  | "empty"
  | "invalid"
  | "negative"
  | "not-finite"
  | "too-many-decimals"
  | "zero-not-allowed"
  | "out-of-range"
  | "missing-concentration";

export type UnitResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: UnitErrorReason; message: string };

export function unitErr<T>(reason: UnitErrorReason, message: string): UnitResult<T> {
  return { ok: false, reason, message };
}

export function unitOk<T>(value: T): UnitResult<T> {
  return { ok: true, value };
}

/** Persian/Arabic digits and separators → plain Latin decimal string. */
export function normalizeNumericInput(input: string): string {
  let s = input.trim();
  s = s
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  // Decimal separator: '.' or '٫'. Thousands separators: ',' or '٬' → strip.
  s = s.replace(/٫/g, ".").replace(/[,٬\s_']/g, "");
  return s;
}

/**
 * Strict decimal parser.
 * Accepts: "1", "1.5", "۰/۵" → 0.5? No — Persian decimal separator '٫' (and '/'),
 * both accepted. Rejects negatives, NaN/Infinity, >4 decimals, scientific notation.
 */
export function parsePositiveDecimal(
  input: string | number | null | undefined,
  opts: { allowZero?: boolean } = {},
): UnitResult<number> {
  if (input === null || input === undefined) return unitErr("empty", "مقدار وارد نشده است.");
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return unitErr("not-finite", "مقدار نامعتبر است.");
    if (input < 0) return unitErr("negative", "مقدار نمی‌تواند منفی باشد.");
    if (input === 0 && !opts.allowZero) return unitErr("zero-not-allowed", "مقدار باید بزرگ‌تر از صفر باشد.");
    return unitOk(input);
  }
  const s = normalizeNumericInput(input);
  if (s === "") return unitErr("empty", "مقدار وارد نشده است.");
  if (/^-/.test(s)) return unitErr("negative", "مقدار نمی‌تواند منفی باشد.");
  if (!/^\d*(\.\d*)?$/.test(s) || s === "." || s === "")
    return unitErr("invalid", "قالب عددی معتبر نیست.");
  const decimals = s.includes(".") ? s.split(".")[1]!.length : 0;
  if (decimals > MAX_DECIMALS)
    return unitErr("too-many-decimals", `حداکثر ${MAX_DECIMALS} رقم اعشار مجاز است.`);
  const value = Number(s);
  if (!Number.isFinite(value)) return unitErr("not-finite", "مقدار نامعتبر است.");
  if (value < 0) return unitErr("negative", "مقدار نمی‌تواند منفی باشد.");
  if (value === 0 && !opts.allowZero)
    return unitErr("zero-not-allowed", "مقدار باید بزرگ‌تر از صفر باشد.");
  return unitOk(value);
}

/** Exact fixed-point representation of a decimal string/number (≤4dp). */
export function toScaled(input: string | number): bigint {
  const res =
    typeof input === "number"
      ? (() => {
          const s = input.toString();
          return /^\d*\.?\d*$/.test(s) ? s : null;
        })()
      : normalizeNumericInput(input);
  if (res === null) throw new Error("non-decimal number passed to toScaled");
  const [intPart = "0", decPart = ""] = res.split(".");
  const padded = (decPart + "0".repeat(MAX_DECIMALS)).slice(0, MAX_DECIMALS);
  const negative = intPart.startsWith("-");
  const digits = `${negative ? intPart.slice(1) : intPart || "0"}${padded}`.replace(/\./g, "");
  const v = BigInt(digits);
  return negative ? -v : v;
}

/** Scaled bigint → trimmed decimal string. */
export function formatScaled(scaled: bigint): string {
  const neg = scaled < ZERO;
  const abs = neg ? -scaled : scaled;
  const intPart = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(MAX_DECIMALS, "0").replace(/0+$/, "");
  const s = frac === "" ? intPart.toString() : `${intPart}.${frac}`;
  return neg ? `-${s}` : s;
}

export function scaledToNumber(scaled: bigint): number {
  return Number(formatScaled(scaled));
}

export interface TabletConversion {
  kind: "tablet";
  tablets: number;
  strengthMgPerTablet: number;
  totalMg: number;
}

/**
 * Convert recorded tablet count to mg using the LABELED strength.
 * Requires both values explicitly — no inference.
 */
export function convertTabletsToMg(
  tabletStrengthMg: string | number,
  tablets: string | number,
): UnitResult<TabletConversion> {
  const strength = parsePositiveDecimal(tabletStrengthMg);
  if (!strength.ok) {
    return unitErr(
      strength.reason === "empty" ? "missing-concentration" : strength.reason,
      "مقدار قدرت قرص (بر اساس بسته) را وارد کنید.",
    );
  }
  const count = parsePositiveDecimal(tablets, { allowZero: true });
  if (!count.ok) return count;
  const totalScaled = (toScaled(strength.value) * toScaled(count.value)) / SCALE;
  return unitOk({
    kind: "tablet",
    tablets: count.value,
    strengthMgPerTablet: strength.value,
    totalMg: scaledToNumber(totalScaled),
  });
}

export interface LiquidConversion {
  kind: "liquid";
  mL: number;
  concentrationMgPerMl: number;
  totalMg: number;
}

/**
 * Convert recorded volume (mL) to mg using the LABELED concentration (mg/mL).
 * The concentration must come from the package — never from the name.
 */
export function convertVolumeToMg(
  concentrationMgPerMl: string | number,
  mL: string | number,
): UnitResult<LiquidConversion> {
  const conc = parsePositiveDecimal(concentrationMgPerMl);
  if (!conc.ok) {
    return unitErr(
      conc.reason === "empty" ? "missing-concentration" : conc.reason,
      "غلظت محصول (mg/mL) را از روی بسته وارد کنید.",
    );
  }
  const vol = parsePositiveDecimal(mL, { allowZero: true });
  if (!vol.ok) return vol;
  const totalScaled = (toScaled(conc.value) * toScaled(vol.value)) / SCALE;
  return unitOk({
    kind: "liquid",
    mL: vol.value,
    concentrationMgPerMl: conc.value,
    totalMg: scaledToNumber(totalScaled),
  });
}

/** Human display of an amount with its recording unit (Persian digits). */
export function formatAmount(
  amount: string | number | null | undefined,
  unit: "tablet" | "mL",
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const res = parsePositiveDecimal(amount, { allowZero: true });
  if (!res.ok) return "—";
  const unitLabel = unit === "tablet" ? "قرص" : "میلی‌لیتر";
  const fa = res.value.toLocaleString("fa-IR", { maximumFractionDigits: MAX_DECIMALS });
  return `${fa} ${unitLabel}`;
}

/** Display mg amount with Persian digits, marked as informational. */
export function formatMg(mg: number): string {
  return `${mg.toLocaleString("fa-IR", { maximumFractionDigits: MAX_DECIMALS })} میلی‌گرم`;
}

/**
 * Relative deviation between planned and actual amounts (same unit).
 * Returns null when either value is missing — missing data is NOT zero.
 */
export function deviationPercent(
  planned: string | null | undefined,
  actual: string | null | undefined,
): number | null {
  if (!planned || !actual) return null;
  const p = parsePositiveDecimal(planned, { allowZero: true });
  const a = parsePositiveDecimal(actual, { allowZero: true });
  if (!p.ok || !a.ok) return null;
  if (p.value === 0) return null;
  return ((a.value - p.value) / p.value) * 100;
}
