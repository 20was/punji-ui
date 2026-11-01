'use client';

/**
 * Payslip: one employee's pay for a period. Employer and employee details, earnings and deductions side by side (one
 * column on a phone), gross, total deductions and net pay with the net in words. Sums are exact (`payslipTotals`).
 *
 * The lines and amounts come from your payroll: this computes no salary, SSF, CIT or TDS. A net below zero is shown,
 * not hidden. Print: own print styles (plain background, no buttons, not split across pages).
 */
import { useId, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { currencyExponent, type MoneyFormatConfig } from '../money/money.ts';
import { payslipTotals, type PayLine } from '../tax/payroll.ts';
import { formatPan } from '../tax/pan.ts';
import { amountInWords, type AmountInWordsOptions } from '../tax/words.ts';

export interface PayslipPerson {
  name: string;
  /** Employee code, or the employer's address. */
  detail?: string;
  /** PAN, printed as nine digits. */
  pan?: string;
  /** Other facts as label and value pairs: designation, department, SSF number, bank account (mask it yourself). */
  facts?: readonly { label: string; value: ReactNode }[];
}

export interface PayslipLabels {
  title: string; earnings: string; deductions: string; gross: string; totalDeductions: string; net: string; inWords: string; pan: string;
  period: string; payDate: string; print: string; item: string; amount: string; none: string;
}

export const DEFAULT_PAYSLIP_LABELS: PayslipLabels = {
  title: 'Payslip', earnings: 'Earnings', deductions: 'Deductions', gross: 'Gross pay', totalDeductions: 'Total deductions', net: 'Net pay',
  inWords: 'In words', pan: 'PAN', period: 'Pay period', payDate: 'Paid on', print: 'Print payslip', item: 'Item', amount: 'Amount', none: 'None',
};

export interface PayslipProps {
  employer: PayslipPerson;
  employee: PayslipPerson;
  /** The period, as you name it: 'Shrawan 2082', 'July 2025'. */
  period: ReactNode;
  /** When it was paid, already formatted (BS, AD or both). */
  payDate?: ReactNode;
  earnings: readonly PayLine[];
  deductions: readonly PayLine[];
  /** Currency and locale. Default NPR, en-IN grouping, no currency mark (named by `currencyNote`). */
  money?: MoneyFormatConfig;
  /** Default 'Amounts in NPR'. */
  currencyNote?: ReactNode;
  /** Net pay in words options, or false to leave it out. */
  words?: AmountInWordsOptions | false;
  /** A note at the foot: leave balance, a message, "computer generated, no signature needed". */
  notes?: ReactNode;
  /** Show a Print button. Default false. */
  printable?: boolean;
  labels?: Partial<PayslipLabels>;
  /** Heading level of the title. Default 2. */
  headingLevel?: 2 | 3;
  className?: string;
  testId?: string;
}

function Person({ person, words, testId }: { person: PayslipPerson; words: PayslipLabels; testId?: string }) {
  return (
    <div className="pu-slip-person" data-testid={testId}>
      <p className="pu-slip-name">{person.name}</p>
      {person.detail && <p className="pu-slip-sub">{person.detail}</p>}
      {(person.pan || person.facts?.length) ? (
        <dl className="pu-slip-facts">
          {person.pan && <div><dt>{words.pan}</dt><dd className="pu-slip-num">{formatPan(person.pan)}</dd></div>}
          {person.facts?.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
        </dl>
      ) : null}
    </div>
  );
}

export function Payslip({
  employer, employee, period, payDate, earnings, deductions, money = nepalLedgerMoney, currencyNote, words: wordsOption, notes, printable, labels,
  headingLevel = 2, className, testId,
}: PayslipProps) {
  const words = { ...DEFAULT_PAYSLIP_LABELS, ...labels };
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  const Sub = `h${headingLevel + 1}` as 'h3' | 'h4';
  const totals = payslipTotals(earnings, deductions);
  const amount = (value: bigint, id?: string) => <MoneyDisplay value={value} preset={money} testId={id && testId ? `${testId}-${id}` : undefined} />;
  const inWords = wordsOption === false ? null : amountInWords(totals.net, { scale: currencyExponent(money.currency), ...wordsOption });
  const table = (kind: 'earnings' | 'deductions', lines: readonly PayLine[], total: bigint, totalLabel: string) => (
    <section className="pu-slip-part" aria-labelledby={`${uid}-${kind}`}>
      <Sub className="pu-slip-h" id={`${uid}-${kind}`}>{words[kind]}</Sub>
      <table className="pu-slip-table" aria-labelledby={`${uid}-${kind}`}>
        <thead className="kit-sr"><tr><th scope="col">{words.item}</th><th scope="col">{words.amount}</th></tr></thead>
        <tbody>
          {lines.length === 0 && <tr><td colSpan={2} className="pu-slip-none">{words.none}</td></tr>}
          {lines.map((line) => (
            <tr key={line.id}>
              <th scope="row">{line.label}{line.detail && <small>{line.detail}</small>}</th>
              <td className="num">{amount(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th scope="row">{totalLabel}</th><td className="num">{amount(total, kind === 'earnings' ? 'gross' : 'deductions')}</td></tr>
        </tfoot>
      </table>
    </section>
  );
  return (
    <article className={`pu-slip${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-t`} data-testid={testId}>
      <header className="pu-slip-head">
        <Person person={employer} words={words} />
        <div className="pu-slip-titlebox">
          <Heading className="pu-slip-title" id={`${uid}-t`}>{words.title}</Heading>
          <dl className="pu-slip-facts">
            <div><dt>{words.period}</dt><dd>{period}</dd></div>
            {payDate && <div><dt>{words.payDate}</dt><dd>{payDate}</dd></div>}
          </dl>
        </div>
      </header>
      <Person person={employee} words={words} testId={testId ? `${testId}-employee` : undefined} />
      <div className="pu-slip-parts">
        {table('earnings', earnings, totals.gross, words.gross)}
        {table('deductions', deductions, totals.deductions, words.totalDeductions)}
      </div>
      <div className="pu-slip-net" data-negative={totals.net < 0n ? 'true' : undefined}>
        <p className="pu-slip-net-row"><span>{words.net}</span> {amount(totals.net, 'net')}</p>
        {inWords && <p className="pu-slip-words" data-testid={testId ? `${testId}-words` : undefined}><span className="pu-slip-sub">{words.inWords}</span> {inWords}</p>}
        <p className="pu-slip-sub">{currencyNote ?? `Amounts in ${money.currency}`}</p>
      </div>
      {notes && <div className="pu-slip-notes">{notes}</div>}
      {printable && <div className="pu-slip-noprint"><Button variant="secondary" size="sm" onClick={() => window.print()} testId={testId ? `${testId}-print` : undefined}>{words.print}</Button></div>}
    </article>
  );
}
