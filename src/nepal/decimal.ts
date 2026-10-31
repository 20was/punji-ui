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
