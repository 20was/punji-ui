'use client';

/**
 * AmortisationTable: a loan's month-by-month (or year-by-year) schedule from `amortise()` in `@punji/ui/lending`:
 * opening balance, instalment, interest, principal, any prepayment and closing balance, with a totals row. Amounts are
 * exact minor units formatted for the currency you pass (NPR in lakh and crore grouping by default). It computes
 * nothing itself except the yearly sums, which are exact bigint additions of the monthly rows.
 */
import { useId, type ReactNode } from 'react';

import { ChoiceGroup } from '../choice-group/ChoiceGroup.tsx';
import type { AmortisationRow, AmortisationSchedule } from '../lending/loan.ts';
import { getMoneyFormatter, nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { useControllableState } from '../use-controllable-state/useControllableState.ts';

export type AmortisationView = 'monthly' | 'yearly';

export interface AmortisationTableLabels {
  /** The table caption. Default "Repayment schedule". */
  caption: string;
  /** The view switch's name. Default "Show by". */
  view: string;
  /** View option words. */
  monthly: string;
  yearly: string;
  /** Column headings. */
  month: string;
  year: string;
  opening: string;
  payment: string;
  interest: string;
  principal: string;
  prepayment: string;
  closing: string;
  /** The footer row heading. Default "Total". */
  total: string;
  /** Added to the caption, with the currency code: "Amounts in NPR". */
  amountsIn: (currency: string) => string;
}

export const amortisationTableLabels: AmortisationTableLabels = {
  caption: 'Repayment schedule', view: 'Show by', monthly: 'Month', yearly: 'Year', month: 'Month', year: 'Year', opening: 'Opening balance',
  payment: 'Instalment', interest: 'Interest', principal: 'Principal', prepayment: 'Prepayment', closing: 'Closing balance', total: 'Total',
  amountsIn: (currency) => `Amounts in ${currency}`,
};

export interface AmortisationTableProps {
  /** The schedule from `amortise()`. */
  schedule: AmortisationSchedule;
  /** Money format for the amounts (currency, locale, digits). Default NPR with lakh and crore grouping. The currency code is in the caption, so cells show numbers only. */
  money?: MoneyFormatConfig;
  /** Controlled view: 'monthly' or 'yearly' (groups of 12 instalments). */
  view?: AmortisationView;
  /** Starting view when uncontrolled. Default 'monthly', or 'yearly' for schedules longer than 60 months. */
  defaultView?: AmortisationView;
  /** Called when the reader switches the view. */
  onViewChange?: (view: AmortisationView) => void;
  /** Hide the monthly and yearly switch. */
  hideViewSwitch?: boolean;
  /** Replace any words, for translation. */
  labels?: Partial<AmortisationTableLabels>;
  /** Show period numbers in Devanagari digits. Amount digits follow `money.numberingSystem`. */
  digits?: 'latn' | 'deva';
  /** Extra content under the table (a note on the rate model). */
  footnote?: ReactNode;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the outer element. */
  testId?: string;
}

interface Line { key: string; label: number; opening: bigint; payment: bigint; interest: bigint; principal: bigint; prepayment: bigint; closing: bigint }

function byYear(rows: readonly AmortisationRow[]): Line[] {
  const out: Line[] = [];
  for (const row of rows) {
    const year = Math.ceil(row.period / 12);
    const last = out[out.length - 1];
    if (last && last.label === year) {
      last.payment += row.payment; last.interest += row.interest; last.principal += row.principal; last.prepayment += row.prepayment; last.closing = row.closing;
    } else out.push({ key: `y${year}`, label: year, opening: row.opening, payment: row.payment, interest: row.interest, principal: row.principal, prepayment: row.prepayment, closing: row.closing });
  }
  return out;
}

const DEVA = '०१२३४५६७८९';

export function AmortisationTable({ schedule, money = nepalMoneyPreset, view, defaultView, onViewChange, hideViewSwitch, labels, digits = 'latn', footnote, className, testId }: AmortisationTableProps) {
  const words = { ...amortisationTableLabels, ...labels };
  const uid = useId();
  const [current, setCurrent] = useControllableState<AmortisationView>({ value: view, defaultValue: defaultView ?? (schedule.rows.length > 60 ? 'yearly' : 'monthly'), onChange: onViewChange, name: 'AmortisationTable view' });
  const formatter = getMoneyFormatter({ ...money, display: 'none' });
  const fmt = (value: bigint) => formatter.format(value);
  const num = (value: number) => (digits === 'deva' ? String(value).replace(/\d/g, (d) => DEVA[Number(d)]!) : String(value));
  const lines: Line[] = current === 'yearly' ? byYear(schedule.rows) : schedule.rows.map((r) => ({ key: `m${r.period}`, label: r.period, ...r }));
  const showPrepay = schedule.totalPrepaid > 0n;
  const totalPayments = schedule.rows.reduce((sum, r) => sum + r.payment, 0n);
  const totalPrincipal = schedule.rows.reduce((sum, r) => sum + r.principal, 0n);
  const captionId = `${uid}-cap`;
  return (
    <div className={`pu-amort${className ? ` ${className}` : ''}`} data-testid={testId}>
      {!hideViewSwitch && (
        <ChoiceGroup label={words.view} testId={`${testId ?? uid}-view`} size="sm" appearance="compact" value={current} onChange={setCurrent}
          options={[{ value: 'monthly', label: words.monthly }, { value: 'yearly', label: words.yearly }]} />
      )}
      {/* A scrollable region must be focusable so keyboard users can scroll it. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="pu-amort-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
        <table className="pu-amort-table">
          <caption id={captionId}>{words.caption} <span className="pu-amort-unit">({words.amountsIn(money.currency)})</span></caption>
          <thead>
            <tr>
              <th scope="col">{current === 'yearly' ? words.year : words.month}</th>
              <th scope="col">{words.opening}</th>
              <th scope="col">{words.payment}</th>
              <th scope="col">{words.interest}</th>
              <th scope="col">{words.principal}</th>
              {showPrepay && <th scope="col">{words.prepayment}</th>}
              <th scope="col">{words.closing}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key} data-prepaid={line.prepayment > 0n ? 'true' : undefined}>
                <th scope="row">{num(line.label)}</th>
                <td>{fmt(line.opening)}</td>
                <td>{fmt(line.payment)}</td>
                <td>{fmt(line.interest)}</td>
                <td>{fmt(line.principal)}</td>
                {showPrepay && <td>{line.prepayment > 0n ? fmt(line.prepayment) : '—'}</td>}
                <td>{fmt(line.closing)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{words.total}</th>
              <td>—</td>
              <td>{fmt(totalPayments)}</td>
              <td>{fmt(schedule.totalInterest)}</td>
              <td>{fmt(totalPrincipal)}</td>
              {showPrepay && <td>{fmt(schedule.totalPrepaid)}</td>}
              <td>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {footnote && <p className="pu-amort-note">{footnote}</p>}
    </div>
  );
}
