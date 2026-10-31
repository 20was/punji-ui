'use client';

/**
 * PercentageInput: a field for a rate (brokerage 0.40, commission, interest 11.5). The value is a plain ASCII decimal
 * string in percent units ('0.4' means 0.4%), never a float. Devanagari and Arabic-Indic digits and a pasted '%'
 * are accepted, a fraction longer than `maxFractionDigits` is refused instead of rounded, and `min` and `max` are
 * reported (`outOfRange`) rather than clamped, so the person sees what they typed. It does not apply the rate:
 * multiply an amount by `basisPoints` with the exact helpers in `@punji/ui/calculations`.
 */
import { useState, type FocusEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

import { PriceField } from '../fields/Fields.tsx';
import { compareDecimals, parseLocalizedDecimal } from '../nepal/decimal.ts';

export interface PercentageInputChange {
  /** Exact ASCII decimal string in percent units ('12.5', '12.', '-'). Empty string when cleared. */
  value: string;
  /** 'partial' is unfinished text such as '12.' or '-'. */
  state: 'empty' | 'partial' | 'valid';
  /** The rate in basis points (hundredths of a percent) as an exact bigint, when `state` is 'valid' and it has at most two fraction digits; otherwise null. */
  basisPoints: bigint | null;
  /** Whether a valid value is below `min` or above `max`; null when inside the bounds, partial or empty. */
  outOfRange: 'below' | 'above' | null;
}

export interface PercentageInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type' | 'inputMode' | 'defaultValue' | 'min' | 'max'> {
  /** The field's label. "(percent)" is added for screen readers. */
  label: ReactNode;
  /** Help text under the field; replaced by `error` when one is set. */
  hint?: ReactNode;
  /** Error text under the field, announced as an alert. It replaces the hint and the built-in range message. */
  error?: ReactNode;
  /** Field size: 'lg' (default) or 'md'. */
  size?: 'md' | 'lg';
  /** Hide the label visually; it stays in the accessible name. */
  hideLabel?: boolean;
  /** Test id on the input element. */
  testId?: string;
  /** Controlled value: the exact ASCII decimal string from `onValueChange` ('' for none). */
  value: string;
  /** Called with each accepted edit, and on blur when the text is finished ('12.' becomes '12'). */
  onValueChange: (change: PercentageInputChange) => void;
  /** Lowest allowed rate, a plain decimal string ('0'). Reported through `outOfRange`; a message shows after the field is left. */
  min?: string;
  /** Highest allowed rate, a plain decimal string ('100'). */
  max?: string;
  /** Most digits after the point (0 to 9). Default 2: 0.25 is accepted, 0.125 is refused. */
  maxFractionDigits?: number;
  /** Accept a leading minus (a discount, a negative yield). Default false. */
  allowNegative?: boolean;
  /** Show the digits in Devanagari (१२.५). The value stays ASCII. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** The word added to the accessible name. Default "percent". */
  unitLabel?: string;
  /** Text for a value outside `min` and `max`, shown once the field has been left. Default is English; pass your own for Nepali. */
  rangeMessage?: (bounds: { min: string | null; max: string | null }) => ReactNode;
  /** Ref to the input element. */
  ref?: Ref<HTMLInputElement>;
}

const SHAPE = /^-?(?:\d+(?:\.\d*)?|\.\d*)?$/;
const DEVANAGARI = '०१२३४५६७८९';
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Typed or pasted text to ASCII: digits normalised, spaces and percent signs dropped. Other characters pass through for the caller to refuse. */
function toCanonical(text: string): string {
  return text
    .replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[\s%٪‎‏]/g, '')
    .replace(/[−–]/g, '-');
}

function basisPointsOf(value: string): bigint | null {
  const [whole = '0', fraction = ''] = value.replace('-', '').split('.');
  if (fraction.length > 2) return null;
  const n = BigInt(whole + fraction.padEnd(2, '0'));
  return value.startsWith('-') ? -n : n;
}

function describe(text: string, max: number, min: string | undefined, upper: string | undefined): PercentageInputChange {
  const parsed = parseLocalizedDecimal(text, { maxFractionDigits: max, grouping: 'none' });
  if (parsed.state === 'empty') return { value: '', state: 'empty', basisPoints: null, outOfRange: null };
  if (parsed.state !== 'valid') return { value: text, state: 'partial', basisPoints: null, outOfRange: null };
  const outOfRange = min !== undefined && compareDecimals(parsed.value, min) < 0 ? 'below' : upper !== undefined && compareDecimals(parsed.value, upper) > 0 ? 'above' : null;
  return { value: parsed.value, state: 'valid', basisPoints: basisPointsOf(parsed.value), outOfRange };
}

function defaultRangeMessage({ min, max }: { min: string | null; max: string | null }): string {
  if (min !== null && max !== null) return `Enter a rate from ${min}% to ${max}%.`;
  return max !== null ? `Enter a rate of ${max}% or less.` : `Enter a rate of ${min}% or more.`;
}

export function PercentageInput({
  label, value, onValueChange, min, max, maxFractionDigits = 2, allowNegative = false, digits = 'latn', unitLabel = 'percent',
  rangeMessage = defaultRangeMessage, error, onBlur, testId, className, ...rest
}: PercentageInputProps) {
  const [left, setLeft] = useState(false);
  if (!Number.isInteger(maxFractionDigits) || maxFractionDigits < 0 || maxFractionDigits > 9) throw new RangeError('PercentageInput maxFractionDigits must be 0 to 9');
  for (const bound of [min, max]) if (bound !== undefined && parseLocalizedDecimal(bound, { maxFractionDigits: 9, grouping: 'none' }).state !== 'valid') throw new RangeError(`PercentageInput bound is not a plain decimal: ${bound}`);
  const shown = digits === 'deva' ? value.replace(/\d/g, (d) => DEVANAGARI[Number(d)]!) : value;
  const current = describe(value, 9, min, max);
  const rangeError = left && current.outOfRange ? rangeMessage({ min: min ?? null, max: max ?? null }) : undefined;

  return (
    <PriceField
      {...rest}
      className={className ? `pu-percentage-input ${className}` : 'pu-percentage-input'}
      testId={testId}
      label={<>{label}{' '}<span className="kit-sr">{`(${unitLabel})`}</span></>}
      error={error ?? rangeError}
      source={<span className="pu-percent-sign" aria-hidden="true">%</span>}
      value={shown}
      onChange={(raw) => {
        const canonical = toCanonical(raw);
        const point = canonical.indexOf('.');
        if (canonical.length > 14 || !SHAPE.test(canonical) || (!allowNegative && canonical.startsWith('-')) || (point >= 0 && canonical.length - point - 1 > maxFractionDigits)) return;
        onValueChange(describe(canonical, maxFractionDigits, min, max));
      }}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        setLeft(true);
        // Finish the text: '12.' becomes '12'; a lone '-' or '.' clears.
        if (value !== '') {
          const finished = /\d/.test(value) ? value.replace(/\.$/, '') : '';
          if (finished !== value) onValueChange(describe(finished, maxFractionDigits, min, max));
        }
        onBlur?.(event);
      }}
    />
  );
}
