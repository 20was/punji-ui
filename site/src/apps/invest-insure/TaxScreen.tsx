import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { CurrencyInput } from '@punji/ui/currency-input';
import { FinancialSummary } from '@punji/ui/financial';
import { IncomeTaxBreakdown } from '@punji/ui/income-tax-calculator';
import { MeterBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Note } from '@punji/ui/states';
import { computeIncomeTax, taxableIncome, type TaxSlab } from '@punji/ui/tax';
import { ScreenTitle } from '../shared/kit.tsx';
import { FUNDS } from './data.ts';
import { dateText } from './bits.tsx';
import { npr, retirementThisYear, rs, useInvest, yearlyPremiums } from './store.ts';

// EXAMPLE caps and slabs in the shape of Nepal's FY 2081/82 rules for a resident individual (docs/TAX.md). They show
// the data, not current law: take the slabs and caps from the Finance Act for the year you show.
const RS = 100n;
const LAKH = 1_00_000n * RS;
export const TAX_EXAMPLE = {
  retirementCap: 5n * LAKH,
  retirementFraction: { numerator: 1n, denominator: 3n },
  lifeCap: 40_000n * RS,
  healthCap: 20_000n * RS,
  single: [
    { width: 5n * LAKH, rate: '0.01', label: 'First 5 lakh (social security tax)', waivable: true },
    { width: 2n * LAKH, rate: '0.1' },
    { width: 3n * LAKH, rate: '0.2' },
    { width: 10n * LAKH, rate: '0.3' },
    { width: 30n * LAKH, rate: '0.36' },
    { width: null, rate: '0.39' },
  ] as TaxSlab[],
  couple: [
    { width: 6n * LAKH, rate: '0.01', label: 'First 6 lakh (social security tax)', waivable: true },
    { width: 2n * LAKH, rate: '0.1' },
    { width: 3n * LAKH, rate: '0.2' },
    { width: 9n * LAKH, rate: '0.3' },
    { width: 30n * LAKH, rate: '0.36' },
    { width: null, rate: '0.39' },
  ] as TaxSlab[],
};

/** Investments that reduce taxable income: retirement fund SIPs and CIT, life and health premiums, against the caps. */
export default function TaxScreen() {
  const { state, invest } = useInvest();
  const [incomeText, setIncomeText] = useState('1800000');
  const [income, setIncome] = useState<bigint | null>(18n * LAKH);
  const [citText, setCitText] = useState('120000');
  const [cit, setCit] = useState<bigint | null>(1_20_000n * RS);
  const [status, setStatus] = useState<'single' | 'couple'>('single');
  const retirement = retirementThisYear(state);
  const premiums = yearlyPremiums(state.policies);
  const slabs = TAX_EXAMPLE[status];

  const figures = useMemo(() => {
    if (income === null) return null;
    const allowed = taxableIncome({
      income,
      retirement: [
        { id: 'cit', label: 'Citizen Investment Trust (through salary)', amount: cit ?? 0n },
        { id: 'fund', label: 'Retirement fund SIP', amount: retirement.total },
      ],
      retirementRule: { cap: TAX_EXAMPLE.retirementCap, fraction: TAX_EXAMPLE.retirementFraction },
      deductions: [
        { id: 'life', label: 'Life insurance premium', amount: premiums.life, cap: TAX_EXAMPLE.lifeCap },
        { id: 'health', label: 'Health insurance premium', amount: premiums.health, cap: TAX_EXAMPLE.healthCap },
      ],
      rounding: 'floor',
    });
    const withSaving = computeIncomeTax(allowed.taxable, slabs, { rounding: 'half-up' });
    const without = computeIncomeTax(income, slabs, { rounding: 'half-up' });
    const limit = (() => {
      const third = (income * TAX_EXAMPLE.retirementFraction.numerator) / TAX_EXAMPLE.retirementFraction.denominator;
      return third < TAX_EXAMPLE.retirementCap ? third : TAX_EXAMPLE.retirementCap;
    })();
    const room = limit > allowed.retirementPaid ? limit - allowed.retirementPaid : 0n;
    return { allowed, withSaving, without, saved: without.tax - withSaving.tax, limit, room };
  }, [income, cit, retirement.total, premiums.life, premiums.health, slabs]);
  const retirementFund = FUNDS.find((f) => f.taxSaving)!;
  const monthsLeft = retirement.monthsLeft;
  const topUp = figures && figures.room > 0n && monthsLeft > 0 ? ((figures.room / BigInt(monthsLeft) + RS - 1n) / RS) * RS : 0n;

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-muted app-small">FY {retirement.fy.label}: {dateText(retirement.fy.start)} to {dateText(retirement.fy.end)}</span>}>Tax saving</ScreenTitle>
      <Note tone="warn">Example caps and slabs in the shape of FY 2081/82 rules, to show the working, not tax advice. Check the Finance Act for the year you file.</Note>
      <div className="app-grid is-split">
        <div className="app-stack">
          <Card title="Your income" headingLevel={3}>
            <form className="ii-form" noValidate onSubmit={(e) => e.preventDefault()}>
              <CurrencyInput label="Yearly income" preset={npr} value={incomeText} onValueChange={(c) => { setIncomeText(c.value); setIncome(c.minorUnits); }} error={income === null ? 'Enter your yearly income.' : undefined} testId="ii-tax-income" />
              <CurrencyInput label="CIT deducted from salary this year" preset={npr} value={citText} onValueChange={(c) => { setCitText(c.value); setCit(c.minorUnits); }} testId="ii-tax-cit" />
              <SegmentedControl label="Assessed as" prefix="ii-tax-status" value={status} onChange={setStatus} options={[{ value: 'single', label: 'Single' }, { value: 'couple', label: 'Couple' }]} />
            </form>
          </Card>
          {figures ? (
            <>
              <div className="app-summary">
                <FinancialSummary
                  label="Tax this year"
                  metrics={[
                    { id: 'deductions', label: 'Deductions allowed', value: <MoneyDisplay value={figures.allowed.totalDeductions} preset={npr} testId="ii-tax-deductions" /> },
                    { id: 'taxable', label: 'Taxable income', value: <MoneyDisplay value={figures.allowed.taxable} preset={npr} /> },
                    { id: 'tax', label: 'Tax', value: <MoneyDisplay value={figures.withSaving.tax} preset={npr} testId="ii-tax-tax" /> },
                    { id: 'saved', label: 'Tax saved', value: <MoneyDisplay value={figures.saved} preset={npr} testId="ii-tax-saved" />, note: `against ${rs(figures.without.tax)} without them` },
                  ]}
                />
              </div>
              <Card title="Tax by band" headingLevel={3}>
                <IncomeTaxBreakdown result={figures.withSaving} caption="Tax on taxable income after deductions" money={npr} hideEmpty testId="ii-tax-bands" />
              </Card>
            </>
          ) : (
            <p className="app-muted">Enter your yearly income to see the tax.</p>
          )}
        </div>
        <div className="app-stack">
          <Card title="What reduces your taxable income" headingLevel={3} testId="ii-tax-sources">
            {!figures ? (
              <p className="app-muted">Enter your yearly income first.</p>
            ) : (
              <div className="app-stack">
                <div className="ii-ded">
                  <p className="ii-ded-head">
                    <strong>Retirement contributions</strong>
                    <span><MoneyDisplay value={figures.allowed.retirementAllowed} preset={npr} /> of {rs(figures.limit)}</span>
                  </p>
                  <MeterBar parts={[{ value: Number(figures.allowed.retirementAllowed), tone: 'chart' }]} max={Number(figures.limit || 1n)} />
                  <p className="app-small app-muted">
                    CIT {rs(cit ?? 0n)} + {retirementFund.name}: {rs(retirement.paid)} paid since Shrawan and {rs(retirement.planned)} still to come from your SIP (<span data-testid="ii-tax-fund">{rs(retirement.total)}</span> this year). Capped at the lower of {rs(TAX_EXAMPLE.retirementCap)} and a third of income.
                  </p>
                </div>
                <div className="ii-ded">
                  <p className="ii-ded-head">
                    <strong>Life insurance premium</strong>
                    <span><MoneyDisplay value={figures.allowed.deductions[0]!.allowed} preset={npr} /> of {rs(TAX_EXAMPLE.lifeCap)}</span>
                  </p>
                  <MeterBar parts={[{ value: Number(figures.allowed.deductions[0]!.allowed), tone: 'chart' }]} max={Number(TAX_EXAMPLE.lifeCap)} />
                  <p className="app-small app-muted">Premiums for a year of your life policies: {rs(premiums.life)}{premiums.life > TAX_EXAMPLE.lifeCap ? `; only ${rs(TAX_EXAMPLE.lifeCap)} counts` : ''}.</p>
                </div>
                <div className="ii-ded">
                  <p className="ii-ded-head">
                    <strong>Health insurance premium</strong>
                    <span><MoneyDisplay value={figures.allowed.deductions[1]!.allowed} preset={npr} /> of {rs(TAX_EXAMPLE.healthCap)}</span>
                  </p>
                  <MeterBar parts={[{ value: Number(figures.allowed.deductions[1]!.allowed), tone: 'chart' }]} max={Number(TAX_EXAMPLE.healthCap)} />
                  <p className="app-small app-muted">Your health policy&apos;s yearly premium: {rs(premiums.health)}.</p>
                </div>
              </div>
            )}
          </Card>
          {figures && figures.room > 0n && (
            <Card title="Room left this year" headingLevel={3} testId="ii-tax-room">
              <div className="app-stack">
                <p>
                  You can still put <strong>{rs(figures.room)}</strong> into retirement savings this year and deduct it.
                  {topUp > 0n ? ` Spread over the ${monthsLeft} SIP dates left in ${retirementFund.name}, that is about ${rs(topUp)} a month.` : ''}
                </p>
                {topUp > 0n && (
                  <Button variant="secondary" onClick={() => invest(retirementFund.id, 'sip', topUp)} testId="ii-tax-topup">
                    Start this SIP
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
