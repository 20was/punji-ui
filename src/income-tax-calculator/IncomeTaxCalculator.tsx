'use client';

/**
 * IncomeTaxCalculator: annual income, filing status (single or couple), retirement contributions (SSF, CIT, PF) and
 * other capped deductions in; taxable income, the tax band by band, the tax for the year and per month, and the
 * effective rate out. IncomeTaxBreakdown is the band table on its own, for a payslip or a report.
 *
 * The slabs, caps and rebates are props: the package ships no tax table, because they change every budget. The
 * figures are an estimate for the person; payroll and returns must use your server's computation.
 */
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

import type { ExactRate, RoundingMode } from '../calculations/rounding.ts';
import { divideRounded } from '../calculations/rounding.ts';
import { Checkbox } from '../checkbox/Checkbox.tsx';
import { ChoiceGroup } from '../choice-group/ChoiceGroup.tsx';
import { CurrencyInput } from '../currency-input/CurrencyInput.tsx';
import { nepalLedgerMoney } from '../debit-credit/DebitCredit.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { currencyExponent, getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import { parseMinorUnits } from '../nepal/money.ts';
import { computeIncomeTax, taxableIncome, type IncomeTaxResult, type TaxRebate, type TaxSlab, type TaxableIncomeResult } from '../tax/income-tax.ts';
import { ratePercent } from '../tax/invoice.ts';

export interface IncomeTaxBreakdownLabels {
  band: string; rate: string; taxed: string; tax: string; total: string; first: string; next: string; above: string; waived: string;
}

export const DEFAULT_INCOME_TAX_BREAKDOWN_LABELS: IncomeTaxBreakdownLabels = {
  band: 'Income band', rate: 'Rate', taxed: 'Income in band', tax: 'Tax', total: 'Total tax', first: 'First', next: 'Next', above: 'Above', waived: 'waived',
};

export interface IncomeTaxBreakdownProps {
  /** The result of `computeIncomeTax`. */
  result: IncomeTaxResult;
  /** Names the table. */
  caption: string;
  /** Currency and locale. Default NPR, en-IN grouping, no currency mark. */
  money?: MoneyFormatConfig;
  /** Leave out bands no income reached. Default false: every band is listed, so the person sees the whole table. */
  hideEmpty?: boolean;
  /** Column words, in the reader's language. */
  labels?: Partial<IncomeTaxBreakdownLabels>;
  /** Sets `data-testid` on the table. */
  testId?: string;
}

/** The band-by-band table: what part of the income fell in each band, its rate and the tax on it. */
export function IncomeTaxBreakdown({ result, caption, money = nepalLedgerMoney, hideEmpty = false, labels, testId }: IncomeTaxBreakdownProps) {
  const words = { ...DEFAULT_INCOME_TAX_BREAKDOWN_LABELS, ...labels };
  const captionId = useId();
  const formatter = getMoneyFormatter({ ...money, display: 'none' });
  const bandName = (band: IncomeTaxResult['bands'][number]) => {
    if (band.label) return band.label;
    if (band.to === null) return `${words.above} ${formatter.format(band.from)}`;
    return `${band.index === 0 ? words.first : words.next} ${formatter.format(band.to - band.from)}`;
  };
  const bands = hideEmpty ? result.bands.filter((band) => band.taxed > 0n) : result.bands;
  return (
    // Scrolls sideways on a narrow screen, so it takes focus and is named by the caption.
    <div className="pu-itax-box" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className="pu-itax-table" data-testid={testId}>
        <caption id={captionId}>{caption}</caption>
        <thead>
          <tr><th scope="col">{words.band}</th><th scope="col" className="num">{words.rate}</th><th scope="col" className="num">{words.taxed}</th><th scope="col" className="num">{words.tax}</th></tr>
        </thead>
        <tbody>
          {bands.map((band) => (
            <tr key={band.index} data-empty={band.taxed === 0n ? 'true' : undefined} data-testid={testId ? `${testId}-band-${band.index}` : undefined}>
              <th scope="row">{bandName(band)}</th>
              <td className="num">{`${ratePercent(band.rate)}%`}{band.waived && <span className="pu-itax-waived"> ({words.waived})</span>}</td>
              <td className="num"><MoneyDisplay value={band.taxed} preset={money} /></td>
              <td className="num"><MoneyDisplay value={band.tax} preset={money} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th scope="row" colSpan={3}>{words.total}</th><td className="num" data-testid={testId ? `${testId}-total` : undefined}><MoneyDisplay value={result.grossTax} preset={money} /></td></tr>
        </tfoot>
      </table>
    </div>
  );
}

export interface TaxDeductionField {
  /** Stable id; also the key in `defaultValues.amounts`. */
  id: string;
  /** The field's label. */
  label: string;
  /** Most that may be deducted for it. */
  cap?: bigint;
  /** Help under the field. Default: "Up to <cap>" when there is a cap. */
  hint?: ReactNode;
}

export interface IncomeTaxCalculatorLabels {
  income: string; incomeHint: string; status: string; single: string; couple: string; retirement: string; retirementHint: string; other: string; ssf: string;
  taxable: string; deductions: string; tax: string; monthly: string; effective: string; net: string; rebate: string; breakdown: string; summary: string; announce: (tax: string) => string; upTo: (amount: string) => string;
}

export const DEFAULT_INCOME_TAX_CALCULATOR_LABELS: IncomeTaxCalculatorLabels = {
  income: 'Annual income', incomeHint: 'Salary and allowances for the year, before tax', status: 'Filing status', single: 'Single', couple: 'Couple',
  retirement: 'Retirement contributions', retirementHint: 'Together limited by the rule for the year', other: 'Other deductions',
  ssf: 'I contribute to the Social Security Fund', taxable: 'Taxable income', deductions: 'Deductions allowed', tax: 'Tax for the year', monthly: 'Per month',
  effective: 'Effective rate', net: 'Income after tax', rebate: 'Rebate', breakdown: 'Tax by band', summary: 'Result',
  announce: (tax) => `Tax for the year ${tax}.`, upTo: (amount) => `Up to ${amount}`,
};

export interface IncomeTaxCalculatorResult {
  /** The filing status chosen. */
  status: 'single' | 'couple';
  /** Income, allowed deductions and taxable income (`taxableIncome`). */
  deductions: TaxableIncomeResult;
  /** Bands, rebates and tax (`computeIncomeTax`). */
  tax: IncomeTaxResult;
}

export interface IncomeTaxCalculatorProps {
  /** Slabs for each filing status, for the fiscal year shown. */
  slabs: { single: readonly TaxSlab[]; couple: readonly TaxSlab[] };
  /** Retirement contribution fields. Default SSF, CIT and PF with no individual cap. */
  retirement?: readonly TaxDeductionField[];
  /** Limit on retirement contributions together: a cap and a fraction of income (for example 1/3). */
  retirementRule?: { cap?: bigint; fraction?: ExactRate };
  /** Other deduction fields, each with its own cap (insurance premium, health insurance). */
  deductions?: readonly TaxDeductionField[];
  /** Rebates the person can tick (for example a rebate for women with only remuneration income). */
  rebates?: readonly (TaxRebate & { id: string })[];
  /** Show the SSF checkbox, which waives slabs marked `waivable`. Default true when a slab is waivable. */
  ssfOption?: boolean;
  /** A heading or note naming the fiscal year: "FY 2082/83 (example rates)". */
  fiscalYear?: ReactNode;
  /** Starting values (decimal strings in major units). */
  defaultValues?: { income?: string; status?: 'single' | 'couple'; ssf?: boolean; amounts?: Record<string, string>; rebates?: readonly string[] };
  /** Rounding of each band, a fraction cap and the monthly figure. Default 'half-up'. */
  rounding?: RoundingMode;
  /** Currency and locale. Default NPR, en-IN grouping, no currency mark. */
  money?: MoneyFormatConfig;
  /** Called with the result whenever it changes. */
  onResult?: (result: IncomeTaxCalculatorResult) => void;
  /** Field and result words, in the reader's language. */
  labels?: Partial<IncomeTaxCalculatorLabels>;
  /** Words of the band table. */
  breakdownLabels?: Partial<IncomeTaxBreakdownLabels>;
  /** Sets `data-testid` on the root; fields get `${testId}-income`, `${testId}-<field id>` and so on. */
  testId?: string;
}

const DEFAULT_RETIREMENT: readonly TaxDeductionField[] = [
  { id: 'ssf', label: 'SSF contribution' },
  { id: 'cit', label: 'CIT contribution' },
  { id: 'pf', label: 'Provident fund' },
];

export function IncomeTaxCalculator({
  slabs, retirement = DEFAULT_RETIREMENT, retirementRule, deductions = [], rebates = [], ssfOption, fiscalYear, defaultValues = {}, rounding = 'half-up',
  money = nepalLedgerMoney, onResult, labels, breakdownLabels, testId,
}: IncomeTaxCalculatorProps) {
  const words = { ...DEFAULT_INCOME_TAX_CALCULATOR_LABELS, ...labels };
  const uid = useId();
  const [income, setIncome] = useState(defaultValues.income ?? '');
  const [status, setStatus] = useState<'single' | 'couple'>(defaultValues.status ?? 'single');
  const [ssf, setSsf] = useState(defaultValues.ssf ?? false);
  const [amounts, setAmounts] = useState<Record<string, string>>(defaultValues.amounts ?? {});
  const [picked, setPicked] = useState<readonly string[]>(defaultValues.rebates ?? []);
  const exponent = currencyExponent(money.currency);
  const waivable = slabs.single.some((s) => s.waivable) || slabs.couple.some((s) => s.waivable);
  const showSsf = ssfOption ?? waivable;
  const result = useMemo<IncomeTaxCalculatorResult>(() => {
    const minor = (value: string | undefined) => {
      if (!value) return 0n;
      try { return parseMinorUnits(value, exponent); } catch { return 0n; }
    };
    const field = (f: TaxDeductionField) => ({ id: f.id, label: f.label, amount: minor(amounts[f.id]), ...(f.cap === undefined ? {} : { cap: f.cap }) });
    const ded = taxableIncome({ income: minor(income), retirement: retirement.map(field), ...(retirementRule ? { retirementRule } : {}), deductions: deductions.map(field), rounding });
    const tax = computeIncomeTax(ded.taxable, slabs[status], { rounding, waive: showSsf && ssf, rebates: rebates.filter((r) => picked.includes(r.id)) });
    return { status, deductions: ded, tax };
  }, [income, status, ssf, amounts, picked, slabs, retirement, retirementRule, deductions, rebates, rounding, showSsf, exponent]);
  useEffect(() => { onResult?.(result); }, [result, onResult]);
  const [announcement, setAnnouncement] = useState('');
  const formatter = getMoneyFormatter({ ...money, display: 'code' });
  const announce = () => setAnnouncement(words.announce(formatter.format(result.tax.tax)));
  const monthly = divideRounded(result.tax.tax, 12n, rounding);
  const show = (value: bigint, id: string) => <MoneyDisplay value={value} preset={money} testId={testId ? `${testId}-${id}` : undefined} />;
  const amountField = (f: TaxDeductionField) => (
    <CurrencyInput key={f.id} label={f.label} preset={money} value={amounts[f.id] ?? ''} size="md"
      hint={f.hint ?? (f.cap === undefined ? undefined : words.upTo(getMoneyFormatter({ ...money, display: 'none' }).format(f.cap)))}
      onValueChange={(change) => setAmounts((prev) => ({ ...prev, [f.id]: change.value }))} onBlur={announce} testId={testId ? `${testId}-${f.id}` : undefined} />
  );
  return (
    <div className="pu-itax" data-testid={testId}>
      <form className="pu-itax-form" onSubmit={(event) => { event.preventDefault(); announce(); }} aria-labelledby={fiscalYear ? `${uid}-fy` : undefined}>
        {fiscalYear && <p className="pu-itax-fy" id={`${uid}-fy`}>{fiscalYear}</p>}
        <CurrencyInput label={words.income} hint={words.incomeHint} preset={money} value={income} onValueChange={(change) => setIncome(change.value)} onBlur={announce} testId={testId ? `${testId}-income` : undefined} />
        <ChoiceGroup label={words.status} value={status} onChange={(next) => { setStatus(next); }} size="md" testId={`${testId ?? uid}-status`}
          options={[{ value: 'single', label: words.single }, { value: 'couple', label: words.couple }]} />
        {showSsf && <Checkbox checked={ssf} onChange={setSsf} testId={testId ? `${testId}-ssf-member` : undefined}>{words.ssf}</Checkbox>}
        {retirement.length > 0 && (
          <fieldset className="pu-itax-group">
            <legend>{words.retirement}</legend>
            <p className="pu-itax-hint">{words.retirementHint}</p>
            {retirement.map(amountField)}
          </fieldset>
        )}
        {deductions.length > 0 && (
          <fieldset className="pu-itax-group">
            <legend>{words.other}</legend>
            {deductions.map(amountField)}
          </fieldset>
        )}
        {rebates.length > 0 && rebates.map((rebate) => (
          <Checkbox key={rebate.id} checked={picked.includes(rebate.id)} onChange={(on) => setPicked((prev) => (on ? [...prev, rebate.id] : prev.filter((id) => id !== rebate.id)))} testId={testId ? `${testId}-rebate-${rebate.id}` : undefined}>
            {rebate.label}
          </Checkbox>
        ))}
      </form>
      <section className="pu-itax-result" aria-labelledby={`${uid}-r`}>
        <h3 className="kit-sr" id={`${uid}-r`}>{words.summary}</h3>
        <p className="pu-itax-headline"><span className="pu-itax-label">{words.tax}</span> {show(result.tax.tax, 'tax')}</p>
        <dl className="pu-itax-facts">
          <div><dt>{words.monthly}</dt><dd>{show(monthly, 'monthly')}</dd></div>
          <div><dt>{words.deductions}</dt><dd>{show(result.deductions.totalDeductions, 'deductions')}</dd></div>
          <div><dt>{words.taxable}</dt><dd>{show(result.deductions.taxable, 'taxable')}</dd></div>
          {result.tax.rebates.map((r) => <div key={r.label}><dt>{`${words.rebate}: ${r.label}`}</dt><dd>{show(-r.amount, `rebate-${r.label}`)}</dd></div>)}
          <div><dt>{words.effective}</dt><dd data-testid={testId ? `${testId}-effective` : undefined}>{result.tax.effectiveRate === null ? '—' : `${result.tax.effectiveRate.toFixed(2)}%`}</dd></div>
          <div><dt>{words.net}</dt><dd>{show(result.tax.net, 'net')}</dd></div>
        </dl>
        <IncomeTaxBreakdown result={result.tax} caption={words.breakdown} money={money} labels={breakdownLabels} testId={testId ? `${testId}-bands` : undefined} />
        <p className="kit-sr" role="status" aria-live="polite">{announcement}</p>
      </section>
    </div>
  );
}
