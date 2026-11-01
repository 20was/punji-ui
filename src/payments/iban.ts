/**
 * IBAN checks: per-country length and BBAN shape from the SWIFT IBAN registry, ISO 7064 mod-97 check digits, and the
 * grouped display ("GB82 WEST 1234 5698 7654 32"). Passing means "no typing slip", not "this account exists".
 */
import { check, compactPaymentInput, groupBy, mod97, type PaymentCheck } from './normalize.ts';

/**
 * BBAN structure per country, in the registry's notation without "!": digits (n), uppercase letters (a) and
 * alphanumerics (c), with lengths. The IBAN length is 4 plus the BBAN length. From the SWIFT IBAN registry
 * (checked 2026-11). Pass your own `formats` to add a country before a release.
 */
export const IBAN_FORMATS: Readonly<Record<string, string>> = Object.freeze({
  AD: '4n4n12c', AE: '3n16n', AL: '8n16c', AT: '5n11n', AZ: '4a20c', BA: '3n3n8n2n', BE: '3n7n2n', BG: '4a4n2n8c',
  BH: '4a14c', BI: '5n5n11n2n', BR: '8n5n10n1a1c', BY: '4c4n16c', CH: '5n12c', CR: '4n14n', CY: '3n5n16c', CZ: '4n6n10n',
  DE: '8n10n', DJ: '5n5n11n2n', DK: '4n9n1n', DO: '4c20n', EE: '2n2n11n1n', EG: '4n4n17n', ES: '4n4n1n1n10n', FI: '3n11n',
  FO: '4n9n1n', FR: '5n5n11c2n', GB: '4a6n8n', GE: '2a16n', GI: '4a15c', GL: '4n9n1n', GR: '3n4n16c', GT: '4c20c',
  HR: '7n10n', HU: '3n4n1n15n1n', IE: '4a6n8n', IL: '3n3n13n', IQ: '4a3n12n', IS: '4n2n6n10n', IT: '1a5n5n12c', JO: '4a4n18c',
  KW: '4a22c', KZ: '3n13c', LB: '4n20c', LC: '4a24c', LI: '5n12c', LT: '5n11n', LU: '3n13c', LV: '4a13c', LY: '3n3n15n',
  MC: '5n5n11c2n', MD: '2c18c', ME: '3n13n2n', MK: '3n10c2n', MR: '5n5n11n2n', MT: '4a5n18c', MU: '4a2n2n12n3n3a',
  NL: '4a10n', NO: '4n6n1n', PK: '4a16c', PL: '8n16n', PS: '4a21c', PT: '4n4n11n2n', QA: '4a21c', RO: '4a16c', RS: '3n13n2n',
  RU: '9n5n15c', SA: '2n18c', SC: '4a2n2n16n3a', SD: '2n12n', SE: '3n16n1n', SI: '5n8n2n', SK: '4n6n10n', SM: '1a5n5n12c',
  ST: '8n11n2n', SV: '4a20n', TL: '3n14n2n', TN: '2n3n13n2n', TR: '5n1n16c', UA: '6n19c', VA: '3n15n', VG: '4a16n', XK: '4n10n2n',
});

const CLASS: Record<string, string> = { n: '\\d', a: '[A-Z]', c: '[A-Z0-9]' };

/** The IBAN length for a country from its BBAN structure, or null for a country without IBANs in the table. */
export function ibanLength(country: string, formats: Readonly<Record<string, string>> = IBAN_FORMATS): number | null {
  const spec = formats[country.toUpperCase()];
  if (!spec) return null;
  return 4 + specParts(spec).reduce((sum, part) => sum + part.count, 0);
}

/** A BBAN structure such as '4a14n' as its parts, read in one pass (no regex over caller-supplied text). */
function specParts(spec: string): { count: number; kind: 'n' | 'a' | 'c' }[] {
  const parts: { count: number; kind: 'n' | 'a' | 'c' }[] = [];
  let digits = '';
  for (const char of spec) {
    if (char >= '0' && char <= '9') {
      if (digits.length >= 3) throw new RangeError(`IBAN format part is too long: ${spec}`);
      digits += char;
    } else if ((char === 'n' || char === 'a' || char === 'c') && digits) {
      parts.push({ count: Number(digits), kind: char });
      digits = '';
    } else throw new RangeError(`IBAN format must be parts like 4a or 14n: ${spec}`);
  }
  if (digits) throw new RangeError(`IBAN format ends without a type letter: ${spec}`);
  return parts;
}

function bbanPattern(spec: string): RegExp {
  return new RegExp(`^${specParts(spec).map((part) => `${CLASS[part.kind]}{${part.count}}`).join('')}$`);
}

export interface IbanCheck extends PaymentCheck {
  /** The two-letter country code once typed, else null. */
  country: string | null;
  /** The full length for that country, else null. */
  length: number | null;
}

export interface IbanOptions {
  /** Country structures. Default `IBAN_FORMATS`. */
  formats?: Readonly<Record<string, string>>;
  /** Accept only these countries (for example SEPA members, or the corridors you pay into). */
  countries?: readonly string[];
}

/** "GB82WEST12345698765432" to "GB82 WEST 1234 5698 7654 32". Works on partial input; does not validate. */
export function formatIbanGroups(value: string): string {
  return groupBy(compactPaymentInput(value).text, [4]);
}

/**
 * Check a typed or pasted IBAN: spaces, dashes, a leading "IBAN" and invisible characters are dropped, any script's
 * digits are read, and letters are uppercased. Never throws.
 */
export function parseIban(input: string, options: IbanOptions = {}): IbanCheck {
  const formats = options.formats ?? IBAN_FORMATS;
  const { text, cleaned } = compactPaymentInput(input);
  const value = text.replace(/^IBAN(?=[A-Z]{2}\d)/, '');
  const display = groupBy(value, [4]);
  const country = /^[A-Z]{2}/.test(value) ? value.slice(0, 2) : null;
  const length = country ? ibanLength(country, formats) : null;
  const done = (state: IbanCheck['state'], reason: IbanCheck['reason'] = null): IbanCheck => ({ ...check(state, value, display, reason, cleaned), country, length });
  if (value === '') return done('empty');
  if (!/^[A-Z0-9]+$/.test(value)) return done('invalid', 'characters');
  if (!/^[A-Z]{0,2}$/.test(value.slice(0, 2)) || (value.length > 2 && !/^\d{1,2}$/.test(value.slice(2, 4)))) return done('invalid', 'format');
  if (!country) return done('partial');
  if (length === null || (options.countries && !options.countries.map((c) => c.toUpperCase()).includes(country))) return done('invalid', 'country');
  if (value.length < length) return done('partial');
  if (value.length > length) return done('invalid', 'length');
  if (!bbanPattern(formats[country]!).test(value.slice(4))) return done('invalid', 'format');
  const rearranged = value.slice(4) + value.slice(0, 4);
  return mod97(rearranged) === 1 ? done('valid') : done('invalid', 'checksum');
}

/** Compute the two check digits for a country code and BBAN ("GB", "WEST12345698765432" gives "82"). */
export function ibanCheckDigits(country: string, bban: string): string {
  const remainder = mod97(`${compactPaymentInput(bban).text}${country.toUpperCase()}00`);
  return String(98 - remainder).padStart(2, '0');
}
