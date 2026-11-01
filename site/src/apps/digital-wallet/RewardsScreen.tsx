import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { InlineConfirm } from '@punji/ui/inline-confirm';
import { MeterBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Select } from '@punji/ui/select';
import { Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { TxRow } from './rows.tsx';
import { npr, rs, useWallet } from './store.ts';

const TIERS = [
  { name: 'Silver', from: 0 },
  { name: 'Gold', from: 2_000 },
  { name: 'Platinum', from: 5_000 },
];
const OFFERS = [
  { id: 'bills', title: '2% back on bills', body: 'Electricity, water and internet. Up to Rs 50 a bill.', go: 'bills' as const },
  { id: 'topup', title: '3% back on top-ups', body: 'NTC, Ncell and SmartCell prepaid. Up to Rs 30 each.', go: 'bills' as const },
  { id: 'qr', title: '1% back on QR payments', body: 'Any NepalPay QR merchant. Up to Rs 20 a payment.', go: 'scan' as const },
];

/** Cashback earned, reward points with the tier they reach, offers, and redeeming points into the balance. */
export default function RewardsScreen() {
  const { state, dispatch, go } = useWallet();
  const [redeem, setRedeem] = useState('500');
  const [confirm, setConfirm] = useState(false);
  const cashback = state.txs.filter((t) => t.kind === 'cashback' && t.status === 'completed');
  const earned = cashback.reduce((s, t) => s + t.amount, 0n);
  const tierIndex = TIERS.findLastIndex((t) => state.points >= t.from);
  const tier = TIERS[tierIndex]!;
  const nextTier = TIERS[tierIndex + 1];
  const options = [500, 1000, 1500].filter((p) => p <= state.points);
  const points = options.includes(Number(redeem)) ? Number(redeem) : (options[0] ?? 0);
  const value = BigInt(points / 10) * 100n;

  return (
    <div className="app-stack">
      <ScreenTitle>Rewards</ScreenTitle>
      <div className="app-grid is-halves">
        <Card title="Your points" headingLevel={3} testId="dw-points">
          <div className="app-stack">
            <p className="dw-confirm-amount">
              {state.points.toLocaleString('en-IN')} <span className="app-muted app-small">points · {tier.name}</span>
            </p>
            {nextTier ? (
              <>
                <MeterBar parts={[{ value: state.points - tier.from, tone: 'gain' }]} max={nextTier.from - tier.from} />
                <p className="app-small app-muted">
                  {(nextTier.from - state.points).toLocaleString('en-IN')} points to {nextTier.name}. You earn a point for every Rs 10 you pay.
                </p>
              </>
            ) : (
              <p className="app-small app-muted">The top tier. Thank you.</p>
            )}
            {options.length === 0 ? (
              <Note>Redeem from 500 points (Rs 50).</Note>
            ) : confirm ? (
              <InlineConfirm
                title={`Redeem ${points} points for ${rs(value)}?`}
                body="The money goes into your wallet balance at once."
                confirm="Redeem"
                cancel="Cancel"
                onConfirm={() => {
                  dispatch({ type: 'redeem', points });
                  setConfirm(false);
                  setRedeem('500');
                }}
                onCancel={() => setConfirm(false)}
                confirmTestId="dw-redeem-confirm"
              />
            ) : (
              <div className="dw-redeem">
                <Select label="Redeem" labelPlacement="above" value={String(points)} onChange={setRedeem} options={options.map((p) => ({ value: String(p), label: `${p} points for ${rs(BigInt(p / 10) * 100n)}` }))} testId="dw-redeem-points" />
                <Button variant="secondary" onClick={() => setConfirm(true)} testId="dw-redeem">
                  Redeem
                </Button>
              </div>
            )}
          </div>
        </Card>
        <Card title="Cashback" description="Added to your balance as you pay" headingLevel={3} testId="dw-cashback">
          <p className="dw-confirm-amount">
            <MoneyDisplay value={earned} preset={npr} testId="dw-cashback-total" />
          </p>
          {cashback.length === 0 ? (
            <p className="app-muted">No cashback yet. Pay a bill or top up to earn some.</p>
          ) : (
            <ul className="dw-txs" aria-label="Cashback">
              {cashback.map((tx) => (
                <TxRow key={tx.id} tx={tx} today={SESSION_DATE} />
              ))}
            </ul>
          )}
        </Card>
      </div>
      <section aria-labelledby="dw-offers">
        <h3 id="dw-offers" className="dw-section-title">
          Offers
        </h3>
        <ul className="dw-offers">
          {OFFERS.map((o) => (
            <li key={o.id}>
              <strong>{o.title}</strong>
              <span className="app-muted app-small">{o.body}</span>
              <Button size="sm" variant="ghost" onClick={() => go(o.go)}>
                {o.go === 'scan' ? 'Scan and pay' : 'Pay a bill'}
              </Button>
            </li>
          ))}
        </ul>
        <p className="app-small app-muted">Illustrative rules for the demo; a real wallet publishes its terms.</p>
      </section>
    </div>
  );
}
