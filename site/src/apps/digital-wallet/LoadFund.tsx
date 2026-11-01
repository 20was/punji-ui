import { useState } from 'react';
import { AmountKeypad } from '@punji/ui/amount-keypad';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { Select } from '@punji/ui/select';
import { TransactionStatus } from '@punji/ui/transaction-status';
import { PinConfirm, useStepFocus } from './confirm.tsx';
import { LIMITS, LINKED_BANKS, makeLoad, npr, rs, useWallet } from './store.ts';

const QUICK = [1_000_00n, 2_000_00n, 5_000_00n, 10_000_00n];

/** Load money from a linked bank: amount, PIN, then the entry's live timeline until the bank's money arrives. */
export default function LoadFund({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useWallet();
  const [step, setStep] = useState<'amount' | 'pin' | 'done'>('amount');
  const [bank, setBank] = useState<string>(LINKED_BANKS[0].id);
  const [text, setText] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const ref = useStepFocus(step);
  const room = LIMITS.maxBalance - state.balance;
  const chosen = LINKED_BANKS.find((b) => b.id === bank)!;
  const live = state.txs.find((t) => t.id === txId);

  const next = () => {
    if (amount === null || amount <= 0n) return setError('Enter an amount above zero.');
    if (amount < 10_00n) return setError(`The smallest load is ${rs(10_00n)}.`);
    if (amount > room) return setError(`Your wallet can hold ${rs(LIMITS.maxBalance)}; you can load up to ${rs(room)}.`);
    setError(null);
    setStep('pin');
  };

  return (
    <div ref={ref} className="dw-panel">
      {step === 'amount' && (
        <Card title="Load money" description="From a bank account linked to your wallet" headingLevel={3}>
          <div className="app-stack">
            <Select label="From" labelPlacement="above" value={bank} onChange={setBank} options={LINKED_BANKS.map((b) => ({ value: b.id, label: `${b.bank} ··${b.accountNumber.slice(-4)}` }))} block testId="dw-load-bank" />
            <AmountKeypad
              label="Amount to load"
              preset={npr}
              value={text}
              onValueChange={(c) => {
                setText(c.value);
                setAmount(c.minorUnits);
                setError(null);
              }}
              quickAmounts={QUICK}
              max={room > 0n ? room : 0n}
              hint={`No fee. You can load up to ${rs(room > 0n ? room : 0n)}.`}
              error={error ?? undefined}
              testId="dw-load-amount"
            />
            <Button size="lg" block onClick={next} testId="dw-load-next">
              Continue
            </Button>
          </div>
        </Card>
      )}
      {step === 'pin' && amount !== null && (
        <PinConfirm
          title="Confirm the load"
          amount={amount}
          verb="Load"
          facts={[
            { label: 'From', value: `${chosen.bank} ··${chosen.accountNumber.slice(-4)}` },
            { label: 'To', value: 'Your wallet' },
            { label: 'Fee', value: rs(0n) },
          ]}
          onCancel={() => setStep('amount')}
          onConfirmed={() => {
            const tx = makeLoad(state, bank, amount);
            dispatch({ type: 'load', tx });
            setTxId(tx.id);
            setStep('done');
          }}
        />
      )}
      {step === 'done' && live && (
        <Card title={live.status === 'completed' ? 'Money loaded' : 'Loading your money'} headingLevel={3} action={<TransactionStatus status={live.status} />} testId="dw-load-done">
          <div className="app-stack">
            <p className="dw-confirm-amount">{rs(live.amount)}</p>
            <PaymentTimeline steps={live.steps} label="Load progress" />
            <Button variant="secondary" onClick={onDone}>
              Done
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
