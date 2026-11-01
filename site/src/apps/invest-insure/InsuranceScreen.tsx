import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { CurrencyInput } from '@punji/ui/currency-input';
import { FactList } from '@punji/ui/fact-list';
import { InsurancePremiumCard } from '@punji/ui/insurance-premium-card';
import { termCoverNeeded } from '@punji/ui/invest';
import { MeterBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle } from '../shared/kit.tsx';
import { premiumOf } from './data.ts';
import { dateText } from './bits.tsx';
import { ClaimsPanel } from './ClaimsPanel.tsx';
import { NomineesPanel } from './NomineesPanel.tsx';
import { daysUntil, lifeCoverOf, npr, portfolioOf, rs, useInvest } from './store.ts';

type View = 'policies' | 'cover' | 'claims' | 'nominees';
const RS = 100n;
const LAKH = 1_00_000n * RS;
const plain = (paisa: bigint) => String(paisa / RS);

/** Policies and premiums due, the cover gap, claims and nominees. */
export default function InsuranceScreen() {
  const { state } = useInvest();
  const [view, setView] = useState<View>('policies');
  const due = state.policies.filter((p) => daysUntil(p.graceUntil ?? p.nextDue) <= 30).length;
  return (
    <div className="app-stack">
      <ScreenTitle>Insurance</ScreenTitle>
      <SegmentedControl
        label="Insurance view"
        prefix="ii-ins"
        value={view}
        onChange={setView}
        wrap
        options={[
          { value: 'policies', label: 'Policies', count: due || undefined },
          { value: 'cover', label: 'Cover gap' },
          { value: 'claims', label: 'Claims' },
          { value: 'nominees', label: 'Nominees' },
        ]}
      />
      {view === 'policies' && <Policies />}
      {view === 'cover' && <CoverGap />}
      {view === 'claims' && <ClaimsPanel />}
      {view === 'nominees' && <NomineesPanel />}
    </div>
  );
}

function Policies() {
  const { state, dispatch } = useInvest();
  const [paying, setPaying] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const reminders = state.policies
    .map((p) => ({ p, days: daysUntil(p.nextDue), grace: p.graceUntil ? daysUntil(p.graceUntil) : null }))
    .filter((r) => r.days <= 30 || r.grace !== null)
    .toSorted((a, b) => a.days - b.days);
  const pay = (id: string) => {
    if (state.fail) {
      setFailed(id);
      setPaying(null);
      dispatch({ type: 'notice', text: 'The premium payment failed. Nothing was charged.' });
      return;
    }
    dispatch({ type: 'pay-premium', policyId: id });
    setFailed(null);
    setPaying(null);
  };
  return (
    <div className="app-grid is-split">
      <ul className="ii-policies" aria-label="Policies">
        {state.policies.map((p) => (
          <li key={p.id}>
            <InsurancePremiumCard
              plan={p.plan}
              insurer={p.insurer}
              policyNumber={p.policyNumber}
              status={p.status}
              frequency={p.frequency}
              breakdown={p.breakdown}
              nextDueDate={p.nextDue}
              nextDueLabel={`${dateText(p.nextDue, 'bs')} (${dateText(p.nextDue)})`}
              sumAssured={p.sumAssured}
              termYears={p.termYears > 1 ? p.termYears : undefined}
              testId={`ii-policy-${p.id}`}
              actions={
                paying === p.id ? (
                  <div className="ii-confirm-pay" role="group" aria-label={`Pay ${rs(premiumOf(p))} for ${p.plan}`}>
                    <span className="app-small">Pay {rs(premiumOf(p))} from Nabil Bank ••4521?</span>
                    <Button size="sm" onClick={() => pay(p.id)} testId={`ii-pay-confirm-${p.id}`}>Pay</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPaying(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    <Button size="sm" variant={p.status === 'grace' ? 'primary' : 'secondary'} onClick={() => setPaying(p.id)} testId={`ii-pay-${p.id}`}>Pay premium</Button>
                    {failed === p.id && <Note tone="error">The payment did not go through. Nothing was charged; try again.</Note>}
                  </>
                )
              }
            />
          </li>
        ))}
      </ul>
      <div className="app-stack">
        <Card title="Premiums due" description="Within 30 days, and any in a grace period" headingLevel={3} testId="ii-reminders">
          {reminders.length === 0 ? (
            <p className="app-muted">Nothing due in the next 30 days.</p>
          ) : (
            <ul className="ii-list">
              {reminders.map(({ p, days, grace }) => (
                <li key={p.id} className="ii-row">
                  <span className="ii-cell">
                    <strong>{p.plan}</strong>
                    <span className="app-small app-muted">
                      <MoneyDisplay value={premiumOf(p)} preset={npr} /> · {days < 0 ? `was due ${dateText(p.nextDue)}` : days === 0 ? 'due today' : `due in ${days} days, ${dateText(p.nextDue)}`}
                    </span>
                    {grace !== null && <span className="app-small">Grace period ends {dateText(p.graceUntil!)}: pay by then to keep the cover.</span>}
                  </span>
                  <StatusPill tone={grace !== null ? 'loss' : days <= 7 ? 'warn' : 'info'} size="sm">{grace !== null ? `${grace} days of grace` : days <= 7 ? 'Due soon' : 'Upcoming'}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {state.payments.length > 0 && (
          <Card title="Paid today" headingLevel={3}>
            <ul className="ii-list" data-testid="ii-premium-receipts">
              {state.payments.map((receipt) => (
                <li key={receipt.id} className="ii-row">
                  <span className="ii-cell">
                    <strong>{state.policies.find((p) => p.id === receipt.policyId)?.plan}</strong>
                    <span className="app-small app-muted">{receipt.id} · for the premium due {dateText(receipt.dueDate)}</span>
                  </span>
                  <MoneyDisplay value={receipt.amount} preset={npr} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function money(text: string, set: (t: string) => void, setMinor: (v: bigint | null) => void) {
  return {
    value: text,
    onValueChange: (c: { value: string; minorUnits: bigint | null }) => {
      set(c.value);
      setMinor(c.minorUnits);
    },
  };
}

/** Term life cover needed from income and liabilities, less savings (the portfolio) and cover held (the policies). */
function CoverGap() {
  const { state } = useInvest();
  const savingsNow = portfolioOf(state.txs).value;
  const coverNow = lifeCoverOf(state.policies);
  const [incomeText, setIncomeText] = useState('1800000');
  const [income, setIncome] = useState<bigint | null>(18n * LAKH);
  const [years, setYears] = useState('20');
  const [share, setShare] = useState('70');
  const [loansText, setLoansText] = useState('3500000');
  const [loans, setLoans] = useState<bigint | null>(35n * LAKH);
  const [goalsText, setGoalsText] = useState('2500000');
  const [goals, setGoals] = useState<bigint | null>(25n * LAKH);
  const [savingsText, setSavingsText] = useState(plain(savingsNow));
  const [savings, setSavings] = useState<bigint | null>(savingsNow);
  const r = income === null ? null : termCoverNeeded({ annualIncome: income, years: Number(years), incomeSharePercent: share, liabilities: loans ?? 0n, goals: goals ?? 0n, savings: savings ?? 0n, existingCover: coverNow, roundTo: LAKH });
  return (
    <div className="app-grid is-halves">
      <Card title="Your situation" headingLevel={3}>
        <form className="ii-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <CurrencyInput label="Yearly income" preset={npr} {...money(incomeText, setIncomeText, setIncome)} error={income === null ? 'Enter your yearly income.' : undefined} testId="ii-cover-income" />
          <div className="ii-form-row">
            <Select label="Years to replace" labelPlacement="above" block value={years} onChange={setYears} options={[5, 10, 15, 20, 25, 30].map((y) => ({ value: String(y), label: `${y} years` }))} />
            <Select label="Share the family needs" labelPlacement="above" block value={share} onChange={setShare} options={['50', '60', '70', '80', '100'].map((s) => ({ value: s, label: `${s}%` }))} />
          </div>
          <CurrencyInput label="Loans outstanding" preset={npr} {...money(loansText, setLoansText, setLoans)} hint="Home, vehicle and personal loans" />
          <CurrencyInput label="Goals to fund" preset={npr} {...money(goalsText, setGoalsText, setGoals)} hint="Children's education, a wedding" />
          <CurrencyInput label="Savings and investments" preset={npr} {...money(savingsText, setSavingsText, setSavings)} hint={`Your fund portfolio is worth ${rs(savingsNow)} today`} testId="ii-cover-savings" />
        </form>
      </Card>
      <Card title="Cover you need" headingLevel={3} testId="ii-cover-result">
        {!r ? (
          <p className="app-muted">Enter your yearly income to see the cover you need.</p>
        ) : (
          <div className="app-stack">
            <p className="ii-big" data-testid="ii-cover-gap"><MoneyDisplay value={r.gap} preset={npr} /></p>
            <p className="app-small app-muted">{r.covered ? 'What you hold already covers the need.' : 'More term life cover to buy, rounded up to the next lakh.'}</p>
            <FactList
              facts={[
                { label: `Income for ${years} years at ${share}%`, value: <MoneyDisplay value={r.incomeNeed} preset={npr} /> },
                { label: 'Loans and goals', value: <MoneyDisplay value={(loans ?? 0n) + (goals ?? 0n)} preset={npr} /> },
                { label: 'Total need', value: <MoneyDisplay value={r.totalNeed} preset={npr} /> },
                { label: 'Less savings', value: <MoneyDisplay value={-(savings ?? 0n)} preset={npr} /> },
                { label: 'Less life cover held', value: <MoneyDisplay value={-coverNow} preset={npr} testId="ii-cover-held" /> },
              ]}
            />
            <MeterBar parts={[{ value: Number(r.available > r.totalNeed ? r.totalNeed : r.available), tone: 'gain' }]} max={Number(r.totalNeed || 1n)} label={`Held ${rs(r.available)} of ${rs(r.totalNeed)} needed`} />
            <Note>Income replacement: a starting point for a conversation with an adviser, not underwriting. Health cover is not counted.</Note>
          </div>
        )}
      </Card>
    </div>
  );
}
