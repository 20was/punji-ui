import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { CurrencyInput } from '@punji/ui/currency-input';
import { FactList } from '@punji/ui/fact-list';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { allotUnits, projectLumpSum, projectSip, sipForGoal, type SipYear } from '@punji/ui/invest';
import { MeterBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { RiskMeter } from '@punji/ui/risk-meter';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { FUNDS, addMonths, fundById, latestNav, navText } from './data.ts';
import { Gain, ScrollRegion, dateText } from './bits.tsx';
import { navUnits, npr, nprPlain, orderSteps, rs, useInvest } from './store.ts';

const RS = 100n;
const MAX_ORDER = 10_00_000n * RS;
const YEARS = [1, 3, 5, 7, 10, 15, 20, 25, 30];
const RETURNS = ['6', '8', '10', '12', '14', '16'];
const STEP_UPS = ['0', '5', '10', '15', '20'];
const DAYS = [5, 10, 15, 25];
const plain = (paisa: bigint) => (paisa % RS === 0n ? String(paisa / RS) : `${paisa / RS}.${String(paisa % RS).padStart(2, '0')}`);

type Step = 'plan' | 'review' | 'status';

/** Plan a SIP or a lump sum, see the exact projection against a lump sum and a goal, then order and get units. */
export default function SipScreen() {
  const { state, dispatch, plan, go } = useInvest();
  const [fundId, setFundId] = useState(plan.fundId);
  const [kind, setKind] = useState<'sip' | 'lumpsum'>(plan.kind);
  const fund = fundById(fundId) ?? FUNDS[0]!;
  const initial = plan.monthly ?? (plan.kind === 'sip' ? 5_000n * RS : 50_000n * RS);
  const [amountText, setAmountText] = useState(plain(initial));
  const [amount, setAmount] = useState<bigint | null>(initial);
  const [years, setYears] = useState('10');
  const [ret, setRet] = useState('12');
  const [stepUp, setStepUp] = useState('10');
  const [goalText, setGoalText] = useState('');
  const [goal, setGoal] = useState<bigint | null>(null);
  const [day, setDay] = useState('5');
  const [calendar, setCalendar] = useState<'ad' | 'bs'>('bs');
  const [step, setStep] = useState<Step>('plan');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);
  const shown = useRef<Step>(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    const heading = stepRef.current?.querySelector<HTMLElement>('h3');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }, [step]);

  const months = Number(years) * 12;
  const sip = kind === 'sip';
  const min = sip ? fund.minSip : fund.minLumpSum;
  const error = amount === null || amount <= 0n ? 'Enter an amount.' : amount < min ? `The minimum for this fund is ${rs(min)}.` : amount > MAX_ORDER ? `Up to ${rs(MAX_ORDER)} an order here.` : undefined;
  const valid = !error && amount !== null;
  const projection = useMemo(() => (valid && sip ? projectSip({ monthly: amount!, months, annualReturnPercent: ret, stepUpPercent: stepUp, roundTo: RS, rounding: 'half-even' }) : null), [valid, sip, amount, months, ret, stepUp]);
  const lump = useMemo(() => (valid ? projectLumpSum({ amount: projection ? projection.invested : amount!, months, annualReturnPercent: ret, rounding: 'half-even' }) : null), [valid, projection, amount, months, ret]);
  const needed = useMemo(() => (goal && goal > 0n && sip ? sipForGoal({ goal, months, annualReturnPercent: ret, stepUpPercent: stepUp, roundTo: RS }) : null), [goal, sip, months, ret, stepUp]);
  const value = projection ? projection.value : lump?.value ?? 0n;
  const invested = projection ? projection.invested : amount ?? 0n;
  const estimate = valid ? allotUnits(amount!, navText(latestNav(fund.id))) : null;
  const firstNext = addMonths(`${SESSION_DATE.slice(0, 8)}${day.padStart(2, '0')}`, 1);
  const calendarRows = projection ? projection.instalments.slice(0, 12).map((instalment, i) => ({ id: String(i), date: i === 0 ? SESSION_DATE : addMonths(firstNext, i - 1), instalment })) : [];
  const order = orderId ? state.orders.find((o) => o.id === orderId) : undefined;
  const tx = order?.txId ? state.txs.find((t) => t.id === order.txId) : undefined;

  const columns: FinancialColumn<SipYear>[] = [
    { key: 'year', label: 'Year', rowHeader: true, render: (y) => `Year ${y.year}` },
    { key: 'value', label: 'Value (NPR)', num: true, render: (y) => <MoneyDisplay value={y.value} preset={nprPlain} /> },
    { key: 'instalment', label: 'Monthly', num: true, render: (y) => <MoneyDisplay value={y.instalment} preset={nprPlain} /> },
    { key: 'invested', label: 'Invested', num: true, render: (y) => <MoneyDisplay value={y.totalInvested} preset={nprPlain} /> },
  ];

  const place = () => {
    if (!valid) return;
    const id = `ORD-${String(state.counter).padStart(4, '0')}`;
    dispatch({ type: 'order', fundId: fund.id, kind, amount: amount!, day: sip ? Number(day) : undefined, stepUp: sip ? stepUp : undefined });
    setOrderId(id);
    setStep('status');
  };

  return (
    <div className="app-stack">
      <ScreenTitle aside={<SegmentedControl label="Kind of investment" prefix="ii-kind" value={kind} onChange={(k) => { setKind(k); setStep('plan'); }} options={[{ value: 'sip', label: 'Monthly SIP' }, { value: 'lumpsum', label: 'Lump sum' }]} />}>SIP planner</ScreenTitle>
      <div className="app-grid is-split" ref={stepRef}>
        {step === 'plan' && (
          <div className="app-stack">
            <Card title="Plan" headingLevel={3}>
              <form
                className="ii-form"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  setTried(true);
                  if (valid) setStep('review');
                }}
              >
                <Select label="Fund" labelPlacement="above" block value={fund.id} onChange={setFundId} options={FUNDS.map((f) => ({ value: f.id, label: f.name }))} testId="ii-plan-fund" />
                <RiskMeter level={fund.risk} variant="bar" />
                <CurrencyInput
                  label={sip ? 'Monthly amount' : 'Amount'}
                  preset={npr}
                  value={amountText}
                  onValueChange={(c) => {
                    setAmountText(c.value);
                    setAmount(c.minorUnits);
                  }}
                  hint={`Minimum ${rs(min)}`}
                  error={tried || amountText ? error : undefined}
                  testId="ii-amount"
                />
                <div className="ii-form-row">
                  <Select label="For" labelPlacement="above" block value={years} onChange={setYears} options={YEARS.map((y) => ({ value: String(y), label: `${y} year${y > 1 ? 's' : ''}` }))} testId="ii-years" />
                  <Select label="Expected return" labelPlacement="above" block value={ret} onChange={setRet} options={RETURNS.map((r) => ({ value: r, label: `${r}% a year` }))} testId="ii-return" />
                </div>
                {sip && (
                  <div className="ii-form-row">
                    <Select label="Step-up each year" labelPlacement="above" block value={stepUp} onChange={setStepUp} options={STEP_UPS.map((s) => ({ value: s, label: s === '0' ? 'None' : `${s}%` }))} testId="ii-stepup" />
                    <Select label="Debit on" labelPlacement="above" block value={day} onChange={setDay} options={DAYS.map((d) => ({ value: String(d), label: `Day ${d} of the month` }))} testId="ii-day" />
                  </div>
                )}
                {sip && (
                  <CurrencyInput
                    label="Goal (optional)"
                    preset={npr}
                    value={goalText}
                    onValueChange={(c) => {
                      setGoalText(c.value);
                      setGoal(c.minorUnits);
                    }}
                    hint="The amount you want at the end, such as a child's education."
                    testId="ii-goal"
                  />
                )}
                {needed !== null && goal !== null && (
                  <div className="ii-goal" data-testid="ii-goal-result">
                    <p className="ii-goal-line">
                      To reach {rs(goal)} in {years} years at {ret}%{stepUp !== '0' ? ` with a ${stepUp}% step-up` : ''}, invest <strong>{rs(needed)}</strong> a month.
                    </p>
                    <MeterBar parts={[{ value: Number(value > goal ? goal : value), tone: value >= goal ? 'gain' : 'chart' }]} max={Number(goal)} />
                    <p className="app-small app-muted">{valid ? (value >= goal ? 'Your plan reaches the goal.' : `Your plan reaches ${rs(value)}, ${rs(goal - value)} short.`) : 'Enter a monthly amount to compare.'}</p>
                    {amount !== needed && (
                      <Button size="sm" variant="secondary" onClick={() => { setAmount(needed); setAmountText(plain(needed)); }} testId="ii-use-needed">
                        Use {rs(needed)} a month
                      </Button>
                    )}
                  </div>
                )}
                <Button type="submit" testId="ii-review">Review order</Button>
              </form>
            </Card>
            {projection && (
              <Card title="Year by year" headingLevel={3}>
                <FinancialTable caption="Projected value by year, in NPR" columns={columns} rows={projection.years} rowKey={(y) => String(y.year)} emptyTitle="No years to show" />
              </Card>
            )}
          </div>
        )}
        {step === 'review' && valid && (
          <Card title="Review your order" headingLevel={3} testId="ii-review-card">
            <div className="app-stack">
              <p className="ii-big"><MoneyDisplay value={amount!} preset={npr} /> <span className="app-muted app-small">{sip ? 'a month' : 'once'}</span></p>
              <FactList
                facts={[
                  { label: 'Fund', value: fund.name },
                  { label: 'Type', value: sip ? `Monthly SIP${stepUp !== '0' ? `, ${stepUp}% step-up each year` : ''}` : 'Lump sum' },
                  { label: 'First debit', value: `Today, ${dateText(SESSION_DATE, calendar)}` },
                  ...(sip ? [{ label: 'Then', value: `Day ${day} of each month from ${dateText(firstNext, calendar)}` }] : []),
                  { label: 'From', value: 'Nabil Bank ••4521 (ConnectIPS mandate)' },
                  { label: 'Units (estimate)', value: `${estimate!.unitsText} at today's NAV ${navText(latestNav(fund.id))}` },
                ]}
              />
              <Note>Units are allotted at the NAV of the day the fund receives your money, before the 2 pm cut-off. The estimate uses the latest NAV.</Note>
              <div className="ii-buttons">
                <Button onClick={place} testId="ii-confirm">Confirm order</Button>
                <Button variant="ghost" onClick={() => setStep('plan')}>Back</Button>
              </div>
            </div>
          </Card>
        )}
        {step === 'status' && (
          <Card title={order?.stage === 'failed' ? 'Order failed' : order?.stage === 'allotted' ? 'Units allotted' : 'Order on its way'} headingLevel={3} testId="ii-order-status">
            {!order ? (
              <Note tone="error">The order could not be found. Check Portfolio for its status.</Note>
            ) : (
              <div className="app-stack">
                <PaymentTimeline steps={orderSteps(order)} label={`Order ${order.id} progress`} testId="ii-order-timeline" />
                {order.stage === 'failed' && (
                  <>
                    <Note tone="error">{order.error}</Note>
                    <div className="ii-buttons">
                      <Button onClick={() => setStep('review')} testId="ii-retry">Try again</Button>
                    </div>
                  </>
                )}
                {tx && (
                  <div data-testid="ii-allotment">
                    <FactList
                      facts={[
                        { label: 'Units allotted', value: <strong data-testid="ii-allot-units">{navUnits(tx.units)}</strong> },
                        { label: 'NAV applied', value: navText(tx.nav) },
                        { label: 'Amount', value: <MoneyDisplay value={tx.amount} preset={npr} /> },
                        { label: 'Carried to your next order', value: <MoneyDisplay value={tx.remainder} preset={npr} /> },
                        { label: 'Order', value: order.id },
                      ]}
                    />
                  </div>
                )}
                {order.stage === 'allotted' && (
                  <div className="ii-buttons">
                    <Button onClick={() => go('portfolio')} testId="ii-view-portfolio">View portfolio</Button>
                    <Button variant="ghost" onClick={() => { setStep('plan'); setOrderId(null); }}>New order</Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
        {step === 'review' && !valid && <Note tone="error">Check the amount and try again.</Note>}
        <div className="app-stack">
          <Card title="Projection" description={`At ${ret}% a year, compounded monthly. An illustration, not a promise.`} headingLevel={3} testId="ii-projection">
            {!valid ? (
              <p className="app-muted" data-testid="ii-projection-empty">Enter a valid amount to see the projection.</p>
            ) : (
              <div className="app-stack">
                <p className="ii-big" data-testid="ii-corpus"><MoneyDisplay value={value} preset={npr} /></p>
                <FactList
                  facts={[
                    { label: 'You invest', value: <MoneyDisplay value={invested} preset={npr} testId="ii-invested" /> },
                    { label: 'Estimated gain', value: <Gain value={value - invested} /> },
                    ...(projection && lump ? [{ label: `The same ${rs(invested)} as a lump sum today`, value: <MoneyDisplay value={lump.value} preset={npr} testId="ii-lump-value" /> }] : []),
                  ]}
                />
                {projection && lump && (
                  <div className="ii-compare" aria-hidden="true">
                    <span className="app-small">SIP</span>
                    <MeterBar parts={[{ value: Number(invested), tone: 'neutral' }, { value: Number(value - invested), tone: 'chart' }]} max={Number(lump.value > value ? lump.value : value)} />
                    <span className="app-small">Lump sum</span>
                    <MeterBar parts={[{ value: Number(invested), tone: 'neutral' }, { value: Number(lump.value - invested), tone: 'series2' }]} max={Number(lump.value > value ? lump.value : value)} />
                  </div>
                )}
                {projection && <p className="app-small app-muted">A lump sum earns for the whole term, so it ends higher when returns are steady; a SIP spreads the price you pay across the ups and downs.</p>}
              </div>
            )}
          </Card>
          {sip && (
            <Card
              title="SIP calendar"
              description="Your next 12 debits"
              headingLevel={3}
              action={<SegmentedControl label="Calendar" prefix="ii-cal" size="sm" value={calendar} onChange={setCalendar} options={[{ value: 'bs', label: 'BS' }, { value: 'ad', label: 'AD' }]} />}
            >
              {calendarRows.length === 0 ? (
                <p className="app-muted">Enter a valid amount to see the dates.</p>
              ) : (
                <ScrollRegion label="SIP calendar" testId="ii-calendar">
                  <table className="ii-table">
                    <caption className="kit-sr">Next 12 SIP debits, dates in {calendar === 'bs' ? 'Bikram Sambat' : 'AD'}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date ({calendar === 'bs' ? 'BS' : 'AD'})</th>
                        <th scope="col" className="num">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calendarRows.map((r) => (
                        <tr key={r.id}>
                          <th scope="row">
                            {dateText(r.date, calendar)}
                            {r.id === '0' && <span className="app-muted"> · today</span>}
                          </th>
                          <td className="num"><MoneyDisplay value={r.instalment} preset={npr} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollRegion>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
