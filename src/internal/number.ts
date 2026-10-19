/**
 * Number formatting the kit's figures share. Hand-written here (not synced):
 * the same behaviour as Punji's own helpers, which the sync checks by hash and
 * refuses to mirror past a change until this file is reviewed.
 *
 * Grouping is South Asian (lakh and crore: 12,34,567.00), the convention
 * Nepali and Indian readers use; the `en-IN` locale produces it. A missing
 * value prints as '-', never 0.
 */

const GROUPING = 'en-IN';
const DASH = '-';
const DECIMAL = new Intl.NumberFormat(GROUPING, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INTEGER = new Intl.NumberFormat(GROUPING, { maximumFractionDigits: 0 });

/* One formatter per decimal count, built once (a new Intl.NumberFormat per call is slow). */
const FIXED = new Map<number, Intl.NumberFormat>();

type Maybe = number | null | undefined;
const isNum = (n: Maybe): n is number => typeof n === 'number' && Number.isFinite(n);

/** Grouped digits, exactly `dp` decimals. `fixed(1234.5, 2)` is `1,234.50`. */
export function fixed(n: number, dp: number): string {
  let f = FIXED.get(dp);
  if (!f) {
    f = new Intl.NumberFormat(GROUPING, { minimumFractionDigits: dp, maximumFractionDigits: dp });
    FIXED.set(dp, f);
  }
  return f.format(n);
}

/** A rupee amount, always two decimals: `Rs 8,42,610.00`. */
export const rs = (n: Maybe): string => (isNum(n) ? `Rs ${DECIMAL.format(n)}` : DASH);

/** A count, rounded and grouped: `12,34,567`. */
export const int = (n: Maybe): string => (isNum(n) ? INTEGER.format(Math.round(n)) : DASH);
