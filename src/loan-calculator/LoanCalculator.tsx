'use client';

/**
 * LoanCalculator: amount, annual rate and tenure in; the monthly instalment (EMI), total interest and total payable
 * out, with an optional part-prepayment and the full repayment schedule behind a disclosure. All figures come from
 * the exact bigint functions in `@punji/ui/lending`. It is an estimate for the reader: the lender's offer letter,
 * with its own day count, fees and floating rate, is the figure that binds.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { AmortisationTable, type AmortisationTableLabels } from '../amortisation-table/AmortisationTable.tsx';
import { Button } from '../button/Button.tsx';
import { type RoundingMode } from '../calculations/rounding.ts';
import { ChoiceGroup } from '../choice-group/ChoiceGroup.tsx';
import { CurrencyInput } from '../currency-input/CurrencyInput.tsx';
import { NumberField } from '../fields/Fields.tsx';
import { amortise, type AmortisationSchedule } from '../lending/loan.ts';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { minorOf, rateWithin, showDigits, wholeNumber } from '../internal/lendingDigits.ts';
import { currencyExponent, nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { compareDecimals } from '../nepal/decimal.ts';
import { PercentageInput } from '../percentage-input/PercentageInput.tsx';

export interface LoanCalculatorLabels {
  /** Field and result words. */
  amount: string;
  rate: string;
  tenure: string;
  tenureUnit: string;
  years: string;
  months: string;
  prepayment: string;
  prepaymentAmount: string;
  prepaymentAfter: string;
  strategy: string;
  reduceTenure: string;
  reduceEmi: string;
  emi: string;
  totalInterest: string;
  totalPayable: string;
  interestSaved: string;
  monthsSaved: string;
  showSchedule: string;
  hideSchedule: string;
  /** Shown in the results area until the inputs are complete. */
  incomplete: string;
  /** Errors for each field. */
  amountError: string;
  tenureError: (max: number) => string;
  prepaymentAfterError: (max: number) => string;
  /** Under the results: what the figure is. */
  disclaimer: string;
}

export const loanCalculatorLabels: LoanCalculatorLabels = {
  amount: 'Loan amount', rate: 'Interest rate (yearly)', tenure: 'Tenure', tenureUnit: 'Tenure in', years: 'Years', months: 'Months',
  prepayment: 'Part-prepayment (optional)', prepaymentAmount: 'Prepayment amount', prepaymentAfter: 'Paid after instalment number', strategy: 'After prepaying', reduceTenure: 'Finish sooner', reduceEmi: 'Lower instalment',
  emi: 'Monthly instalment (EMI)', totalInterest: 'Total interest', totalPayable: 'Total payable', interestSaved: 'Interest saved', monthsSaved: 'Instalments saved',
  showSchedule: 'Show repayment schedule', hideSchedule: 'Hide repayment schedule', incomplete: 'Enter the amount, rate and tenure to see the instalment.',
  amountError: 'Enter an amount above zero.', tenureError: (max) => `Enter a tenure from 1 to ${max} months.`, prepaymentAfterError: (max) => `Enter an instalment number from 1 to ${max - 1}.`,
  disclaimer: 'An estimate with interest charged monthly on the reducing balance. Your lender’s offer letter is the figure that applies.',
};

export interface LoanCalculatorProps {
  /** Starting loan amount as an exact major-unit decimal string ('2500000'). */
  defaultAmount?: string;
  /** Starting annual rate in percent ('11.5'). */
  defaultRatePercent?: string;
  /** Starting tenure in months. Default 60. */
  defaultMonths?: number;
  /** Starting tenure unit for the field. Default 'years' when `defaultMonths` is a whole number of years. */
  defaultTenureUnit?: 'years' | 'months';
  /** Longest tenure in months. Default 360 (30 years). */
  maxMonths?: number;
  /** Highest rate the field accepts without an error, in percent. Default '40'. */
  maxRatePercent?: string;
  /** Show the part-prepayment fields. Default true. */
  allowPrepayment?: boolean;
  /** How the instalment and each month's interest are rounded. Default 'half-up' (ties away from zero). */
  rounding?: RoundingMode;
  /** Round the instalment to a multiple of this many minor units (100n for whole rupees). Default 1n. */
  roundTo?: bigint;
  /** Money format (currency, locale, digits). Default NPR with lakh and crore grouping. */
  money?: MoneyFormatConfig;
  /** Show typed digits in Devanagari. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Called with the schedule each time the inputs make a complete loan, or null when they do not. */
  onScheduleChange?: (schedule: AmortisationSchedule | null) => void;
  /** Replace any words, for translation. */
  labels?: Partial<LoanCalculatorLabels>;
  /** Replace any words in the schedule table. */
  tableLabels?: Partial<AmortisationTableLabels>;
  /** The heading over the calculator, if any. */
  title?: ReactNode;
  /** The title's heading level. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the outer element; inner parts get suffixes (`-emi`, `-schedule`). */
  testId?: string;
}

export function LoanCalculator({
  defaultAmount = '', defaultRatePercent = '', defaultMonths = 60, defaultTenureUnit, maxMonths = 360, maxRatePercent = '40', allowPrepayment = true,
  rounding = 'half-up', roundTo = 1n, money = nepalMoneyPreset, digits = 'latn', onScheduleChange, labels, tableLabels, title, headingLevel = 2, className, testId,
}: LoanCalculatorProps) {
  const words = { ...loanCalculatorLabels, ...labels };
  const uid = useId();
  const exponent = currencyExponent(money.currency);
  const [amount, setAmount] = useState(defaultAmount);
  const [rate, setRate] = useState(defaultRatePercent);
  const [unit, setUnit] = useState<'years' | 'months'>(defaultTenureUnit ?? (defaultMonths % 12 === 0 ? 'years' : 'months'));
  const [tenure, setTenure] = useState(String(unit === 'years' ? defaultMonths / 12 : defaultMonths));
  const [prepay, setPrepay] = useState('');
  const [after, setAfter] = useState('12');
  const [strategy, setStrategy] = useState<'reduce-tenure' | 'reduce-emi'>('reduce-tenure');
  const [open, setOpen] = useState(false);
  const deva = digits === 'deva' ? 'deva' : undefined;

  const principal = minorOf(amount, exponent);
  const tenureNumber = wholeNumber(tenure);
  const months = tenureNumber === null ? 0 : unit === 'years' ? tenureNumber * 12 : tenureNumber;
  const monthsOk = months >= 1 && months <= maxMonths;
  const rateOk = rateWithin(rate, maxRatePercent, compareDecimals);
  const prepayMinor = minorOf(prepay, exponent);
  const afterNumber = wholeNumber(after) ?? 0;
  const afterOk = afterNumber >= 1 && (!monthsOk || afterNumber < months);

  const result = useMemo(() => {
    if (principal === null || principal <= 0n || !monthsOk || !rateOk) return null;
    const base = amortise({ principal, ratePercent: rate, months, rounding, roundTo });
    const withPrepay = prepayMinor && prepayMinor > 0n && afterOk
      ? amortise({ principal, ratePercent: rate, months, rounding, roundTo, prepayments: [{ period: afterNumber, amount: prepayMinor }], strategy })
      : null;
    return { base, withPrepay };
  }, [principal, monthsOk, rateOk, rate, months, rounding, roundTo, prepayMinor, afterOk, afterNumber, strategy]);
  const shown = result?.withPrepay ?? result?.base ?? null;
  const report = useRef(onScheduleChange);
  useEffect(() => { report.current = onScheduleChange; }, [onScheduleChange]);
  useEffect(() => { report.current?.(shown); }, [shown]);

  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const resultId = `${uid}-result`;
  return (
    <section className={`pu-lcalc${className ? ` ${className}` : ''}`} aria-labelledby={title ? `${uid}-title` : undefined} aria-label={title ? undefined : words.emi} data-testid={testId}>
      {title && <Heading className="pu-lcalc-title" id={`${uid}-title`}>{title}</Heading>}
      <div className="pu-lcalc-grid">
        <div className="pu-lcalc-inputs">
          <CurrencyInput label={words.amount} preset={money} value={amount} onValueChange={(c) => setAmount(c.value)} numberingSystem={deva ?? money.numberingSystem}
            error={amount !== '' && principal !== null && principal <= 0n ? words.amountError : undefined} testId={testId && `${testId}-amount`} />
          <PercentageInput label={words.rate} value={rate} onValueChange={(c) => setRate(c.value)} min="0" max={maxRatePercent} maxFractionDigits={4} digits={digits} testId={testId && `${testId}-rate`} />
          <div className="pu-lcalc-tenure">
            <NumberField label={words.tenure} integer value={tenure} onChange={setTenure} testId={testId && `${testId}-tenure`}
              error={tenure !== '' && !monthsOk ? words.tenureError(maxMonths) : undefined} hint={unit === 'years' && monthsOk ? `${showDigits(months, digits)} ${words.months.toLowerCase()}` : undefined} />
            <ChoiceGroup label={words.tenureUnit} testId={`${testId ?? uid}-unit`} size="lg" appearance="compact" value={unit}
              onChange={(next) => {
                if (next === unit) return;
                if (monthsOk) setTenure(String(next === 'years' ? (months % 12 === 0 ? months / 12 : Math.max(1, Math.round(months / 12))) : months));
                setUnit(next);
              }}
              options={[{ value: 'years', label: words.years }, { value: 'months', label: words.months }]} />
          </div>
          {allowPrepayment && (
            <fieldset className="pu-lcalc-prepay">
              <legend>{words.prepayment}</legend>
              <CurrencyInput label={words.prepaymentAmount} preset={money} value={prepay} onValueChange={(c) => setPrepay(c.value)} numberingSystem={deva ?? money.numberingSystem} size="md" testId={testId && `${testId}-prepay`} />
              <NumberField label={words.prepaymentAfter} integer size="md" value={after} onChange={setAfter} error={prepay !== '' && !afterOk ? words.prepaymentAfterError(monthsOk ? months : maxMonths) : undefined} testId={testId && `${testId}-after`} />
              <ChoiceGroup label={words.strategy} testId={`${testId ?? uid}-strategy`} size="md" appearance="compact" value={strategy} onChange={setStrategy}
                options={[{ value: 'reduce-tenure', label: words.reduceTenure }, { value: 'reduce-emi', label: words.reduceEmi }]} />
            </fieldset>
          )}
        </div>
        <div className="pu-lcalc-result" id={resultId} aria-live="polite" aria-atomic="true">
          {result && shown ? (
            <>
              <dl className="pu-lcalc-figures">
                <div className="pu-lcalc-main">
                  <dt>{words.emi}</dt>
                  <dd data-testid={testId && `${testId}-emi`}><MoneyDisplay value={result.base.emi} preset={money} /></dd>
                </div>
                <div><dt>{words.totalInterest}</dt><dd><MoneyDisplay value={shown.totalInterest} preset={money} /></dd></div>
                <div><dt>{words.totalPayable}</dt><dd><MoneyDisplay value={shown.totalPaid} preset={money} /></dd></div>
                {result.withPrepay && (
                  <>
                    <div className="pu-lcalc-saved"><dt>{words.interestSaved}</dt><dd><MoneyDisplay value={result.base.totalInterest - result.withPrepay.totalInterest} preset={money} /></dd></div>
                    {strategy === 'reduce-tenure'
                      ? <div className="pu-lcalc-saved"><dt>{words.monthsSaved}</dt><dd>{showDigits(result.base.periods - result.withPrepay.periods, digits)}</dd></div>
                      : null}
                  </>
                )}
              </dl>
              <p className="pu-lcalc-note">{words.disclaimer}</p>
            </>
          ) : <p className="pu-lcalc-empty">{words.incomplete}</p>}
        </div>
      </div>
      {shown && (
        <div className="pu-lcalc-schedule">
          <Button variant="secondary" size="sm" aria-expanded={open} aria-controls={`${uid}-schedule`} onClick={() => setOpen((v) => !v)} testId={testId && `${testId}-toggle`}>
            {open ? words.hideSchedule : words.showSchedule}
          </Button>
          <div id={`${uid}-schedule`} hidden={!open}>
            {open && <AmortisationTable schedule={shown} money={money} labels={tableLabels} digits={digits} testId={testId && `${testId}-schedule`} />}
          </div>
        </div>
      )}
    </section>
  );
}

