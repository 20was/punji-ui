/** Exact decimal strings → integer minor units. Reject rather than silently round. */
export function parseMinorUnits(value: string, scale = 2): bigint {
  if (!Number.isInteger(scale) || scale < 0 || scale > 9) throw new RangeError('scale must be 0–9');
  if (value.length > 100 || !/^-?\d+(?:\.\d+)?$/.test(value)) throw new TypeError('Expected an ungrouped decimal string');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  if (fraction.length > scale) throw new RangeError('Too many decimal places');
  const magnitude = BigInt(whole!) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
  return value.startsWith('-') ? -magnitude : magnitude;
}
export function minorUnitsToDecimal(value: bigint, scale = 2): string {
  if (!Number.isInteger(scale) || scale < 0 || scale > 9) throw new RangeError('scale must be 0–9');
  const digits = (value < 0n ? -value : value).toString().padStart(scale + 1, '0');
  return `${value < 0n ? '-' : ''}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}
/** No implicit FX conversion, tax rates, fee rules or floating point accounting. */
export function sumMinorUnits(values: readonly bigint[]): bigint { return values.reduce((sum, value) => sum + value, 0n); }
