/**
 * An alert's target as every page prints it. Pure: no React.
 */
import { rsMark } from '../format/format.ts';

export interface AlertTargetOptions {
  /** An index alert is in points ("2,800"): no rupee mark. The value is hundredths of a point, like a price in paisa. */
  index?: boolean;
  /** The reader's language for the rupee mark: 'ne' prints "रु.". Default the language `setReaderLang` set ("Rs"). */
  lang?: string;
}

const grouped = new Intl.NumberFormat('en-IN', { numberingSystem: 'latn', maximumFractionDigits: 0 });

/**
 * An alert's target as every page prints it: "Rs 263", with paisa only when it has them ("Rs 263.50"). `value` is
 * minor units (paisa), exact at any size; an index target is hundredths of a point.
 *
 * @stability beta
 */
export function alertTarget(value: bigint, options: AlertTargetOptions = {}): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = grouped.format(abs / 100n);
  const cents = abs % 100n;
  const body = cents === 0n ? whole : `${whole}.${String(cents).padStart(2, '0')}`;
  const sign = negative ? '-' : '';
  return options.index ? `${sign}${body}` : `${sign}${options.lang === undefined ? rsMark() : rsMark(options.lang)} ${body}`;
}
