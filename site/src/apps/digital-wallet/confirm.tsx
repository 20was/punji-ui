// Confirming money with the wallet PIN, and the receipt after. Shared by the flows that move money.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FactList, type Fact } from '@punji/ui/fact-list';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PaymentReceipt } from '@punji/ui/payment-receipt';
import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { PinPad } from '@punji/ui/pin-pad';
import { Note } from '@punji/ui/states';
import { DEMO_PIN, MAX_PIN_TRIES, OWNER, WALLET_ID, npr, rs, useWallet, type WalletTx } from './store.ts';

/** Move focus to a flow step's heading when it appears (not on the screen's first render). */
export function useStepFocus(step: string) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    const heading = ref.current?.querySelector<HTMLElement>('h3');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, [step]);
  return ref;
}

/**
 * The summary of what is about to happen and the PIN pad. The PIN goes from the pad to the check and is dropped; it
 * is never kept in state or written to the page. A wrong PIN remounts the pad with a new shuffled layout.
 */
export function PinConfirm({ title, amount, facts, onConfirmed, onCancel, verb = 'Pay' }: { title: string; amount: bigint; facts: Fact[]; onConfirmed: () => void; onCancel: () => void; verb?: string }) {
  const { state, dispatch } = useWallet();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const left = MAX_PIN_TRIES - state.pinTries;

  const check = (pin: string) => {
    if (state.offline) {
      setError('You are offline. Nothing was charged; try again when you are back online.');
      setAttempt((n) => n + 1);
      return;
    }
    // Demo only: your server checks the PIN. Here it is compared and forgotten.
    if (pin === DEMO_PIN) {
      dispatch({ type: 'pin-ok' });
      onConfirmed();
      return;
    }
    dispatch({ type: 'pin-fail' });
    setError(left - 1 > 0 ? `Wrong PIN. ${left - 1} ${left - 1 === 1 ? 'try' : 'tries'} left.` : 'Wrong PIN.');
    setAttempt((n) => n + 1);
  };

  return (
    <Card title={title} headingLevel={3}>
      <div className="app-stack dw-confirm">
        <p className="dw-confirm-amount">
          <MoneyDisplay value={amount} preset={npr} testId="dw-confirm-amount" />
        </p>
        <FactList facts={facts} testId="dw-confirm-facts" />
        {state.locked ? (
          <Note tone="error">Payments are locked after {MAX_PIN_TRIES} wrong PINs. In a real wallet you would reset the PIN with an OTP; reload the page to reset the demo.</Note>
        ) : (
          <PinPad
            key={attempt}
            label={`Enter your 4-digit PIN to ${verb.toLowerCase()} ${rs(amount)}`}
            onComplete={check}
            shuffle={attempt > 0}
            shuffleKey={attempt}
            hint="Demo PIN 2580. Never share your PIN, even with us."
            error={error ?? undefined}
            testId="dw-pin"
          />
        )}
        <Button variant="secondary" onClick={onCancel} block>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

/** The receipt of a finished payment, with its timeline. */
export function WalletReceipt({ tx, actions }: { tx: WalletTx; actions?: ReactNode }) {
  const out = tx.amount < 0n;
  return (
    <div className="app-stack">
      <PaymentReceipt
        amount={out ? -tx.amount : tx.amount}
        fees={0n}
        from={out ? { name: OWNER, institution: 'Punji Wallet', accountNumber: WALLET_ID } : { name: tx.title }}
        to={out ? { name: tx.title, institution: tx.detail } : { name: OWNER, institution: 'Punji Wallet', accountNumber: WALLET_ID }}
        reference={tx.reference}
        timestamp={tx.at}
        status={tx.status}
        printable
        headingLevel={3}
        testId="dw-receipt"
      />
      {tx.cashback ? <Note>You earned {rs(tx.cashback)} cashback on this payment; it is in your balance.</Note> : null}
      <PaymentTimeline steps={tx.steps} label="Payment progress" />
      {actions && <div className="dw-buttons">{actions}</div>}
    </div>
  );
}
