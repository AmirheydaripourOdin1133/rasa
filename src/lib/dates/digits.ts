/**
 * Persian digit helpers — display only. Latin digits are converted for
 * rendering; storage always stays in Latin/ISO form.
 */

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
