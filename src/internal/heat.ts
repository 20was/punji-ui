/**
 * The one cell scale the heat tables share (MonthGrid, ReturnsHeatTable): a return is a direction (gain, loss, flat)
 * and a band 1 to 4 by its size, which sets how much of the gain or loss hue is mixed into the cell. The shade only
 * repeats the signed figure the cell prints; it never carries meaning alone. Not exported from the package.
 */
export type HeatTone = 'gain' | 'loss' | 'flat';
export type HeatBand = 0 | 1 | 2 | 3 | 4;

/** Percent of the hue mixed into a cell, per band. The darkest is 36%, where the body text still passes 4.5:1 (scripts/check-contrast.mjs). */
export const HEAT_STRENGTH: Readonly<Record<HeatBand, number>> = { 0: 0, 1: 10, 2: 18, 3: 27, 4: 36 };

/** The direction and band of a return in percent: under 2 is band 1, 2 to 5 band 2, 5 to 10 band 3, 10 and over band 4. Zero is flat. */
export function heatBand(value: number): { tone: HeatTone; band: HeatBand } {
  // Under 0.05 the figure prints as 0.0%, so it is flat: the shade never disagrees with the text.
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return { tone: 'flat', band: 0 };
  const size = Math.abs(value);
  return { tone: value > 0 ? 'gain' : 'loss', band: size >= 10 ? 4 : size >= 5 ? 3 : size >= 2 ? 2 : 1 };
}

/** "+4.2%", "−4.2%" (a true minus sign) or "0.0%". The sign is part of the figure so colour is never the only cue. */
export function signedPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '';
  const text = Math.abs(value).toFixed(digits);
  const zero = Number(text) === 0;
  return `${value > 0 && !zero ? '+' : value < 0 && !zero ? '−' : ''}${text}%`;
}
