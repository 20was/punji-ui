import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AmountKeypad } from '@punji/ui/amount-keypad';
import { BillSummary, billTotal } from '@punji/ui/bill-summary';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ChipRow, SegmentedControl } from '@punji/ui/controls';
import { Field } from '@punji/ui/fields';
import { MobileNumberInput } from '@punji/ui/mobile-number-input';
import { formatNepalMobile, type NepalMobileResult } from '@punji/ui/nepal/mobile';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { BILLERS, PLANS, lookupBill, type LookupResult, type Service } from './bills.ts';
import { PinConfirm, WalletReceipt, useStepFocus } from './confirm.tsx';
import { cashbackFor, makePayment, paymentProblem, rs, npr, useWallet, type BillTab, type WalletTx } from './store.ts';

type Step = 'form' | 'pin' | 'done';

/** One biller: choose the counter or provider, enter the customer ID, see the bill, pay it with the PIN. */
function BillerFlow({ service }: { service: Service }) {
  const { state, dispatch } = useWallet();
  const biller = BILLERS[service];
  const [place, setPlace] = useState(biller.places[0]!.value);
  const [id, setId] = useState('');
  const [idError, setIdError] = useState<string | null>(null);
  const [query, setQuery] = useState<{ id: string; place: string } | null>(null);
  const [result, setResult] = useState<LookupResult | 'loading' | null>(null);
  const [plan, setPlan] = useState('1m');
  const [step, setStep] = useState<Step>('form');
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<WalletTx | null>(null);
  const ref = useStepFocus(step);

  // The biller gateway answers after a moment; offline it fails.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const lookup = (q: { id: string; place: string }, planId: string, paid: readonly string[]) => {
    clearTimeout(timer.current);
    setQuery(q);
    setResult('loading');
    const offline = state.offline;
    timer.current = setTimeout(() => setResult(offline ? { state: 'error', message: 'Could not reach the biller. You are offline.' } : lookupBill(service, q.id, paid, planId)), 600);
  };

  const fetchBill = (event: FormEvent) => {
    event.preventDefault();
    if (!id.trim()) return setIdError(`Enter your ${biller.idLabel.toLowerCase()}.`);
    setIdError(null);
    setProblem(null);
    lookup({ id: id.trim(), place }, plan, state.paidBills);
  };
  const bill = result && result !== 'loading' && result.state === 'ready' ? result.bill : null;
  const total = bill ? billTotal(bill.lines, bill.adjustments) : 0n;
  const placeLabel = biller.places.find((p) => p.value === place)?.label ?? '';
  const billerName = service === 'internet' ? placeLabel : biller.name;

  const toPin = () => {
    const p = paymentProblem(state, total);
    if (p) return setProblem(p);
    setProblem(null);
    setStep('pin');
  };
  const reset = (paid: readonly string[]) => {
    setStep('form');
    setDone(null);
    if (query) lookup(query, plan, paid);
  };

  if (step === 'pin' && bill && query)
    return (
      <div ref={ref}>
        <PinConfirm
          title={`Pay ${billerName}`}
          amount={total}
          facts={[
            { label: 'Customer', value: `${bill.customerName} · ${query.id}` },
            { label: 'For', value: bill.period },
            { label: 'Fee', value: rs(0n) },
            { label: 'Cashback', value: rs(cashbackFor('bill', total)) },
          ]}
          onCancel={() => setStep('form')}
          onConfirmed={() => {
            const tx = makePayment(state, { kind: 'bill', title: billerName, detail: `${bill.period} · ${query.id}`, amount: total, billKey: service === 'internet' ? undefined : `${service}:${query.id}` });
            dispatch({ type: 'pay', tx });
            setDone(tx);
            setStep('done');
          }}
        />
      </div>
    );
  if (step === 'done' && done)
    return (
      <div ref={ref}>
        <Card title="Bill paid" headingLevel={3}>
          <WalletReceipt tx={done} actions={<Button onClick={() => reset(state.paidBills)}>Back to the bill</Button>} />
        </Card>
      </div>
    );

  return (
    <div ref={ref} className="app-grid is-halves">
      <Card title={biller.name} headingLevel={3}>
        <form className="dw-form" onSubmit={fetchBill} noValidate>
          <Select label={biller.placeLabel} labelPlacement="above" value={place} onChange={setPlace} options={biller.places} block testId={`dw-${service}-place`} />
          <Field label={biller.idLabel} value={id} onChange={(v) => setId(v.slice(0, 24))} hint={biller.idHint} error={idError ?? undefined} autoComplete="off" testId={`dw-${service}-id`} />
          <Button type="submit" variant="secondary" loading={result === 'loading'} testId={`dw-${service}-fetch`}>
            Get bill
          </Button>
        </form>
      </Card>
      <div className="app-stack">
        {result === null ? (
          <Card title="Your bill" headingLevel={3}>
            <p className="app-muted">Enter your {biller.idLabel.toLowerCase()} to see what is due before you pay.</p>
          </Card>
        ) : (
          <>
            {service === 'internet' && result !== 'loading' && result.state === 'ready' && (
              <ChipRow options={PLANS.map((p) => ({ value: p.id, label: `${p.label.split(',')[0]} · ${rs(p.amount)}` }))} value={plan} onChange={(p) => {
                  setPlan(p);
                  if (query) lookup(query, p, state.paidBills);
                }}
                prefix="dw-plan" label="Plan" size="sm" wrap />
            )}
            <BillSummary
              biller={billerName}
              service={service === 'internet' ? 'Internet' : service === 'water' ? 'Water' : 'Electricity'}
              customerName={result !== 'loading' && result.state !== 'error' ? (result.state === 'ready' ? result.bill.customerName : result.customerName) : undefined}
              customerId={query?.id}
              period={bill?.period}
              lines={bill?.lines}
              adjustments={bill?.adjustments}
              dueDate={bill?.dueDate}
              calendar="bs"
              status={bill?.status}
              state={result === 'loading' ? 'loading' : result.state}
              errorMessage={result !== 'loading' && result.state === 'error' ? result.message : undefined}
              onRetry={() => query && lookup(query, plan, state.paidBills)}
              money={npr}
              action={
                <Button size="lg" onClick={toPin} disabled={state.locked} testId={`dw-${service}-pay`}>
                  Pay {rs(total)}
                </Button>
              }
              testId={`dw-${service}-bill`}
            />
            {problem && <Note tone="error">{problem}</Note>}
          </>
        )}
      </div>
    </div>
  );
}

/** Mobile top-up: the operator from the number, an amount, the PIN, a receipt. */
function TopUp() {
  const { state, dispatch } = useWallet();
  const [mobile, setMobile] = useState('');
  const [result, setResult] = useState<NepalMobileResult | null>(null);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [done, setDone] = useState<WalletTx | null>(null);
  const ref = useStepFocus(step);
  const operator = result?.state === 'valid' ? result.operator : null;

  const next = () => {
    if (!operator || !result) return setError('Enter a valid NTC, Ncell or SmartCell number.');
    if (amount === null || amount < 10_00n) return setError(`The smallest top-up is ${rs(10_00n)}.`);
    const p = paymentProblem(state, amount);
    if (p) return setError(p);
    setError(null);
    setStep('pin');
  };

  if (step === 'pin' && operator && result && amount !== null)
    return (
      <div ref={ref}>
        <PinConfirm
          title={`Top up ${formatNepalMobile(result.national)}`}
          amount={amount}
          verb="Top up"
          facts={[
            { label: 'Number', value: formatNepalMobile(result.national) },
            { label: 'Operator', value: operator.name },
            { label: 'Cashback', value: rs(cashbackFor('topup', amount)) },
          ]}
          onCancel={() => setStep('form')}
          onConfirmed={() => {
            const tx = makePayment(state, { kind: 'topup', title: `${operator.shortName} ${result.national}`, detail: 'Prepaid top-up', amount });
            dispatch({ type: 'pay', tx });
            setDone(tx);
            setStep('done');
          }}
        />
      </div>
    );
  if (step === 'done' && done)
    return (
      <div ref={ref}>
        <Card title="Topped up" headingLevel={3}>
          <WalletReceipt
            tx={done}
            actions={
              <Button
                onClick={() => {
                  setStep('form');
                  setDone(null);
                  setText('');
                  setAmount(null);
                }}
              >
                Another top-up
              </Button>
            }
          />
        </Card>
      </div>
    );

  return (
    <div ref={ref} className="dw-flow">
      <Card title="Mobile top-up" description="Prepaid balance for NTC, Ncell and SmartCell. 3% cashback up to Rs 30." headingLevel={3}>
        <div className="app-stack">
          <MobileNumberInput
            label="Mobile number"
            value={mobile}
            onValueChange={(r) => {
              setMobile(r.national);
              setResult(r);
              setError(null);
            }}
            hint="Your own number is 9802000021."
            testId="dw-topup-mobile"
          />
          <AmountKeypad
            label={operator ? `${operator.shortName} top-up amount` : 'Top-up amount'}
            preset={npr}
            value={text}
            onValueChange={(c) => {
              setText(c.value);
              setAmount(c.minorUnits);
              setError(null);
            }}
            quickAmounts={[100_00n, 200_00n, 500_00n, 1_000_00n]}
            max={5_000_00n}
            allowDecimal={false}
            hint="From Rs 10 to Rs 5,000."
            testId="dw-topup-amount"
          />
          {error && <Note tone="error">{error}</Note>}
          <Button size="lg" block onClick={next} disabled={state.locked} testId="dw-topup-next">
            {amount && operator ? `Top up ${rs(amount)}` : 'Continue'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Electricity, water and internet bills through a biller form and `BillSummary`, and mobile top-up. */
export default function BillsScreen() {
  const { billTab } = useWallet();
  const [tab, setTab] = useState<BillTab>(billTab);
  return (
    <div className="app-stack">
      <ScreenTitle>Bills and top-up</ScreenTitle>
      <SegmentedControl
        options={[
          { value: 'electricity', label: 'Electricity' },
          { value: 'water', label: 'Water' },
          { value: 'internet', label: 'Internet' },
          { value: 'topup', label: 'Top-up' },
        ]}
        value={tab}
        onChange={setTab}
        prefix="dw-bills"
        label="Pay"
        panelId="dw-bills-panel"
        wrap
        testId="dw-bills-tabs"
      />
      <div id="dw-bills-panel" role="tabpanel" aria-labelledby={`dw-bills-${tab}`}>
        {tab === 'topup' ? <TopUp /> : <BillerFlow key={tab} service={tab} />}
      </div>
    </div>
  );
}
