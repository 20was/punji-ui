/**
 * Payment card number, expiry and security code checks: Luhn, brand detection by IIN (BIN) ranges, per-brand lengths
 * and grouping, and a masked display that shows the last four only. These run on the number in memory; nothing here
 * logs, stores or sends it. Card data belongs in your PCI DSS scope or your payment provider's hosted fields.
 */
import { check, compactPaymentInput, groupBy, luhnValid, type PaymentCheck } from './normalize.ts';

export interface CardBrand {
  /** Stable id ('visa'). */
  id: string;
  /** Display name ('Visa'). */
  name: string;
  /** IIN prefixes and ranges: '4', or '2221-2720' (same number of digits at both ends). */
  prefixes: readonly string[];
  /** Valid lengths of the full number. */
  lengths: readonly number[];
  /** Security code length. */
  cvcLength: 3 | 4;
  /** Group sizes for display, the last repeating: [4] for 4-4-4-4, [4, 6, 5] for Amex. */
  groups: readonly number[];
  /** False for brands that do not use the Luhn check. Default true. */
  luhn?: boolean;
}

/**
 * Brands by IIN range, from the networks' published ranges (checked 2026-11). Where ranges overlap, the longest
 * matching prefix wins; on a tie the earlier entry wins. RuPay shares 65 with Discover and 353/356 with JCB through
 * network agreements, so those numbers report Discover or JCB. Pass your own table for local schemes.
 */
export const CARD_BRANDS: readonly CardBrand[] = Object.freeze(([
  { id: 'visa', name: 'Visa', prefixes: ['4'], lengths: [13, 16, 19], cvcLength: 3, groups: [4] },
  { id: 'mastercard', name: 'Mastercard', prefixes: ['51-55', '2221-2720'], lengths: [16], cvcLength: 3, groups: [4] },
  { id: 'amex', name: 'American Express', prefixes: ['34', '37'], lengths: [15], cvcLength: 4, groups: [4, 6, 5] },
  { id: 'discover', name: 'Discover', prefixes: ['6011', '644-649', '65', '622126-622925'], lengths: [16, 17, 18, 19], cvcLength: 3, groups: [4] },
  { id: 'diners', name: 'Diners Club', prefixes: ['300-305', '36', '38', '39'], lengths: [14, 15, 16, 17, 18, 19], cvcLength: 3, groups: [4, 6, 4] },
  { id: 'jcb', name: 'JCB', prefixes: ['3528-3589'], lengths: [16, 17, 18, 19], cvcLength: 3, groups: [4] },
  { id: 'unionpay', name: 'UnionPay', prefixes: ['62'], lengths: [16, 17, 18, 19], cvcLength: 3, groups: [4], luhn: false },
  { id: 'maestro', name: 'Maestro', prefixes: ['5018', '5020', '5038', '5893', '6304', '6759', '6761-6763'], lengths: [12, 13, 14, 15, 16, 17, 18, 19], cvcLength: 3, groups: [4] },
  { id: 'rupay', name: 'RuPay', prefixes: ['60', '81', '82', '508'], lengths: [16], cvcLength: 3, groups: [4] },
  { id: 'mir', name: 'Mir', prefixes: ['2200-2204'], lengths: [16, 17, 18, 19], cvcLength: 3, groups: [4] },
] satisfies CardBrand[]).map((brand): CardBrand => Object.freeze(brand)));

/** How specific a match is: the prefix length, or -1 when the digits cannot belong to the range. 0 means "could, type more". */
function matchPrefix(digits: string, prefix: string): number {
  const [low, high = low] = prefix.split('-') as [string, string?];
  const size = low.length;
  if (digits.length >= size) {
    const head = Number(digits.slice(0, size));
    return head >= Number(low) && head <= Number(high) ? size : -1;
  }
  // Partial: could a longer number land in the range?
  const pad = size - digits.length;
  const min = Number(digits + '0'.repeat(pad));
  const max = Number(digits + '9'.repeat(pad));
  return max >= Number(low) && min <= Number(high!) ? 0 : -1;
}

/** The brand of a (partial) card number by longest matching IIN prefix, or null. Needs the first digits only. */
export function detectCardBrand(input: string, brands: readonly CardBrand[] = CARD_BRANDS): CardBrand | null {
  const digits = compactPaymentInput(input).text.replace(/\D/g, '');
  if (!digits) return null;
  let best: CardBrand | null = null;
  let score = 0;
  for (const brand of brands) {
    for (const prefix of brand.prefixes) {
      const s = matchPrefix(digits, prefix);
      if (s > score) { best = brand; score = s; }
    }
  }
  return best;
}

/** "4242424242424242" to "4242 4242 4242 4242" with the brand's grouping (Amex 4-6-5). Works on partial input. */
export function formatCardNumber(input: string, brands: readonly CardBrand[] = CARD_BRANDS): string {
  const digits = compactPaymentInput(input).text.replace(/\D/g, '');
  return groupBy(digits, detectCardBrand(digits, brands)?.groups ?? [4]);
}

/** The last four only, behind dots: "•••• 4242". Never more than four digits, and nothing for fewer than eight. */
export function maskCardNumber(input: string, maskChar = '•'): string {
  const digits = compactPaymentInput(input).text.replace(/\D/g, '');
  if (digits.length < 8) return digits ? maskChar.repeat(4) : '';
  return `${maskChar.repeat(4)} ${digits.slice(-4)}`;
}

export interface CardNumberCheck extends PaymentCheck {
  /** The detected brand, as soon as the prefix shows it. */
  brand: CardBrand | null;
}

export interface CardNumberOptions {
  /** The brand table. Default `CARD_BRANDS`. */
  brands?: readonly CardBrand[];
  /** Accept only these brand ids (the networks you take). Others are 'invalid' with reason 'brand'. */
  accept?: readonly string[];
  /** Accept a number that matches no brand, by length 12 to 19 and Luhn. Default false. */
  allowUnknownBrand?: boolean;
}

/** Check a card number. Spaces, dashes and any script's digits are accepted. Never throws, never logs. */
export function parseCardNumber(input: string, options: CardNumberOptions = {}): CardNumberCheck {
  const brands = options.brands ?? CARD_BRANDS;
  const { text, cleaned } = compactPaymentInput(input);
  const brand = detectCardBrand(text, brands);
  const display = groupBy(text, brand?.groups ?? [4]);
  const done = (state: CardNumberCheck['state'], reason: CardNumberCheck['reason'] = null): CardNumberCheck => ({ ...check(state, text, display, reason, cleaned), brand });
  if (text === '') return done('empty');
  if (!/^\d+$/.test(text)) return done('invalid', 'characters');
  if (brand && options.accept && !options.accept.includes(brand.id)) return done('invalid', 'brand');
  if (!brand && text.length >= 6 && !options.allowUnknownBrand) return done('invalid', 'brand');
  const lengths = brand?.lengths ?? [12, 13, 14, 15, 16, 17, 18, 19];
  const max = Math.max(...lengths);
  if (text.length > max) return done('invalid', 'length');
  if (!lengths.includes(text.length)) return done('partial');
  if (brand?.luhn === false || luhnValid(text)) return done('valid');
  // A longer valid length may still be coming (Visa 16 to 19).
  return text.length < max ? done('partial', 'checksum') : done('invalid', 'checksum');
}

export interface CardExpiryCheck extends PaymentCheck {
  /** Month 1 to 12, once known. */
  month: number | null;
  /** Four-digit year, once known. */
  year: number | null;
}

export interface CardExpiryOptions {
  /** Today, for the "expired" test. Default: the current date. Pass it for stable tests and server rendering. */
  today?: { year: number; month: number };
  /** Furthest accepted expiry, in years from today. Default 20. */
  maxYears?: number;
}

/**
 * Check an expiry typed as MM/YY, MMYY, MM/YYYY or M/YY. A card is valid through the end of its expiry month. The
 * value is "MM/YY"; the display is "MM / YY" as printed on the card.
 */
export function parseCardExpiry(input: string, options: CardExpiryOptions = {}): CardExpiryCheck {
  const { text: raw, cleaned } = compactPaymentInput(input, { keepSeparators: true });
  const text = raw.replace(/\s+/g, '');
  const parts = text.split(/[/\-.]/);
  let mm = '';
  let yy = '';
  if (parts.length >= 2) {
    mm = parts[0]!;
    yy = parts.slice(1).join('');
  } else if (/^[2-9]$/.test(text)) {
    mm = `0${text}`;
  } else {
    mm = text.slice(0, 2);
    yy = text.slice(2);
  }
  if (mm.length === 1 && (yy || parts.length >= 2)) mm = `0${mm}`;
  // " / " only once the year has started, so deleting back over it never gets stuck.
  const display = yy ? `${mm} / ${yy}` : mm;
  const month = /^\d{2}$/.test(mm) ? Number(mm) : null;
  const year = /^\d{2}$/.test(yy) ? 2000 + Number(yy) : /^\d{4}$/.test(yy) ? Number(yy) : null;
  const value = month !== null && year !== null ? `${mm}/${String(year).slice(-2)}` : `${mm}${yy ? `/${yy}` : ''}`;
  const done = (state: CardExpiryCheck['state'], reason: CardExpiryCheck['reason'] = null): CardExpiryCheck => ({ ...check(state, value, display, reason, cleaned), month, year });
  if (text === '') return done('empty');
  if (!/^[\d/\-.]+$/.test(text)) return done('invalid', 'characters');
  if (!/^\d{0,2}$/.test(mm) || !/^\d{0,4}$/.test(yy)) return done('invalid', 'format');
  if (month !== null && (month < 1 || month > 12)) return done('invalid', 'month');
  if (mm === '00') return done('invalid', 'month');
  if (month === null || year === null) return done('partial');
  const now = options.today ?? (() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; })();
  const months = (year - now.year) * 12 + (month - now.month);
  if (months < 0) return done('invalid', 'expired');
  if (months > (options.maxYears ?? 20) * 12) return done('invalid', 'too-far');
  return done('valid');
}

/** Check a security code: 3 digits, or 4 for a brand with `cvcLength: 4` (Amex). Without a brand, 3 or 4. */
export function parseCardCvc(input: string, brand?: CardBrand | null): PaymentCheck {
  const { text, cleaned } = compactPaymentInput(input);
  const lengths = brand ? [brand.cvcLength] : [3, 4];
  const done = (state: PaymentCheck['state'], reason: PaymentCheck['reason'] = null) => check(state, text, text, reason, cleaned);
  if (text === '') return done('empty');
  if (!/^\d+$/.test(text)) return done('invalid', 'characters');
  if (text.length > Math.max(...lengths)) return done('invalid', 'length');
  return lengths.includes(text.length) ? done('valid') : done('partial');
}
