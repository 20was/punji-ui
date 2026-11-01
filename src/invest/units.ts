/**
 * Mutual fund units at a NAV, exactly. A NAV is a decimal string per unit in major units ('10.4567'); amounts are
 * minor units (paisa with exponent 2); units are a bigint scaled by 10^unitDecimals (3 places is the usual statement
 * precision). Allotment rounds units down by default, so the cost of the units never exceeds the money paid, and the
 * remainder is reported instead of disappearing.
 */
import { divideRounded, type RoundingMode } from '../calculations/rounding.ts';

export interface Nav { readonly numerator: bigint; readonly denominator: bigint }

/** Parse a positive NAV per unit ('10.4567'): up to 9 integer and 8 fraction digits. */
export function parseNav(nav: string): Nav {
  if (typeof nav !== 'string' || !/^\d{1,9}(?:\.\d{1,8})?$/.test(nav)) throw new TypeError(`Expected a NAV such as "10.4567", got ${JSON.stringify(nav)}`);
  const [whole = '0', fraction = ''] = nav.split('.');
  const value = { numerator: BigInt(whole + fraction), denominator: 10n ** BigInt(fraction.length) };
  if (value.numerator === 0n) throw new RangeError('A NAV must be above zero');
  return value;
}

export interface UnitOptions {
  /** Decimal places of units. Default 3. */
  unitDecimals?: number;
  /** The currency's minor-unit exponent. Default 2 (paisa). */
  exponent?: number;
}

export interface Allotment {
  /** Units allotted, scaled by 10^unitDecimals. */
  units: bigint;
  /** The units as a decimal string ('95.632'). */
  unitsText: string;
  /** What the units cost at the NAV, rounded up to the minor unit (never more than the amount). */
  cost: bigint;
  /** amount − cost: what the fund refunds or carries. */
  remainder: bigint;
}

function places(unitDecimals: number, exponent: number) {
  if (!Number.isInteger(unitDecimals) || unitDecimals < 0 || unitDecimals > 8) throw new RangeError('unitDecimals must be a whole number from 0 to 8');
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 4) throw new RangeError('exponent must be a whole number from 0 to 4');
  return { unitScale: 10n ** BigInt(unitDecimals), minorScale: 10n ** BigInt(exponent) };
}

/** Units as a decimal string. */
export function formatUnits(units: bigint, unitDecimals = 3): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(unitDecimals + 1, '0');
  const text = unitDecimals > 0 ? `${digits.slice(0, -unitDecimals)}.${digits.slice(-unitDecimals)}` : digits;
  return negative ? `-${text}` : text;
}

/** Units for an amount at a NAV. Rounding defaults to 'floor'. */
export function allotUnits(amount: bigint, nav: string | Nav, { unitDecimals = 3, exponent = 2, rounding = 'floor' }: UnitOptions & { rounding?: RoundingMode } = {}): Allotment {
  if (typeof amount !== 'bigint' || amount < 0n) throw new RangeError('amount must be a non-negative bigint of minor units');
  const n = typeof nav === 'string' ? parseNav(nav) : nav;
  const { unitScale, minorScale } = places(unitDecimals, exponent);
  // units = (amount / minorScale) / (num / den), scaled by unitScale.
  const units = divideRounded(amount * n.denominator * unitScale, minorScale * n.numerator, rounding);
  const cost = unitsValue(units, n, { unitDecimals, exponent, rounding: 'ceil' });
  return { units, unitsText: formatUnits(units, unitDecimals), cost, remainder: amount - cost };
}

/** The value of units at a NAV in minor units. Rounding defaults to 'half-even'. */
export function unitsValue(units: bigint, nav: string | Nav, { unitDecimals = 3, exponent = 2, rounding = 'half-even' }: UnitOptions & { rounding?: RoundingMode } = {}): bigint {
  if (typeof units !== 'bigint') throw new TypeError('units must be a bigint scaled by 10^unitDecimals');
  const n = typeof nav === 'string' ? parseNav(nav) : nav;
  const { unitScale, minorScale } = places(unitDecimals, exponent);
  return divideRounded(units * n.numerator * minorScale, n.denominator * unitScale, rounding);
}
