/**
 * Currency-generic exact money formatting and parsing. Amounts are integer minor
 * units (bigint) and never pass through Number: the integer and fraction are
 * split with bigint, the surrounding sign, symbol and spacing come from
 * Intl.NumberFormat#formatToParts so they follow the locale. The currency
 * exponent (JPY 0, USD 2, KWD 3) is read from Intl, not assumed. Nepal is a
 * preset (`nepalMoneyConfig`), not a special case. No React, no browser globals.
 */
import { divideRounded } from '../calculations/rounding.ts';
import { parseLocalizedDecimal } from '../nepal/decimal.ts';
import { minorUnitsToDecimal, parseMinorUnits } from '../nepal/money.ts';

export type CurrencyDisplay = 'symbol' | 'code' | 'name' | 'narrowSymbol' | 'none';
export type MoneySignDisplay = 'auto' | 'always' | 'exceptZero' | 'negative' | 'never';

export interface MoneyFormatConfig {
  /** ISO 4217 code, for example 'USD', 'JPY', 'NPR'. */
  currency: string;
  /** BCP 47 tag; decides separators, symbol placement and digits. Default 'en'. */
  locale?: string;
  /** How the currency prints. 'none' prints the number only. Default 'symbol'. */
  display?: CurrencyDisplay;
  /** Negative amounts in parentheses where the locale has an accounting style. Default false. */
  accounting?: boolean;
  /** When to print the sign: 'auto' (default), 'always', 'exceptZero', 'negative' or 'never'. */
  signDisplay?: MoneySignDisplay;
  /** Intl numbering system, for example 'deva' for Devanagari digits. Default: the locale's. */
  numberingSystem?: string;
}

export interface MoneyPart { type: string; value: string }

export type MoneyParseResult =
  | { state: 'empty' | 'partial' }
  | { state: 'invalid'; reason: 'syntax' | 'grouping' | 'precision' | 'length' }
  | { state: 'valid'; /** Exact decimal string with exactly `exponent` fraction digits ('12.50', '1200'). */ value: string; minor: bigint };

export interface MoneyCompactUnits { lakh: string; crore: string; arba: string; kharba: string }
export interface MoneyCompactOptions {
  /** Maximum fraction digits of the shortened figure, 0–6. Default 2. */
  fractionDigits?: number;
  /** Lakh/crore words, for locales that group in lakh and crore. Default: Latin (L, Cr) or Devanagari for ne and hi. */
  units?: MoneyCompactUnits;
}

export interface MoneyFormatter {
  readonly currency: string;
  readonly locale: string;
  /** Minor-unit digits of the currency, from Intl. */
  readonly exponent: number;
  readonly decimalSeparator: string;
  readonly groupSeparator: string;
  /** Lakh/crore grouping and compacting (en-IN, ne, hi and other IN/NP locales). */
  readonly southAsian: boolean;
  /** Exact: every digit of the amount, locale placement of sign and currency. */
  format(minor: bigint): string;
  formatToParts(minor: bigint): MoneyPart[];
  /** Exact, but with the full currency name where the symbol is shared ($, ¥, kr) and no accounting parentheses. For screen readers. */
  formatSpoken(minor: bigint): string;
  /** DISPLAY-ROUNDED shortening: lakh/crore for South Asian locales, K/M/B/T otherwise. Never use it for a value that will be stored or summed. Below one lakh (or 1,000) it is exact. */
  formatCompact(minor: bigint, options?: MoneyCompactOptions): string;
  /** Re-group an ASCII decimal being typed ('1234.5', '12.', '-') for live display. Not a validator. */
  formatDecimalInput(canonical: string): string;
  /** Strict inverse of `format` for display 'none': this locale's digits, separators and grouping; Devanagari and Arabic-Indic digits accepted. */
  parse(text: string): MoneyParseResult;
  /** Typed or pasted text to ASCII ('१२,३४५.५' → '12345.5'): digits, decimal mark and minus normalized, group marks dropped. Other characters pass through for the caller to reject. */
  toCanonicalInput(text: string): string;
  /** Minor units → exact ASCII decimal string at this currency's exponent. */
  toDecimal(minor: bigint): string;
}

const exponents = new Map<string, number>();
/** Minor-unit digits of an ISO 4217 currency as Intl knows them: JPY 0, USD 2, KWD 3. */
export function currencyExponent(currency: string): number {
  const code = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new RangeError(`Invalid currency code: ${currency}`);
  let exponent = exponents.get(code);
  if (exponent === undefined) {
    exponent = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
    exponents.set(code, exponent);
  }
  return exponent;
}

const UNAMBIGUOUS_SYMBOLS = new Set(['€', '₹', '₪', '₩', '₫', '₴', '₦', '₺', '₽', '฿', '₸', '₼', '₾', '₭', '₮', '₲', '₡', '₵']);
const FOREIGN_DIGITS: readonly string[] = ['०१२३४५६७८९', '٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹', '０１２３４５６７８９'];
const BIDI_MARKS = /[؜‎‏‪-‮⁦-⁩]/g;
const SPACE_GROUP = /[\s   ]/;
const TIERS = [{ power: 5, key: 'lakh' }, { power: 7, key: 'crore' }, { power: 9, key: 'arba' }, { power: 11, key: 'kharba' }] as const;
const LATIN_UNITS: MoneyCompactUnits = { lakh: 'L', crore: 'Cr', arba: 'Arba', kharba: 'Kharba' };
const DEVANAGARI_UNITS: MoneyCompactUnits = { lakh: 'लाख', crore: 'करोड', arba: 'अर्ब', kharba: 'खर्ब' };

function isSouthAsian(locale: string): boolean {
  const tag = new Intl.Locale(locale);
  const region = tag.region ?? tag.maximize().region;
  return tag.language === 'ne' || tag.language === 'hi' || region === 'IN' || region === 'NP';
}

const join = (parts: MoneyPart[]) => parts.map(part => part.value).join('');
function pow10(n: number): bigint { return 10n ** BigInt(n); }

/** Creates a formatter. Intl instances are built once here; reuse it for a table's rows. See `getMoneyFormatter` for a cached lookup. */
export function createMoneyFormatter(config: MoneyFormatConfig): MoneyFormatter {
  const currency = config.currency.toUpperCase();
  const exponent = currencyExponent(currency);
  const locale = config.locale ?? 'en';
  const display = config.display ?? 'symbol';
  const accounting = config.accounting ?? false;
  const signDisplay = config.signDisplay ?? 'auto';
  const system = config.numberingSystem === undefined ? {} : { numberingSystem: config.numberingSystem };
  const southAsian = isSouthAsian(locale);
  const make = (options: Record<string, unknown>) => new Intl.NumberFormat(locale, { ...system, ...options } as Intl.NumberFormatOptions);

  const decimalOptions = { style: 'decimal', minimumFractionDigits: exponent, maximumFractionDigits: exponent };
  const templateOptions = (sign: string, plain: boolean) => plain
    ? { ...decimalOptions, signDisplay: sign }
    : { style: 'currency', currency, currencyDisplay: display, currencySign: accounting ? 'accounting' : 'standard', minimumFractionDigits: exponent, maximumFractionDigits: exponent, signDisplay: sign };
  const template = make(templateOptions(signDisplay, display === 'none'));
  // 'none' has no accounting style in Intl: wrap negatives in parentheses ourselves.
  const wrapNone = display === 'none' && accounting && signDisplay !== 'never';
  const magnitudeTemplate = wrapNone ? make(templateOptions('never', true)) : template;
  const integers = make({ style: 'decimal', maximumFractionDigits: 0 });
  const digitFormat = make({ style: 'decimal', useGrouping: false, maximumFractionDigits: 0 });
  const digits = Array.from({ length: 10 }, (_, d) => digitFormat.format(d));
  const sample = make({ style: 'decimal', minimumFractionDigits: 1 }).formatToParts(1234567.5);
  const decimalSeparator = sample.find(part => part.type === 'decimal')?.value ?? '.';
  const groupSeparator = sample.find(part => part.type === 'group')?.value ?? ',';
  const base = pow10(exponent);
  const localDigits = (ascii: string) => ascii.replace(/\d/g, d => digits[Number(d)]!);

  function assemble(parts: Intl.NumberFormatPart[], integer: string, fraction: string, suffix = ''): MoneyPart[] {
    const out: MoneyPart[] = [];
    let placed = false;
    for (const part of parts) {
      if (part.type === 'integer') {
        if (placed) continue;
        placed = true;
        out.push({ type: 'integer', value: integer });
        if (fraction) out.push({ type: 'decimal', value: decimalSeparator }, { type: 'fraction', value: fraction });
        if (suffix) out.push({ type: 'compact', value: suffix });
      } else if (part.type !== 'group' && part.type !== 'decimal' && part.type !== 'fraction') out.push(part);
    }
    return out;
  }

  // The template is formatted with ±2 so sign, symbol and plural ("2.00 US dollars") come from Intl; the digits are ours.
  function build(minor: bigint, integer: bigint, fractionAscii: string, suffix?: string): MoneyPart[] {
    const negative = minor < 0n;
    const probe = negative ? -2n : minor > 0n ? 2n : 0n;
    const fraction = fractionAscii ? localDigits(fractionAscii) : '';
    const text = integers.format(integer);
    if (wrapNone && negative) return [{ type: 'literal', value: '(' }, ...assemble(magnitudeTemplate.formatToParts(2n), text, fraction, suffix), { type: 'literal', value: ')' }];
    return assemble(template.formatToParts(probe), text, fraction, suffix);
  }

  function formatToParts(minor: bigint): MoneyPart[] {
    if (typeof minor !== 'bigint') throw new TypeError('Money is bigint minor units');
    const magnitude = minor < 0n ? -minor : minor;
    return build(minor, magnitude / base, exponent ? (magnitude % base).toString().padStart(exponent, '0') : '');
  }
  const format = (minor: bigint) => join(formatToParts(minor));

  let spoken: MoneyFormatter | null = null;
  const symbolOf = () => template.formatToParts(2n).find(part => part.type === 'currency')?.value ?? '';
  function formatSpoken(minor: bigint): string {
    if (spoken === null) {
      const symbol = display === 'symbol' || display === 'narrowSymbol' ? symbolOf() : '';
      const ambiguous = symbol !== '' && symbol !== currency && !UNAMBIGUOUS_SYMBOLS.has(symbol);
      spoken = accounting || ambiguous ? createMoneyFormatter({ ...config, accounting: false, display: ambiguous ? 'name' : display }) : self;
    }
    return spoken === self ? format(minor) : spoken.format(minor);
  }

  let westernCompact: Map<number, Intl.NumberFormat> | null = null;
  function formatCompact(minor: bigint, options: MoneyCompactOptions = {}): string {
    const fd = options.fractionDigits ?? 2;
    if (!Number.isInteger(fd) || fd < 0 || fd > 6) throw new RangeError('fractionDigits must be 0–6');
    const magnitude = minor < 0n ? -minor : minor;
    const major = magnitude / base;
    if (!southAsian) {
      if (major < 1000n) return format(minor);
      const approx = Number(major) + Number(magnitude % base) / Number(base);
      if (!Number.isFinite(approx)) return format(minor);
      westernCompact ??= new Map();
      let formatter = westernCompact.get(fd);
      if (!formatter) {
        const shared = { notation: 'compact', compactDisplay: 'short', minimumFractionDigits: 0, maximumFractionDigits: fd, signDisplay };
        formatter = make(display === 'none' ? { style: 'decimal', ...shared } : { style: 'currency', currency, currencyDisplay: display, currencySign: accounting ? 'accounting' : 'standard', ...shared });
        westernCompact.set(fd, formatter);
      }
      return formatter.format(minor < 0n ? -approx : approx);
    }
    if (major < 100000n) return format(minor);
    const units = options.units ?? (/^(?:ne|hi)\b/.test(locale) ? DEVANAGARI_UNITS : LATIN_UNITS);
    let tier = 0;
    while (tier < TIERS.length - 1 && major >= pow10(TIERS[tier + 1]!.power)) tier++;
    const scale = pow10(fd);
    let mantissa = divideRounded(magnitude * scale, pow10(exponent + TIERS[tier]!.power), 'half-up');
    // 99.999 lakh rounds to 100.00 lakh: that is 1 crore.
    if (mantissa >= scale * 100n && tier < TIERS.length - 1) { tier++; mantissa = divideRounded(magnitude * scale, pow10(exponent + TIERS[tier]!.power), 'half-up'); }
    const fraction = fd ? (mantissa % scale).toString().padStart(fd, '0').replace(/0+$/, '') : '';
    return join(build(minor, mantissa / scale, fraction, ` ${units[TIERS[tier]!.key]}`));
  }

  function formatDecimalInput(typed: string): string {
    const match = /^(-?)(\d*)(\.?)(\d*)$/.exec(typed);
    if (!match) return typed;
    const [, sign = '', whole = '', dot = '', fraction = ''] = match;
    const integer = whole === '' && !dot && !fraction ? '' : integers.format(BigInt(whole || '0'));
    return `${sign}${integer}${dot ? decimalSeparator : ''}${localDigits(fraction)}`;
  }

  const digitMap = new Map<string, string>();
  for (const set of FOREIGN_DIGITS) [...set].forEach((ch, d) => digitMap.set(ch, String(d)));
  digits.forEach((ch, d) => digitMap.set(ch, String(d)));
  const spaceGroup = SPACE_GROUP.test(groupSeparator);
  const apostropheGroup = groupSeparator === '’' || groupSeparator === "'";

  // Digits of any supported script to ASCII, this locale's decimal mark to '.', its group marks to `group`, U+2212 to '-'. Anything else passes through.
  function canonical(source: string, group: string): string {
    let out = '';
    for (const ch of source.replace(BIDI_MARKS, '')) {
      const digit = digitMap.get(ch);
      if (digit !== undefined) out += digit;
      else if (ch === decimalSeparator) out += '.';
      else if (ch === groupSeparator || (spaceGroup && SPACE_GROUP.test(ch)) || (apostropheGroup && (ch === '’' || ch === "'"))) out += group;
      else out += ch === '−' ? '-' : ch;
    }
    return out;
  }

  function parse(text: string): MoneyParseResult {
    if (text.length > 100) return { state: 'invalid', reason: 'length' };
    let source = text.replace(BIDI_MARKS, '').trim();
    let negative = false;
    if (accounting && source.startsWith('(') && source.endsWith(')')) { negative = true; source = source.slice(1, -1).trim(); }
    let normalized = canonical(source, ',');
    if (negative) normalized = `-${normalized}`;
    const result = parseLocalizedDecimal(normalized, { maxFractionDigits: exponent, grouping: southAsian ? 'south-asian' : 'western' });
    if (result.state !== 'valid') return result;
    const minor = parseMinorUnits(result.value, exponent);
    return { state: 'valid', value: minorUnitsToDecimal(minor, exponent), minor };
  }

  const self: MoneyFormatter = Object.freeze({
    currency, locale, exponent, decimalSeparator, groupSeparator, southAsian,
    format, formatToParts, formatSpoken, formatCompact, formatDecimalInput, parse,
    toCanonicalInput: (text: string) => canonical(text, ''),
    toDecimal: (minor: bigint) => minorUnitsToDecimal(minor, exponent),
  });
  return self;
}

const cache = new Map<string, MoneyFormatter>();
/** Cached `createMoneyFormatter` (at most 64 configurations; the cache empties when full). Safe to call per render. */
export function getMoneyFormatter(config: MoneyFormatConfig): MoneyFormatter {
  const key = [config.currency, config.locale, config.display, config.accounting, config.signDisplay, config.numberingSystem].join('|');
  let formatter = cache.get(key);
  if (!formatter) {
    if (cache.size >= 64) cache.clear();
    formatter = createMoneyFormatter(config);
    cache.set(key, formatter);
  }
  return formatter;
}

/** One-off exact formatting of minor units. For many rows, call `createMoneyFormatter` once. */
export function formatMoney(minor: bigint, config: MoneyFormatConfig): string {
  return getMoneyFormatter(config).format(minor);
}

/** DISPLAY-ROUNDED (lakh/crore or K/M/B/T). Not for storage or arithmetic; see `MoneyFormatter#formatCompact`. */
export function formatCompactMoney(minor: bigint, config: MoneyFormatConfig, options?: MoneyCompactOptions): string {
  return getMoneyFormatter(config).formatCompact(minor, options);
}

/** Exact parse of text typed or formatted in the config's locale (currency text and symbols are not accepted). */
export function parseMoney(text: string, config: MoneyFormatConfig): MoneyParseResult {
  return getMoneyFormatter(config).parse(text);
}

/** Nepal defaults: NPR, lakh/crore grouping, Latin digits. Spread into any config, or use `nepalMoneyConfig` for Nepali. */
export const nepalMoneyPreset: Readonly<MoneyFormatConfig> = Object.freeze({ currency: 'NPR', locale: 'en-IN', display: 'code' });

/** Nepal preset by language: 'en' prints "NPR 12,34,567.89"; 'ne' prints रू with Nepali grouping. `digits: 'deva'` opts into Devanagari digits. */
export function nepalMoneyConfig(options: { language?: 'en' | 'ne'; digits?: 'latn' | 'deva'; accounting?: boolean } = {}): MoneyFormatConfig {
  const ne = options.language === 'ne';
  return {
    currency: 'NPR',
    locale: ne ? 'ne-NP' : 'en-IN',
    display: ne ? 'narrowSymbol' : 'code',
    numberingSystem: options.digits ?? 'latn',
    ...(options.accounting ? { accounting: true } : {}),
  };
}
