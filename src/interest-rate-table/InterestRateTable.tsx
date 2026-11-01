'use client';

/**
 * InterestRateTable: a bank's published rates, one row per product: the product, an optional group ("Savings",
 * "Fixed deposit", "Home loan"), the annual rate, the change from the previous rate (an arrow and words, never colour
 * alone) and the date it took effect, in AD or Bikram Sambat. Rates are exact decimal strings in percent units; the
 * change is compared exactly and shown in percentage points. It publishes what you pass and decides no rate.
 */
import { useId, type ReactNode } from 'react';

import { formatBSDate, gregorianToBS } from '../nepal/calendar.ts';
import { formatCalendarDate, parseCalendarDate } from '../nepal/date-only.ts';
import { compareDecimals } from '../nepal/decimal.ts';
import { showDigits } from '../internal/lendingDigits.ts';

export interface InterestRateRow {
  /** Stable unique id (the row key). */
  id: string;
  /** The product's name ("Nari Bachat", "12-month fixed deposit"). Plain text. */
  product: string;
  /** Rows with the same group are listed under one heading row, in the order given. */
  group?: string;
  /** The annual rate in percent, an exact decimal string ('6.5'). */
  ratePercent: string;
  /** The previous rate in percent, to show the change. */
  previousRatePercent?: string;
  /** The date the rate took effect, ISO 'YYYY-MM-DD' (Gregorian). */
  effectiveFrom: string;
  /** A short note (minimum balance, "for individuals"). Plain text. */
  note?: string;
}

export interface InterestRateTableLabels {
  /** Column headings. */
  product: string;
  rate: string;
  change: string;
  effective: string;
  /** Change words, read by screen readers and shown beside the arrow. */
  up: string;
  down: string;
  same: string;
  /** Unit after a change ("0.25 points"). */
  points: string;
  /** Printed when a date is missing or outside the supported range. */
  unknownDate: string;
}

export const interestRateTableLabels: InterestRateTableLabels = {
  product: 'Product', rate: 'Rate (yearly)', change: 'Change', effective: 'Effective from', up: 'Up', down: 'Down', same: 'No change', points: 'points', unknownDate: '—',
};

export interface InterestRateTableProps {
  /** The rates, in the order to show. */
  rates: readonly InterestRateRow[];
  /** The table's caption ("Deposit rates"). Required: it names the table. */
  caption: ReactNode;
  /** A line under the caption (the source, "Rates published 1 Shrawan 2082"). */
  description?: ReactNode;
  /** Calendar for the effective dates. 'bs' covers 1975 to 2099 BS. Default 'ad'. */
  calendar?: 'ad' | 'bs';
  /** Month names and digits for dates: 'en' (default) or 'ne'. */
  language?: 'en' | 'ne';
  /** Digits for rates and dates. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Show the change column when any row has `previousRatePercent`. Default true. */
  showChange?: boolean;
  /** Replace any words, for translation. */
  labels?: Partial<InterestRateTableLabels>;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the outer element. */
  testId?: string;
}

/** a − b for two plain non-negative decimal strings, exact, as a decimal string without a sign. */
function difference(a: string, b: string): string {
  const scale = Math.max(a.split('.')[1]?.length ?? 0, b.split('.')[1]?.length ?? 0);
  const toInt = (v: string) => { const [w = '0', f = ''] = v.split('.'); return BigInt(w + f.padEnd(scale, '0')); };
  let diff = toInt(a) - toInt(b);
  if (diff < 0n) diff = -diff;
  const text = diff.toString().padStart(scale + 1, '0');
  const whole = text.slice(0, text.length - scale);
  const fraction = scale ? text.slice(-scale).replace(/0+$/, '') : '';
  return fraction ? `${whole}.${fraction.padEnd(2, '0')}` : `${whole}.00`;
}

const PLAIN = /^\d{1,3}(?:\.\d{1,6})?$/;

function dateText(value: string, calendar: 'ad' | 'bs', language: 'en' | 'ne', digits: 'latn' | 'deva', unknown: string): string {
  const parsed = parseCalendarDate(value);
  if (!parsed) return unknown;
  try {
    return calendar === 'bs' ? formatBSDate(gregorianToBS(parsed), { language, digits }) : formatCalendarDate(parsed, { language, digits });
  } catch { return unknown; }
}

const ARROWS = { up: 'M8 13V3m0 0L4 7m4-4 4 4', down: 'M8 3v10m0 0-4-4m4 4 4-4', same: 'M3 8h10' };

export function InterestRateTable({ rates, caption, description, calendar = 'ad', language = 'en', digits = 'latn', showChange = true, labels, className, testId }: InterestRateTableProps) {
  const captionId = useId();
  const words = { ...interestRateTableLabels, ...labels };
  const changes = showChange && rates.some((r) => r.previousRatePercent !== undefined);
  const columns = changes ? 4 : 3;
  const rows: ReactNode[] = [];
  let group: string | undefined;
  for (const rate of rates) {
    if (rate.group !== undefined && rate.group !== group) {
      rows.push(<tr key={`g-${rate.id}`} className="pu-rates-group"><th scope="colgroup" colSpan={columns}>{rate.group}</th></tr>);
    }
    group = rate.group;
    const valid = PLAIN.test(rate.ratePercent);
    const previous = rate.previousRatePercent !== undefined && PLAIN.test(rate.previousRatePercent) && valid ? rate.previousRatePercent : undefined;
    const direction = previous === undefined ? null : (['down', 'same', 'up'] as const)[compareDecimals(rate.ratePercent, previous) + 1]!;
    rows.push(
      <tr key={rate.id} data-change={direction ?? undefined}>
        <th scope="row"><span className="pu-rates-product">{rate.product}</span>{rate.note && <span className="pu-rates-note">{rate.note}</span>}</th>
        <td className="pu-rates-rate">{valid ? `${showDigits(rate.ratePercent, digits)}%` : '—'}</td>
        {changes && (
          <td className="pu-rates-change">
            {direction ? (
              <span className="pu-rates-delta">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={ARROWS[direction]} /></svg>
                <span>{direction === 'same' ? words.same : `${words[direction]} ${showDigits(difference(rate.ratePercent, previous!), digits)} ${words.points}`}</span>
              </span>
            ) : '—'}
          </td>
        )}
        <td className="pu-rates-date"><time dateTime={parseCalendarDate(rate.effectiveFrom) ? rate.effectiveFrom : undefined}>{dateText(rate.effectiveFrom, calendar, language, digits, words.unknownDate)}</time></td>
      </tr>,
    );
  }
  return (
    // The box scrolls sideways on a narrow screen, so it takes focus (arrow keys scroll it) and is named by the caption.
    <div className={`pu-rates${className ? ` ${className}` : ''}`} data-testid={testId} role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="pu-rates-table">
        <caption id={captionId}>{caption}{description && <span className="pu-rates-desc">{description}</span>}</caption>
        <thead>
          <tr>
            <th scope="col">{words.product}</th>
            <th scope="col">{words.rate}</th>
            {changes && <th scope="col">{words.change}</th>}
            <th scope="col">{words.effective}</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
