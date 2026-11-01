/**
 * Nepal mobile numbers: normalise what was typed or pasted (+977, 00977, spaces, dashes, Devanagari digits), check
 * the shape (ten digits starting with 9) and detect the operator from the three-digit prefix. The prefix table is
 * data: pass your own `operators` when the regulator assigns a new range, without waiting for a release.
 *
 * A valid shape is not a reachable number, and the prefix shows the operator the range was issued to: a number moved
 * with mobile number portability, if Nepal adopts it, keeps its old prefix. Confirm with the operator or your
 * top-up aggregator before you charge.
 */

import { fromDevanagari, showDigits } from '../internal/digits.ts';

export interface MobileOperator {
  /** Stable id for code and analytics ('ntc'). */
  id: string;
  /** Display name ('Nepal Telecom'). */
  name: string;
  /** Short name for a badge ('NTC'). */
  shortName: string;
  /** Three-digit national prefixes ('984'). */
  prefixes: readonly string[];
}

/**
 * Prefixes as published by the operators and the Nepal Telecommunications Authority (checked 2026-11).
 * Nepal Telecom: 984, 985, 986 (GSM), 974, 975 (CDMA), 976 (4G). Ncell: 980, 981, 982, 970. SmartCell: 961, 962, 988.
 */
export const NEPAL_MOBILE_OPERATORS: readonly MobileOperator[] = Object.freeze([
  Object.freeze({ id: 'ntc', name: 'Nepal Telecom', shortName: 'NTC', prefixes: Object.freeze(['984', '985', '986', '974', '975', '976']) }),
  Object.freeze({ id: 'ncell', name: 'Ncell', shortName: 'Ncell', prefixes: Object.freeze(['980', '981', '982', '970']) }),
  Object.freeze({ id: 'smartcell', name: 'SmartCell', shortName: 'SmartCell', prefixes: Object.freeze(['961', '962', '988']) }),
]);

export interface NepalMobileResult {
  /**
   * 'empty': nothing typed. 'partial': digits so far could still become a valid number. 'valid': ten digits and a
   * known prefix. 'invalid': it cannot become valid (see `reason`).
   */
  state: 'empty' | 'partial' | 'valid' | 'invalid';
  /** ASCII national digits typed so far, country code removed ('9841234567'). */
  national: string;
  /** '+9779841234567' when valid, otherwise null. */
  e164: string | null;
  /** Detected from the first three digits, as soon as they are typed. */
  operator: MobileOperator | null;
  /** Why it is invalid: a character that is not a digit, a number not starting with 9, an unknown prefix, too many digits. */
  reason: 'characters' | 'start' | 'prefix' | 'length' | null;
}

export interface NepalMobileOptions {
  /** The prefix table. Default `NEPAL_MOBILE_OPERATORS`. */
  operators?: readonly MobileOperator[];
  /** Accept a 9X number whose prefix is not in the table (operator null). Default false. */
  allowUnknownPrefix?: boolean;
}


/**
 * Typed or pasted text to ASCII national digits: Devanagari digits converted, spaces, dashes, dots and brackets
 * dropped, a leading +977, 00977 or 977 (followed by ten digits) removed, and a leading 0 trunk prefix dropped.
 * Other characters are kept so `parseNepalMobile` can refuse them.
 */
export function normalizeNepalMobile(input: string): string {
  let text = fromDevanagari(input).replace(/[\s\-.() ​-‏]/g, '');
  if (text.startsWith('+977')) text = text.slice(4);
  else if (text.startsWith('00977')) text = text.slice(5);
  else if (/^977\d{10}$/.test(text)) text = text.slice(3);
  if (/^09\d/.test(text)) text = text.slice(1);
  return text;
}

/** The operator whose prefix starts the number (needs at least three digits), or null. */
export function detectNepalOperator(input: string, operators: readonly MobileOperator[] = NEPAL_MOBILE_OPERATORS): MobileOperator | null {
  const prefix = normalizeNepalMobile(input).slice(0, 3);
  if (!/^\d{3}$/.test(prefix)) return null;
  return operators.find((o) => o.prefixes.includes(prefix)) ?? null;
}

/** Normalises and checks a number. Never throws. */
export function parseNepalMobile(input: string, options: NepalMobileOptions = {}): NepalMobileResult {
  const operators = options.operators ?? NEPAL_MOBILE_OPERATORS;
  const national = normalizeNepalMobile(input);
  const result = (state: NepalMobileResult['state'], reason: NepalMobileResult['reason'] = null, operator: MobileOperator | null = null): NepalMobileResult =>
    ({ state, national, e164: state === 'valid' ? `+977${national}` : null, operator, reason });
  if (national === '') return result('empty');
  if (!/^\d+$/.test(national) && national !== '+' && national !== '+9' && national !== '+97') return result('invalid', 'characters');
  if (!/^\d+$/.test(national)) return result('partial');
  if (national[0] !== '9') return result('invalid', 'start');
  // '977…' may be a country code still being typed ('+977' and '00977' are removed once complete).
  if (/^977\d{0,9}$/.test(national) && !operators.some((o) => o.prefixes.includes('977'))) return result('partial');
  const operator = national.length >= 3 ? operators.find((o) => o.prefixes.includes(national.slice(0, 3))) ?? null : null;
  if (national.length >= 3 && !operator && !options.allowUnknownPrefix) return result('invalid', 'prefix');
  if (national.length > 10) return result('invalid', 'length', operator);
  return result(national.length === 10 ? 'valid' : 'partial', null, operator);
}

/** True for a complete number with a known prefix (or any 9X prefix with `allowUnknownPrefix`). */
export function isValidNepalMobile(input: string, options?: NepalMobileOptions): boolean {
  return parseNepalMobile(input, options).state === 'valid';
}

/**
 * Display grouping: '984-1234567' (prefix and subscriber number, as printed in Nepal). Works on partial input
 * ('98412' gives '984-12'). `international` adds '+977 '. `digits: 'deva'` prints Devanagari digits.
 */
export function formatNepalMobile(input: string, options: { separator?: string; international?: boolean; digits?: 'latn' | 'deva' } = {}): string {
  const { separator = '-', international = false, digits = 'latn' } = options;
  const national = normalizeNepalMobile(input).replace(/\D/g, '');
  let text = national.length > 3 ? `${national.slice(0, 3)}${separator}${national.slice(3)}` : national;
  if (international && national) text = `+977 ${text}`;
  return showDigits(text, digits);
}
