/**
 * Compact rupees for fixed-width figures. Its own module, outside the kit's
 * barrel, so an app that does not draw it does not load it.
 */
import { fixed, int } from '../internal/number.ts';
import { isNum } from '../format/format.ts';

/** The words a compact amount uses, in the reader's language (L, Cr, Arba; लाख, करोड, अर्ब). */
export interface CompactUnits {
  lakh: string;
  crore: string;
  arba: string;
}

/**
 * A rupee amount short enough for a tile: exact below `from` (1 crore by default), then
 * in crore or arba to two places ("Rs 1.24 Cr", "Rs 2.05 Arba"; lakh only when `from` is
 * lower). Returns the exact amount too, for the accessible name and the hover.
 */
export function compactRs(value: number | null | undefined, units: CompactUnits, from = 1e7): { short: string; full: string; compact: boolean } {
  if (!isNum(value)) return { short: '-', full: '-', compact: false };
  const mark = 'Rs';
  const full = `${mark} ${int(value)}`;
  const a = Math.abs(value);
  if (a < from) return { short: full, full, compact: false };
  const sign = value < 0 ? '−' : '';
  const [div, unit] = a >= 1e9 ? [1e9, units.arba] : a >= 1e7 ? [1e7, units.crore] : [1e5, units.lakh];
  return { short: `${sign}${mark} ${fixed(a / div, 2)} ${unit}`, full: full.replace(`${mark} -`, `−${mark} `), compact: true };
}
