import { useState, type FormEvent } from 'react';
import { AmortisationTable } from '@punji/ui/amortisation-table';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { CurrencyInput } from '@punji/ui/currency-input';
import { DepositCalculator } from '@punji/ui/deposit-calculator';
import { FactList } from '@punji/ui/fact-list';
import { InlineConfirm } from '@punji/ui/inline-confirm';
import { InterestRateTable, type InterestRateRow } from '@punji/ui/interest-rate-table';
import { simulateDeposit } from '@punji/ui/lending';
import { LoanCalculator } from '@punji/ui/loan-calculator';
import { MeterBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { ACCOUNTS, LOAN, LOAN_EMI, LOAN_SCHEDULE, npr, rs, useBank, type AccountId } from './store.ts';

type Section = 'loan' | 'calculator' | 'deposits' | 'rates';

const RATES: InterestRateRow[] = [
  { id: 'sav', group: 'Savings', product: 'Premium Savings', ratePercent: '5.25', previousRatePercent: '5.50', effectiveFrom: '2026-10-18' },
  { id: 'remit', group: 'Savings', product: 'Remit Saver', ratePercent: '6.00', previousRatePercent: '6.00', effectiveFrom: '2026-07-17' },
  { id: 'fd3', group: 'Fixed deposits', product: '3 months', ratePercent: '6.75', previousRatePercent: '7.00', effectiveFrom: '2026-10-18' },
  { id: 'fd6', group: 'Fixed deposits', product: '6 months', ratePercent: '7.50', previousRatePercent: '7.75', effectiveFrom: '2026-10-18' },
  { id: 'fd12', group: 'Fixed deposits', product: '1 year', ratePercent: '8.50', previousRatePercent: '8.50', effectiveFrom: '2026-07-17' },
  { id: 'fd24', group: 'Fixed deposits', product: '2 years (offer)', ratePercent: '9.10', previousRatePercent: '8.75', effectiveFrom: '2026-10-25', note: 'Until Mangsir end' },
  { id: 'home', group: 'Loans', product: 'Home loan (base rate + 2%)', ratePercent: '10.25', previousRatePercent: '10.75', effectiveFrom: '2026-10-18' },
  { id: 'auto', group: 'Loans', product: 'Auto loan', ratePercent: '11.50', previousRatePercent: '11.75', effectiveFrom: '2026-10-18' },
];
const FD_TERMS: { value: string; label: string; months: number; rate: string }[] = [
  { value: '3', label: '3 months at 6.75%', months: 3, rate: '6.75' },
  { value: '6', label: '6 months at 7.50%', months: 6, rate: '7.50' },
  { value: '12', label: '1 year at 8.50%', months: 12, rate: '8.50' },
  { value: '24', label: '2 years at 9.10%', months: 24, rate: '9.10' },
];

function MyLoan() {
  const { state, dispatch, derived } = useBank();
  const [confirm, setConfirm] = useState(false);
  const paidPrincipal = LOAN.principal - derived.loanOutstanding;
  const interestPaid = LOAN_SCHEDULE.rows.slice(0, state.loanPaid).reduce((s, r) => s + r.interest, 0n);
  const percent = Number((paidPrincipal * 1000n) / LOAN.principal) / 10;
  const short = state.balances.savings < LOAN_EMI;
  return (
    <div className="app-stack">
      <Card title="Home loan" description={`${LOAN.ratePercent}% a year · ${LOAN.months / 12} years from ${LOAN.start}`} headingLevel={3} testId="rb-loan">
        <div className="app-stack">
          <p className="rb-hero-value rb-loan-figure">
            <MoneyDisplay value={derived.loanOutstanding} preset={npr} testId="rb-loan-outstanding" />
            <span className="app-muted app-small"> outstanding</span>
          </p>
          <MeterBar parts={[{ value: Number(paidPrincipal), tone: 'gain' }]} max={Number(LOAN.principal)} />
          <p className="app-small app-muted">
            {percent.toFixed(1)}% of {rs(LOAN.principal)} repaid · {state.loanPaid} of {LOAN.months} instalments
          </p>
          <FactList
            facts={[
              { label: 'Monthly EMI', value: <MoneyDisplay value={LOAN_EMI} preset={npr} testId="rb-loan-emi" /> },
              { label: 'Next EMI', value: '15 Nov 2026, from Premium Savings' },
              { label: 'Principal repaid', value: <MoneyDisplay value={paidPrincipal} preset={npr} /> },
              { label: 'Interest paid so far', value: <MoneyDisplay value={interestPaid} preset={npr} /> },
              { label: 'Interest over the whole loan', value: <MoneyDisplay value={LOAN_SCHEDULE.totalInterest} preset={npr} /> },
              { label: 'Loan account', value: `··${LOAN.number.slice(-4)}` },
            ]}
          />
          {confirm ? (
            <InlineConfirm
              title={`Pay ${rs(LOAN_EMI)} now?`}
              body={`It is taken from Premium Savings (${state.hideBalances ? 'balance hidden' : rs(state.balances.savings)}) and counts as instalment ${state.loanPaid + 1}.`}
              confirm="Pay EMI"
              cancel="Cancel"
              onConfirm={() => {
                setConfirm(false);
                dispatch({ type: 'pay-emi' });
              }}
              onCancel={() => setConfirm(false)}
              confirmTestId="rb-emi-confirm"
            />
          ) : (
            <div>
              <Button onClick={() => setConfirm(true)} disabled={short || state.offline || state.loanPaid >= LOAN.months} testId="rb-pay-emi">
                Pay this month&apos;s EMI early
              </Button>
              {short && <p className="app-small app-muted">Not enough in Premium Savings.</p>}
              {state.offline && <p className="app-small app-muted">Unavailable while offline.</p>}
            </div>
          )}
        </div>
      </Card>
      <Card title="Repayment schedule" description="Exact to the paisa; the EMI is rounded to the rupee and the last instalment takes the remainder" headingLevel={3} flush>
        <AmortisationTable schedule={LOAN_SCHEDULE} money={npr} defaultView="yearly" testId="rb-amortisation" />
      </Card>
    </div>
  );
}

function Deposits() {
  const { state, dispatch } = useBank();
  const [from, setFrom] = useState<AccountId>('savings');
  const [term, setTerm] = useState('12');
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const chosen = FD_TERMS.find((t) => t.value === term)!;
  const preview = amount && amount > 0n ? simulateDeposit({ principal: amount, months: chosen.months, ratePercent: chosen.rate, compounding: 'quarterly', tdsPercent: '6', rounding: 'half-even' }) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || amount < 10_000_00n) return setError(`The smallest deposit is ${rs(10_000_00n)}.`);
    if (amount > state.balances[from]) return setError(`That is more than the balance in ${ACCOUNTS.find((a) => a.id === from)!.name}.`);
    if (state.offline) return setError('You are offline. Try again when you are back online.');
    setError(null);
    setConfirm(true);
  };

  return (
    <div className="app-stack">
      <Card title="Your fixed deposits" headingLevel={3} testId="rb-deposits">
        <ul className="rb-deposit-list">
          {state.deposits.map((d) => {
            const r = simulateDeposit({ principal: d.principal, months: d.months, ratePercent: d.ratePercent, compounding: 'quarterly', tdsPercent: '6', rounding: 'half-even' });
            return (
              <li key={d.id}>
                <span>
                  <strong>{rs(d.principal)}</strong>
                  <span className="app-muted app-small">
                    {d.ratePercent}% · {d.months} months · {d.start} to {d.maturityDate}
                  </span>
                </span>
                <span className="rb-deposit-maturity">
                  <span className="app-muted app-small">At maturity, after 6% TDS</span>
                  <MoneyDisplay value={r.maturity} preset={npr} />
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card title="Open a fixed deposit" headingLevel={3}>
        <form className="rb-form" onSubmit={submit} noValidate>
          <Select label="From" labelPlacement="above" value={from} onChange={setFrom} block options={ACCOUNTS.filter((a) => a.id !== 'remit').map((a) => ({ value: a.id, label: `${a.name} · ${state.hideBalances ? 'balance hidden' : rs(state.balances[a.id])}` }))} />
          <Select label="Term" labelPlacement="above" value={term} onChange={setTerm} block options={FD_TERMS.map(({ value, label }) => ({ value, label }))} testId="rb-fd-term" />
          <CurrencyInput
            label="Amount"
            preset={npr}
            value={text}
            onValueChange={(c) => {
              setText(c.value);
              setAmount(c.minorUnits);
              setConfirm(false);
            }}
            hint={`From ${rs(10_000_00n)}. Interest is added every quarter; 6% TDS is withheld.`}
            error={error ?? undefined}
            testId="rb-fd-amount"
          />
          {preview && (
            <FactList
              facts={[
                { label: 'Gross interest', value: <MoneyDisplay value={preview.grossInterest} preset={npr} /> },
                { label: 'TDS (6%)', value: <MoneyDisplay value={preview.totalTds} preset={npr} /> },
                { label: 'You get at maturity', value: <MoneyDisplay value={preview.maturity} preset={npr} testId="rb-fd-maturity" /> },
              ]}
            />
          )}
          {confirm && amount !== null ? (
            <InlineConfirm
              title={`Move ${rs(amount)} into a ${chosen.label.split(' at')[0]} deposit?`}
              body="You can break it early, at a lower rate."
              confirm="Open deposit"
              cancel="Cancel"
              onConfirm={() => {
                dispatch({ type: 'open-fd', from, principal: amount, ratePercent: chosen.rate, months: chosen.months });
                setConfirm(false);
                setText('');
                setAmount(null);
              }}
              onCancel={() => setConfirm(false)}
              confirmTestId="rb-fd-confirm"
            />
          ) : (
            <Button type="submit" testId="rb-fd-open">
              Review deposit
            </Button>
          )}
        </form>
      </Card>
      <Card title="Deposit calculator" headingLevel={3}>
        <DepositCalculator defaultAmount="500000" defaultRatePercent="8.5" defaultMonths={12} defaultTdsPercent="6" money={npr} headingLevel={4} title="What a deposit earns" />
      </Card>
    </div>
  );
}

/** The home loan with its exact schedule and an early EMI, calculators, fixed deposits, and the bank's rates. */
export default function LoansScreen() {
  const [section, setSection] = useState<Section>('loan');
  return (
    <div className="app-stack">
      <ScreenTitle>Loans and deposits</ScreenTitle>
      <SegmentedControl
        options={[
          { value: 'loan', label: 'My loan' },
          { value: 'calculator', label: 'EMI calculator' },
          { value: 'deposits', label: 'Deposits' },
          { value: 'rates', label: 'Rates' },
        ]}
        value={section}
        onChange={setSection}
        prefix="rb-loans"
        label="Section"
        panelId="rb-loans-panel"
        wrap
        testId="rb-loans-tabs"
      />
      <div id="rb-loans-panel" role="tabpanel" aria-labelledby={`rb-loans-${section}`}>
        {section === 'loan' && <MyLoan />}
        {section === 'calculator' && (
          <Card title="EMI calculator" headingLevel={3}>
            <LoanCalculator defaultAmount="3000000" defaultRatePercent="11.5" defaultMonths={84} defaultTenureUnit="years" money={npr} headingLevel={4} title="Plan a loan" />
            <Note quiet>Illustrative. The bank&apos;s offer depends on its base rate, your income and the collateral.</Note>
          </Card>
        )}
        {section === 'deposits' && <Deposits />}
        {section === 'rates' && (
          <Card title="Interest rates" headingLevel={3} flush>
            <InterestRateTable rates={RATES} caption="Punji Bank interest rates (illustrative)" description="Changes from the last revision. Dates in Bikram Sambat." calendar="bs" />
          </Card>
        )}
      </div>
    </div>
  );
}
