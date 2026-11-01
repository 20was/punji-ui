/**
 * Bank identifiers by scheme: SWIFT/BIC (ISO 9362), India IFSC and UPI VPA, UK sort code and account number, US ABA
 * routing number (with its check digit) and Nepal bank account numbers (per-bank rules you supply). Shape and check
 * digit tests only: none of them knows whether the bank, branch or account exists.
 */
import { check, compactPaymentInput, groupBy, stripInvisible, type PaymentCheck } from './normalize.ts';

/** ISO 3166-1 alpha-2 codes, plus XK (Kosovo, used by SWIFT). */
const COUNTRIES = new Set(
  ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN ' +
  'CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK ' +
  'HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG ' +
  'MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO ' +
  'RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA ' +
  'VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW').split(' '),
);

/** True for an ISO 3166-1 alpha-2 country code (and XK). */
export const isCountryCode = (code: string): boolean => COUNTRIES.has(code.toUpperCase());

export interface BicCheck extends PaymentCheck {
  /** Institution (4 letters), country (2 letters), location (2) and branch (3, 'XXX' for the head office) once typed. */
  parts: { institution: string; country: string; location: string; branch: string | null } | null;
}

/** Check a SWIFT/BIC code: 8 or 11 characters, institution letters, a real country code, location and branch. */
export function parseBic(input: string): BicCheck {
  const { text, cleaned } = compactPaymentInput(input);
  const display = text.length > 8 ? `${text.slice(0, 4)} ${text.slice(4, 6)} ${text.slice(6, 8)} ${text.slice(8)}` : groupBy(text, [4, 2, 2]);
  const parts = text.length === 8 || text.length === 11
    ? { institution: text.slice(0, 4), country: text.slice(4, 6), location: text.slice(6, 8), branch: text.length === 11 ? text.slice(8) : null }
    : null;
  const done = (state: BicCheck['state'], reason: BicCheck['reason'] = null): BicCheck => ({ ...check(state, text, display, reason, cleaned), parts: state === 'valid' ? parts : null });
  if (text === '') return done('empty');
  if (!/^[A-Z0-9]+$/.test(text)) return done('invalid', 'characters');
  if (!/^[A-Z]{0,6}$/.test(text.slice(0, 6))) return done('invalid', 'format');
  if (text.length >= 6 && !isCountryCode(text.slice(4, 6))) return done('invalid', 'country');
  if (text.length > 11) return done('invalid', 'length');
  if (text.length !== 8 && text.length !== 11) return done('partial');
  // Location "0" in the second position marks a test BIC; a "1" there is passive and still valid.
  return done('valid');
}

/** Check an Indian Financial System Code: four bank letters, a zero, then six branch characters (SBIN0001234). */
export function parseIfsc(input: string): PaymentCheck {
  const { text, cleaned } = compactPaymentInput(input);
  const done = (state: PaymentCheck['state'], reason: PaymentCheck['reason'] = null) => check(state, text, text, reason, cleaned);
  if (text === '') return done('empty');
  if (!/^[A-Z0-9]+$/.test(text)) return done('invalid', 'characters');
  if (!/^[A-Z]{0,4}$/.test(text.slice(0, 4)) || (text.length > 4 && text[4] !== '0')) return done('invalid', 'format');
  if (text.length > 11) return done('invalid', 'length');
  return text.length === 11 ? done('valid') : done('partial');
}

export interface UpiCheck extends PaymentCheck {
  /** The part before "@" ("ram.sharma"). */
  handle: string;
  /** The payment service provider's handle after "@" ("okaxis"), lowercase. */
  provider: string;
}

export interface UpiOptions {
  /** Accept only these provider handles (lowercase, without "@"). Default: any well-formed handle. */
  providers?: readonly string[];
}

/**
 * Check a UPI Virtual Payment Address ("name@bank"). Case-insensitive, so the value is lowercase. A pasted
 * "upi://pay?pa=…" link is read for its address. Letters outside ASCII are refused, which also rules out look-alike
 * letters from other scripts.
 */
export function parseUpiVpa(input: string, options: UpiOptions = {}): UpiCheck {
  const stripped = stripInvisible(String(input ?? ''));
  let text = stripped.text.trim();
  const link = /^upi:\/\/pay\?(.*)$/i.exec(text);
  if (link) {
    const pa = link[1]!.split('&').find((pair) => pair.toLowerCase().startsWith('pa='));
    try {
      text = pa ? decodeURIComponent(pa.slice(3)) : '';
    } catch {
      text = pa ? pa.slice(3) : '';
    }
  }
  text = text.replace(/\s+/g, '').toLowerCase();
  const at = text.indexOf('@');
  const handle = at < 0 ? text : text.slice(0, at);
  const provider = at < 0 ? '' : text.slice(at + 1);
  const done = (state: UpiCheck['state'], reason: UpiCheck['reason'] = null): UpiCheck => ({ ...check(state, text, text, reason, stripped.cleaned), handle, provider });
  if (text === '') return done('empty');
  if (!/^[a-z0-9._\-@]+$/.test(text) || text.split('@').length > 2) return done('invalid', 'characters');
  if (handle.length > 256 || (at >= 0 && !/^[a-z0-9][a-z0-9._-]*$/.test(handle))) return done('invalid', 'handle');
  if (at < 0) return done('partial');
  if (handle.length < 2) return done('invalid', 'handle');
  if (provider === '') return done('partial');
  if (!/^[a-z][a-z0-9]{0,63}$/.test(provider)) return done('invalid', 'provider');
  if (options.providers && !options.providers.includes(provider)) return done(options.providers.some((p) => p.startsWith(provider)) ? 'partial' : 'invalid', 'provider');
  return provider.length < 2 ? done('partial') : done('valid');
}

/** Check a UK sort code: six digits, shown as 12-34-56. */
export function parseSortCode(input: string): PaymentCheck {
  const { text, cleaned } = compactPaymentInput(input);
  const done = (state: PaymentCheck['state'], reason: PaymentCheck['reason'] = null) => check(state, text, groupBy(text, [2], '-'), reason, cleaned);
  if (text === '') return done('empty');
  if (!/^\d+$/.test(text)) return done('invalid', 'characters');
  if (text.length > 6) return done('invalid', 'length');
  return text.length === 6 ? done('valid') : done('partial');
}

/**
 * Check a UK account number: eight digits. A few banks issue six or seven; with `padShort` those are padded with
 * leading zeros, as Pay.UK's modulus-checking guidance describes. The sort-code-specific modulus check is not done here
 * (it needs Pay.UK's weight tables): use your provider's or Confirmation of Payee.
 */
export function parseUkAccountNumber(input: string, options: { padShort?: boolean } = {}): PaymentCheck {
  const { text, cleaned } = compactPaymentInput(input);
  const value = options.padShort && /^\d{6,7}$/.test(text) ? text.padStart(8, '0') : text;
  const done = (state: PaymentCheck['state'], reason: PaymentCheck['reason'] = null) => check(state, value, value, reason, cleaned);
  if (text === '') return done('empty');
  if (!/^\d+$/.test(text)) return done('invalid', 'characters');
  if (text.length > 8) return done('invalid', 'length');
  return value.length === 8 ? done('valid') : done('partial');
}

/** The ABA check: 3 × (d1 + d4 + d7) + 7 × (d2 + d5 + d8) + (d3 + d6 + d9) is a multiple of 10. */
export function abaChecksumValid(digits: string): boolean {
  if (!/^\d{9}$/.test(digits)) return false;
  const d = [...digits].map(Number);
  return (3 * (d[0]! + d[3]! + d[6]!) + 7 * (d[1]! + d[4]! + d[7]!) + (d[2]! + d[5]! + d[8]!)) % 10 === 0;
}

/**
 * Check a US ABA routing transit number: nine digits, a Federal Reserve prefix (00 to 12, 21 to 32, 61 to 72 or 80)
 * and the check digit.
 */
export function parseAbaRouting(input: string): PaymentCheck {
  const { text, cleaned } = compactPaymentInput(input);
  const done = (state: PaymentCheck['state'], reason: PaymentCheck['reason'] = null) => check(state, text, text, reason, cleaned);
  if (text === '') return done('empty');
  if (!/^\d+$/.test(text)) return done('invalid', 'characters');
  if (text.length >= 2) {
    const prefix = Number(text.slice(0, 2));
    if (!(prefix <= 12 || (prefix >= 21 && prefix <= 32) || (prefix >= 61 && prefix <= 72) || prefix === 80)) return done('invalid', 'format');
  }
  if (text.length > 9) return done('invalid', 'length');
  if (text.length < 9) return done('partial');
  return abaChecksumValid(text) ? done('valid') : done('invalid', 'checksum');
}

/** One bank's account number rule. Supply your own: banks change formats and this package ships none as fact. */
export interface NepalBankAccountRule {
  /** Stable id ('example-bank'). */
  id: string;
  /** Display name. */
  name: string;
  /** Accepted lengths of the compact account number. */
  lengths: readonly number[];
  /** Characters allowed: 'digits' (default) or 'alphanumeric' (uppercase letters and digits). */
  characters?: 'digits' | 'alphanumeric';
  /** An extra regular expression source the compact value must match ('^0\\d{2}'), for a branch or product prefix. */
  pattern?: string;
  /** Display groups, the last repeating. Default [4]. */
  groups?: readonly number[];
}

/** The rule used when no bank is chosen: 8 to 20 digits, the range seen across Nepali banks. */
export const NEPAL_BANK_ACCOUNT_DEFAULT: NepalBankAccountRule = Object.freeze({
  id: 'any', name: 'Any bank', lengths: Object.freeze([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]), characters: 'digits',
});

export interface NepalBankAccountCheck extends PaymentCheck {
  /** The rule that was applied. */
  rule: NepalBankAccountRule;
}

/**
 * Check a Nepal bank account number against a bank's rule (`NEPAL_BANK_ACCOUNT_DEFAULT` when none is given).
 * Devanagari digits, spaces and dashes are accepted. A valid shape is not an existing account: confirm with the bank
 * (for example a name lookup through your payment switch) before you send money.
 */
export function parseNepalBankAccount(input: string, rule: NepalBankAccountRule = NEPAL_BANK_ACCOUNT_DEFAULT): NepalBankAccountCheck {
  const { text, cleaned } = compactPaymentInput(input);
  const done = (state: NepalBankAccountCheck['state'], reason: NepalBankAccountCheck['reason'] = null): NepalBankAccountCheck =>
    ({ ...check(state, text, groupBy(text, rule.groups ?? [4]), reason, cleaned), rule });
  if (text === '') return done('empty');
  if (!(rule.characters === 'alphanumeric' ? /^[A-Z0-9]+$/ : /^\d+$/).test(text)) return done('invalid', 'characters');
  const max = Math.max(...rule.lengths);
  if (text.length > max) return done('invalid', 'length');
  if (!rule.lengths.includes(text.length)) return done('partial');
  if (rule.pattern && !new RegExp(rule.pattern).test(text)) return done('invalid', 'format');
  return done('valid');
}
