// Digit helpers shared by the lending, deposit and KYC components: typed Devanagari digits to ASCII and back.
const DEVA = '०१२३४५६७८९';

/** Devanagari digits to ASCII; everything else unchanged. */
export const asciiDigits = (text: string): string => text.replace(/[०-९]/g, (d) => String(DEVA.indexOf(d)));

/** ASCII digits to Devanagari when `digits` is 'deva'. */
export const showDigits = (text: string | number, digits: 'latn' | 'deva' = 'latn'): string =>
  digits === 'deva' ? String(text).replace(/\d/g, (d) => DEVA[Number(d)]!) : String(text);

/** A whole number from typed text (ASCII or Devanagari digits only), or null. */
export const wholeNumber = (text: string): number | null => {
  const ascii = asciiDigits(text.trim());
  return /^\d{1,6}$/.test(ascii) ? Number(ascii) : null;
};

/** An exact major-unit decimal string to minor units, or null when it is not a plain non-negative decimal within the exponent. */
export const minorOf = (value: string, exponent: number): bigint | null => {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole = '0', fraction = ''] = value.split('.');
  if (fraction.length > exponent) return null;
  return BigInt(whole + fraction.padEnd(exponent, '0'));
};

/** Whether `rate` is a plain percent string within 0 and `max` (exact decimal comparison). */
export const rateWithin = (rate: string, max: string, compare: (a: string, b: string) => number): boolean =>
  /^\d{1,3}(?:\.\d{1,6})?$/.test(rate) && compare(rate, max) <= 0;
