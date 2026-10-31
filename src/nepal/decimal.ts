/** Strict input normalization; never passes monetary text through Number. */
export type DecimalParseResult =
  | { state: 'empty' | 'partial' }
  | { state: 'invalid'; reason: 'syntax' | 'grouping' | 'precision' | 'length' }
  | { state: 'valid'; value: string };
export function parseLocalizedDecimal(input: string, options: { maxFractionDigits?: number; grouping?: 'south-asian' | 'western' | 'none' } = {}): DecimalParseResult {
  const max = options.maxFractionDigits ?? 2;
  if (!Number.isInteger(max) || max < 0 || max > 9) throw new RangeError('maxFractionDigits must be 0–9');
  if (input.length > 100) return { state: 'invalid', reason: 'length' };
  const text = input.trim().replace(/[०-९]/g, digit => String('०१२३४५६७८९'.indexOf(digit)));
  if (!text) return { state: 'empty' };
  if (['-', '.', '-.'].includes(text)) return { state: 'partial' };
  if (!/^-?[\d,]*(?:\.\d*)?$/.test(text)) return { state: 'invalid', reason: 'syntax' };
  const negative = text.startsWith('-');
  const [integer = '', fraction] = text.replace(/^-/, '').split('.');
  if (integer.includes(',')) {
    const grouping = options.grouping ?? 'south-asian';
    const pattern = grouping === 'south-asian' ?  /^(?:\d{1,3},\d{3}|\d{1,2}(?:,\d{2})+,\d{3})$/ : /^\d{1,3}(?:,\d{3})+$/;
    if (grouping === 'none' || !pattern.test(integer)) return { state: 'invalid', reason: 'grouping' };
  }
  if (fraction !== undefined && fraction.length > max) return { state: 'invalid', reason: 'precision' };
  if (fraction === '') return { state: 'partial' };
  const whole = integer.replaceAll(',', '').replace(/^0+(?=\d)/, '') || '0';
  const zero = /^0+$/.test(whole) && (fraction === undefined || /^0+$/.test(fraction));
  return { state: 'valid', value: `${negative && !zero ? '-' : ''}${whole}${fraction === undefined ? '' : `.${fraction}`}` };
}

const CANONICAL = /^(-?)(\d+)(?:\.(\d+))?$/;
function scaled(value: string, scale: number): bigint {
  const match = CANONICAL.exec(value);
  if (!match) throw new RangeError(`Not a plain decimal string: ${value}`);
  const [, sign = '', whole = '0', fraction = ''] = match;
  const n = BigInt(whole + fraction.padEnd(scale, '0'));
  return sign ? -n : n;
}
const digitsAfterPoint = (value: string) => value.split('.')[1]?.length ?? 0;
/** Exact comparison of two plain decimal strings ('12.50', '-3'); never uses Number. Throws on anything else. */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  const scale = Math.max(digitsAfterPoint(a), digitsAfterPoint(b));
  const x = scaled(a, scale), y = scaled(b, scale);
  return x < y ? -1 : x > y ? 1 : 0;
}
export interface StepDecimalOptions {
  /** Inclusive lower bound, a plain decimal string. */
  min?: string | undefined;
  /** Inclusive upper bound, a plain decimal string. */
  max?: string | undefined;
}
/**
 * One exact step up (+1) or down (-1) from a plain decimal string: '0.1' + '0.2' is '0.3'. An empty value counts as 0.
 * The result keeps as many fraction digits as the value or the step has, is clamped into `min` and `max`, and a
 * negative zero is printed as '0'. Throws on a step that is not positive or on text that is not a plain decimal.
 */
export function stepDecimal(value: string, step: string, direction: 1 | -1, options: StepDecimalOptions = {}): string {
  const base = value === '' ? '0' : value;
  const scale = Math.max(digitsAfterPoint(base), digitsAfterPoint(step), digitsAfterPoint(options.min ?? ''), digitsAfterPoint(options.max ?? ''));
  const delta = scaled(step, scale);
  if (delta <= 0n) throw new RangeError('Step must be a positive decimal');
  let next = scaled(base, scale) + (direction === 1 ? delta : -delta);
  if (options.min !== undefined && next < scaled(options.min, scale)) next = scaled(options.min, scale);
  if (options.max !== undefined && next > scaled(options.max, scale)) next = scaled(options.max, scale);
  const negative = next < 0n;
  const digits = (negative ? -next : next).toString().padStart(scale + 1, '0');
  const text = scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return negative ? `-${text}` : text;
}
