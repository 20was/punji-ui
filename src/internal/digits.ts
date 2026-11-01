// The one place the kit maps Devanagari digits (०-९) to ASCII and back. Internal: components and pure modules import
// it so each does not carry its own copy. For input in any of the 18 supported scripts use `toAsciiDigits` from
// nepal/decimal.ts; these helpers cover the Nepali case only and stay tiny.
const DEVANAGARI = '०१२३४५६७८९';

/** Devanagari digits to ASCII; every other character unchanged. */
export const fromDevanagari = (text: string): string => text.replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d)));

/** ASCII digits to Devanagari; every other character unchanged. */
export const toDevanagari = (text: string): string => text.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]!);

/** ASCII digits to Devanagari when `digits` is 'deva'; the text unchanged otherwise. */
export const showDigits = (text: string | number, digits: 'latn' | 'deva' = 'latn'): string =>
  digits === 'deva' ? toDevanagari(String(text)) : String(text);
