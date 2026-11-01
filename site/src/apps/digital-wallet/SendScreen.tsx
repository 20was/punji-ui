import { useEffect, useRef, useState } from 'react';
import { AmountKeypad } from '@punji/ui/amount-keypad';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { Chip } from '@punji/ui/controls';
import { Field } from '@punji/ui/fields';
import { MobileNumberInput } from '@punji/ui/mobile-number-input';
import { formatNepalMobile, type NepalMobileResult } from '@punji/ui/nepal/mobile';
import { Select } from '@punji/ui/select';
import { Note, Skeleton } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { PinConfirm, WalletReceipt, useStepFocus } from './confirm.tsx';
import { LIMITS, makePayment, npr, paymentProblem, rs, useWallet, type WalletTx } from './store.ts';

/** Wallet users this demo knows, by national number. Anyone else is "not registered". */
const DIRECTORY: Readonly<Record<string, string>> = {
  '9801234567': 'Hari Bahadur Khatri',
  '9841234567': 'Anita Gurung',
  '9761112233': 'Bikash Shrestha',
  '9851098765': 'Maya Tamang',
};
const RECENT = ['9801234567', '9841234567', '9761112233'];
const PURPOSES = ['Personal use', 'Family support', 'Bill sharing', 'Gift', 'Loan repayment'];

type Lookup = { state: 'idle' } | { state: 'checking' } | { state: 'found'; name: string } | { state: 'missing' } | { state: 'error' };

/** Send to a mobile number: the receiver's registered name, amount, purpose, then the PIN and a receipt. */
export default function SendScreen() {
  const { state, dispatch } = useWallet();
  const [step, setStep] = useState<'details' | 'pin' | 'done'>('details');
  const [mobile, setMobile] = useState('');
  const [result, setResult] = useState<NepalMobileResult | null>(null);
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [purpose, setPurpose] = useState(PURPOSES[0]!);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<WalletTx | null>(null);
  const ref = useStepFocus(step);
  const national = result?.state === 'valid' ? result.national : null;

  // Look the number up once it is a whole, valid number (the wallet's directory; offline it fails).
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const lookUp = (number: string | null) => {
    clearTimeout(timer.current);
    if (!number) {
      setLookup({ state: 'idle' });
      return;
    }
    setLookup({ state: 'checking' });
    const offline = state.offline;
    timer.current = setTimeout(() => {
      if (offline) setLookup({ state: 'error' });
      else setLookup(DIRECTORY[number] ? { state: 'found', name: DIRECTORY[number]! } : { state: 'missing' });
    }, 500);
  };
  const choose = (r: NepalMobileResult) => {
    const before = result?.state === 'valid' ? result.national : null;
    const after = r.state === 'valid' ? r.national : null;
    setMobile(r.national);
    setResult(r);
    setError(null);
    if (after !== before) lookUp(after);
  };
  const pick = (number: string) => choose({ state: 'valid', national: number, e164: `+977${number}`, operator: null, reason: null });
  const toPin = () => {
    if (lookup.state !== 'found') return setError('Enter the mobile number of someone with a wallet.');
    const problem = paymentProblem(state, amount);
    if (problem) return setError(problem);
    setError(null);
    setStep('pin');
  };
  const reset = () => {
    setStep('details');
    setMobile('');
    setResult(null);
    setLookup({ state: 'idle' });
    setText('');
    setAmount(null);
    setRemark('');
    setDone(null);
  };

  return (
    <div className="app-stack">
      <ScreenTitle>Send money</ScreenTitle>
      <div ref={ref} className="dw-flow">
        {step === 'details' && (
          <Card title="Send to a mobile number" headingLevel={3}>
            <div className="app-stack">
              <div className="dw-chips" role="group" aria-label="Recent">
                {RECENT.map((n) => (
                  <Chip key={n} size="sm" selected={national === n} onClick={() => pick(n)} testId={`dw-recent-${n}`}>
                    {DIRECTORY[n]!.split(' ')[0]} · {formatNepalMobile(n)}
                  </Chip>
                ))}
              </div>
              <MobileNumberInput
                label="Mobile number"
                value={mobile}
                onValueChange={choose}
                hint="Try 9841234567, or 9841000000 for a number with no wallet."
                testId="dw-send-mobile"
              />
              <div className="dw-lookup" aria-live="polite" data-testid="dw-lookup">
                {lookup.state === 'checking' && (
                  <span className="dw-lookup-row">
                    <Skeleton width={160} height={14} />
                    <span className="kit-sr">Finding the wallet</span>
                  </span>
                )}
                {lookup.state === 'found' && (
                  <span className="dw-lookup-row" data-state="found">
                    <span className="dw-avatar" aria-hidden="true">
                      {lookup.name
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span>
                      <strong>{lookup.name}</strong>
                      <span className="app-muted app-small"> · registered name</span>
                    </span>
                  </span>
                )}
                {lookup.state === 'missing' && <Note tone="warn">No wallet is registered to this number. Ask them to sign up, or send to their bank account.</Note>}
                {lookup.state === 'error' && <Note tone="error">Could not look the number up. You are offline.</Note>}
              </div>
              <AmountKeypad
                label="Amount"
                preset={npr}
                value={text}
                onValueChange={(c) => {
                  setText(c.value);
                  setAmount(c.minorUnits);
                  setError(null);
                }}
                quickAmounts={[500_00n, 1_000_00n, 2_000_00n, 5_000_00n]}
                max={state.balance < LIMITS.perPayment ? state.balance : LIMITS.perPayment}
                hint={state.hideBalance ? 'Free to any wallet.' : `Balance ${rs(state.balance)}. Free to any wallet.`}
                testId="dw-send-amount"
              />
              <Select label="Purpose" labelPlacement="above" value={purpose} onChange={setPurpose} options={PURPOSES.map((p) => ({ value: p, label: p }))} block />
              <Field label="Remark (optional)" value={remark} onChange={(v) => setRemark(v.slice(0, 40))} hint="The receiver sees it." testId="dw-send-remark" />
              {error && <Note tone="error">{error}</Note>}
              <Button size="lg" block onClick={toPin} disabled={state.locked} testId="dw-send-next">
                {amount && lookup.state === 'found' ? `Send ${rs(amount)} to ${lookup.name.split(' ')[0]}` : 'Continue'}
              </Button>
            </div>
          </Card>
        )}
        {step === 'pin' && amount !== null && lookup.state === 'found' && national && (
          <PinConfirm
            title={`Send to ${lookup.name}`}
            amount={amount}
            verb="Send"
            facts={[
              { label: 'To', value: `${lookup.name} · ${formatNepalMobile(national)}` },
              { label: 'Purpose', value: purpose },
              ...(remark.trim() ? [{ label: 'Remark', value: remark.trim() }] : []),
              { label: 'Fee', value: rs(0n) },
              { label: 'Balance after', value: state.hideBalance ? 'Hidden' : rs(state.balance - amount) },
            ]}
            onCancel={() => setStep('details')}
            onConfirmed={() => {
              const tx = makePayment(state, { kind: 'send', title: lookup.name, detail: remark.trim() || purpose, amount });
              dispatch({ type: 'pay', tx });
              setDone(tx);
              setStep('done');
            }}
          />
        )}
        {step === 'done' && done && (
          <Card title="Sent" headingLevel={3}>
            <WalletReceipt tx={done} actions={<Button onClick={reset}>Send again</Button>} />
          </Card>
        )}
      </div>
    </div>
  );
}
