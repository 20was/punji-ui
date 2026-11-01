'use client';

/**
 * DepositCalculator: a fixed deposit (one amount) or a recurring deposit (a monthly instalment), with the annual
 * rate, term, how often interest is credited, the tax deducted at source (TDS) and, for a fixed deposit, whether the
 * interest compounds or is paid out. Shows total deposited, gross interest, TDS, net interest and the maturity amount,
 * with each credit in a table behind a disclosure. Every figure is exact bigint arithmetic from `simulateDeposit` in
 * `@punji/ui/lending`. An estimate: the bank's day count and its rate on the day you deposit decide the real figure.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import type { RoundingMode } from '../calculations/rounding.ts';
import { ChoiceGroup } from '../choice-group/ChoiceGroup.tsx';
import { CurrencyInput } from '../currency-input/CurrencyInput.tsx';
import { NumberField, SelectField } from '../fields/Fields.tsx';
import { minorOf, rateWithin, showDigits, wholeNumber } from '../internal/lendingDigits.ts';
import { simulateDeposit, type CompoundingFrequency, type DepositResult } from '../lending/deposit.ts';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { currencyExponent, getMoneyFormatter, nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { compareDecimals } from '../nepal/decimal.ts';
import { PercentageInput } from '../percentage-input/PercentageInput.tsx';

export type DepositKind = 'fixed' | 'recurring';

export interface DepositCalculatorLabels {
  /** The kind switch and its options. */
  kind: string;
  fixed: string;
  recurring: string;
  /** Field words. */
  amountFixed: string;
  amountRecurring: string;
  rate: string;
  term: string;
  compounding: string;
  frequency: Record<CompoundingFrequency, string>;
  tds: string;
  tdsHint: string;
  payout: string;
  compound: string;
  payOut: string;
  /** Result words. */
  deposited: string;
  grossInterest: string;
  tdsAmount: string;
  netInterest: string;
  maturity: string;
  paidOut: string;
  showCredits: string;
  hideCredits: string;
  /** Credit table words. */
  creditsCaption: string;
  month: string;
  interest: string;
  net: string;
  balance: string;
  amountsIn: (currency: string) => string;
  /** Shown until the inputs are complete. */
  incomplete: string;
  termError: (max: number) => string;
  disclaimer: string;
}

export const depositCalculatorLabels: DepositCalculatorLabels = {
  kind: 'Deposit type', fixed: 'Fixed deposit', recurring: 'Recurring deposit', amountFixed: 'Deposit amount', amountRecurring: 'Monthly instalment',
  rate: 'Interest rate (yearly)', term: 'Term in months', compounding: 'Interest credited',
  frequency: { monthly: 'Monthly', quarterly: 'Quarterly', 'half-yearly': 'Half-yearly', yearly: 'Yearly', 'at-maturity': 'At maturity' },
  tds: 'Tax deducted at source (TDS)', tdsHint: 'Check the rate that applies to the account holder.', payout: 'Interest', compound: 'Add to deposit', payOut: 'Pay out',
  deposited: 'Total deposited', grossInterest: 'Interest before tax', tdsAmount: 'TDS', netInterest: 'Interest after tax', maturity: 'Maturity amount', paidOut: 'Interest paid out',
  showCredits: 'Show each interest credit', hideCredits: 'Hide interest credits', creditsCaption: 'Interest credits', month: 'Month', interest: 'Interest', net: 'After tax', balance: 'Balance',
  amountsIn: (currency) => `Amounts in ${currency}`, incomplete: 'Enter the amount, rate and term to see the maturity amount.',
  termError: (max) => `Enter a term from 1 to ${max} months.`,
  disclaimer: 'An estimate with interest accrued monthly and credited as chosen. Your bank’s rate and day count decide the final figure.',
};

export interface DepositCalculatorProps {
  /** Starting kind. Default 'fixed'. */
  defaultKind?: DepositKind;
  /** Starting amount as an exact major-unit decimal string. */
  defaultAmount?: string;
  /** Starting annual rate in percent ('8.5'). */
  defaultRatePercent?: string;
  /** Starting term in months. Default 12. */
  defaultMonths?: number;
  /** Starting credit frequency. Default 'quarterly'. */
  defaultCompounding?: CompoundingFrequency;
  /** Starting TDS percent. Default '6'. */
  defaultTdsPercent?: string;
  /** Longest term in months. Default 120. */
  maxMonths?: number;
  /** Highest rate the field accepts without an error, in percent. Default '20'. */
  maxRatePercent?: string;
  /** Which credit frequencies to offer. Default all five. */
  frequencies?: readonly CompoundingFrequency[];
  /** How each interest credit and TDS amount is rounded. Default 'half-up'. */
  rounding?: RoundingMode;
  /** Money format. Default NPR with lakh and crore grouping. */
  money?: MoneyFormatConfig;
  /** Show typed digits in Devanagari. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Called with the result whenever the inputs make a complete deposit, or null. */
  onResultChange?: (result: DepositResult | null) => void;
  /** Replace any words, for translation. */
  labels?: Partial<DepositCalculatorLabels>;
  /** The heading over the calculator, if any. */
  title?: ReactNode;
  /** The title's heading level. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the outer element; inner parts get suffixes (`-maturity`, `-credits`). */
  testId?: string;
}

const ALL: readonly CompoundingFrequency[] = ['monthly', 'quarterly', 'half-yearly', 'yearly', 'at-maturity'];

export function DepositCalculator({
  defaultKind = 'fixed', defaultAmount = '', defaultRatePercent = '', defaultMonths = 12, defaultCompounding = 'quarterly', defaultTdsPercent = '6',
  maxMonths = 120, maxRatePercent = '20', frequencies = ALL, rounding = 'half-up', money = nepalMoneyPreset, digits = 'latn', onResultChange, labels, title, headingLevel = 2, className, testId,
}: DepositCalculatorProps) {
  const words = { ...depositCalculatorLabels, ...labels, frequency: { ...depositCalculatorLabels.frequency, ...labels?.frequency } };
  const uid = useId();
  const exponent = currencyExponent(money.currency);
  const [kind, setKind] = useState<DepositKind>(defaultKind);
  const [amount, setAmount] = useState(defaultAmount);
  const [rate, setRate] = useState(defaultRatePercent);
  const [term, setTerm] = useState(String(defaultMonths));
  const [compounding, setCompounding] = useState<CompoundingFrequency>(defaultCompounding);
  const [tds, setTds] = useState(defaultTdsPercent);
  const [payout, setPayout] = useState<'compound' | 'pay-out'>('compound');
  const [open, setOpen] = useState(false);

  const minor = minorOf(amount, exponent);
  const months = wholeNumber(term) ?? 0;
  const monthsOk = months >= 1 && months <= maxMonths;
  const rateOk = rateWithin(rate, maxRatePercent, compareDecimals);
  const tdsOk = rateWithin(tds === '' ? '0' : tds, '100', compareDecimals);
  const effectivePayout = kind === 'fixed' ? payout : 'compound';

  const result = useMemo(() => {
    if (minor === null || minor <= 0n || !monthsOk || !rateOk || !tdsOk) return null;
    return simulateDeposit({
      principal: kind === 'fixed' ? minor : 0n, monthlyDeposit: kind === 'recurring' ? minor : 0n, months, ratePercent: rate, compounding,
      tdsPercent: tds === '' ? '0' : tds, payout: effectivePayout, rounding,
    });
  }, [minor, monthsOk, rateOk, tdsOk, kind, months, rate, compounding, tds, effectivePayout, rounding]);
  const report = useRef(onResultChange);
  useEffect(() => { report.current = onResultChange; }, [onResultChange]);
  useEffect(() => { report.current?.(result); }, [result]);

  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const fmt = getMoneyFormatter({ ...money, display: 'none' });
  const deva = digits === 'deva' ? 'deva' : money.numberingSystem;
  return (
    <section className={`pu-dcalc${className ? ` ${className}` : ''}`} aria-labelledby={title ? `${uid}-title` : undefined} aria-label={title ? undefined : words.maturity} data-testid={testId}>
      {title && <Heading className="pu-lcalc-title" id={`${uid}-title`}>{title}</Heading>}
      <ChoiceGroup label={words.kind} testId={`${testId ?? uid}-kind`} value={kind} onChange={setKind} options={[{ value: 'fixed', label: words.fixed }, { value: 'recurring', label: words.recurring }]} />
      <div className="pu-lcalc-grid">
        <div className="pu-lcalc-inputs">
          <CurrencyInput label={kind === 'fixed' ? words.amountFixed : words.amountRecurring} preset={money} numberingSystem={deva} value={amount} onValueChange={(c) => setAmount(c.value)} testId={testId && `${testId}-amount`} />
          <PercentageInput label={words.rate} value={rate} onValueChange={(c) => setRate(c.value)} min="0" max={maxRatePercent} maxFractionDigits={4} digits={digits} testId={testId && `${testId}-rate`} />
          <NumberField label={words.term} integer value={term} onChange={setTerm} error={term !== '' && !monthsOk ? words.termError(maxMonths) : undefined} testId={testId && `${testId}-term`} />
          <SelectField label={words.compounding} value={compounding} onChange={(v) => setCompounding(v as CompoundingFrequency)} options={frequencies.map((f) => ({ value: f, label: words.frequency[f] }))} testId={testId && `${testId}-compounding`} />
          <PercentageInput label={words.tds} hint={words.tdsHint} value={tds} onValueChange={(c) => setTds(c.value)} min="0" max="100" digits={digits} testId={testId && `${testId}-tds`} />
          {kind === 'fixed' && (
            <ChoiceGroup label={words.payout} testId={`${testId ?? uid}-payout`} size="md" appearance="compact" value={payout} onChange={setPayout}
              options={[{ value: 'compound', label: words.compound }, { value: 'pay-out', label: words.payOut }]} />
          )}
        </div>
        <div className="pu-lcalc-result" aria-live="polite" aria-atomic="true">
          {result ? (
            <>
              <dl className="pu-lcalc-figures">
                <div className="pu-lcalc-main"><dt>{words.maturity}</dt><dd data-testid={testId && `${testId}-maturity`}><MoneyDisplay value={result.maturity} preset={money} /></dd></div>
                <div><dt>{words.deposited}</dt><dd><MoneyDisplay value={result.totalDeposited} preset={money} /></dd></div>
                <div><dt>{words.grossInterest}</dt><dd><MoneyDisplay value={result.grossInterest} preset={money} /></dd></div>
                <div><dt>{words.tdsAmount}</dt><dd><MoneyDisplay value={result.totalTds} preset={money} /></dd></div>
                <div><dt>{words.netInterest}</dt><dd><MoneyDisplay value={result.netInterest} preset={money} /></dd></div>
                {result.paidOut > 0n && <div><dt>{words.paidOut}</dt><dd><MoneyDisplay value={result.paidOut} preset={money} /></dd></div>}
              </dl>
              <p className="pu-lcalc-note">{words.disclaimer}</p>
            </>
          ) : <p className="pu-lcalc-empty">{words.incomplete}</p>}
        </div>
      </div>
      {result && (
        <div className="pu-lcalc-schedule">
          <Button variant="secondary" size="sm" aria-expanded={open} aria-controls={`${uid}-credits`} onClick={() => setOpen((v) => !v)} testId={testId && `${testId}-toggle`}>
            {open ? words.hideCredits : words.showCredits}
          </Button>
          <div id={`${uid}-credits`} hidden={!open}>
            {open && (
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
              <div className="pu-amort-scroll" role="region" aria-labelledby={`${uid}-cap`} tabIndex={0} data-testid={testId && `${testId}-credits`}>
                <table className="pu-amort-table">
                  <caption id={`${uid}-cap`}>{words.creditsCaption} <span className="pu-amort-unit">({words.amountsIn(money.currency)})</span></caption>
                  <thead><tr><th scope="col">{words.month}</th><th scope="col">{words.interest}</th><th scope="col">{words.tdsAmount}</th><th scope="col">{words.net}</th><th scope="col">{words.balance}</th></tr></thead>
                  <tbody>
                    {result.credits.map((c) => (
                      <tr key={c.period}><th scope="row">{showDigits(c.month, digits)}</th><td>{fmt.format(c.interest)}</td><td>{fmt.format(c.tds)}</td><td>{fmt.format(c.net)}</td><td>{fmt.format(c.closing)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
