import { useState, type ReactNode } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { MeterBar } from '@punji/ui/meter';
import { ScreenTitle, lazyScreen } from '../shared/kit.tsx';
import { BillIcon, GiftIcon, HistoryIcon, ScanIcon, SendIcon, WalletIcon } from '../shared/icons.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { Balance, TxRow } from './rows.tsx';
import { LIMITS, rs, spentThisMonth, spentToday, useWallet } from './store.ts';

const LoadFund = lazyScreen(() => import('./LoadFund.tsx'), 'Load money');

/** The balance, Load money, quick actions, limits used and the latest activity. */
export function Home() {
  const { state, go, openBills } = useWallet();
  const [loading, setLoading] = useState(false);
  const today = spentToday(state);
  const month = spentThisMonth(state);
  const actions: { key: string; label: string; icon: ReactNode; run: () => void }[] = [
    { key: 'scan', label: 'Scan and pay', icon: <ScanIcon />, run: () => go('scan') },
    { key: 'send', label: 'Send money', icon: <SendIcon />, run: () => go('send') },
    { key: 'electricity', label: 'Electricity', icon: <BillIcon />, run: () => openBills('electricity') },
    { key: 'topup', label: 'Top-up', icon: <WalletIcon />, run: () => openBills('topup') },
    { key: 'history', label: 'History', icon: <HistoryIcon />, run: () => go('history') },
    { key: 'rewards', label: 'Rewards', icon: <GiftIcon />, run: () => go('rewards') },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle>Wallet</ScreenTitle>
      <section className="dw-hero" aria-labelledby="dw-balance-label">
        <p className="dw-hero-label" id="dw-balance-label">
          Wallet balance
        </p>
        <p className="dw-hero-value">
          <Balance value={state.balance} hidden={state.hideBalance} testId="dw-balance" />
        </p>
        <p className="dw-hero-sub">
          {state.points.toLocaleString('en-IN')} reward points · {state.txs.some((t) => t.status === 'pending' && t.kind === 'load') ? 'a load is on its way' : 'ready to pay'}
        </p>
        <div className="dw-hero-actions">
          <Button onClick={() => setLoading((v) => !v)} aria-expanded={loading} aria-controls="dw-load" testId="dw-load-open" onMouseEnter={() => void LoadFund.preload()}>
            {loading ? 'Close' : 'Load money'}
          </Button>
        </div>
      </section>
      <div id="dw-load">{loading && <LoadFund onDone={() => setLoading(false)} />}</div>

      <ul className="dw-actions" aria-label="Quick actions">
        {actions.map((a) => (
          <li key={a.key}>
            <button type="button" className="dw-action" onClick={a.run} data-testid={`dw-action-${a.key}`}>
              <span className="dw-action-icon" aria-hidden="true">
                {a.icon}
              </span>
              <span>{a.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="app-grid is-halves">
        <Card title="Recent activity" headingLevel={3} action={<Button size="sm" variant="ghost" onClick={() => go('history')}>All</Button>}>
          <ul className="dw-txs" aria-label="Recent activity" data-testid="dw-recent">
            {state.txs.slice(0, 5).map((tx) => (
              <TxRow key={tx.id} tx={tx} today={SESSION_DATE} />
            ))}
          </ul>
        </Card>
        <Card title="Limits" description="KYC verified wallet (illustrative limits)" headingLevel={3}>
          <div className="app-stack">
            <div className="dw-limit">
              <p className="dw-limit-line">
                <span>Spent today</span>
                <span>
                  {rs(today)} of {rs(LIMITS.daily)}
                </span>
              </p>
              <MeterBar parts={[{ value: Number(today), tone: 'chart' }]} max={Number(LIMITS.daily)} />
            </div>
            <div className="dw-limit">
              <p className="dw-limit-line">
                <span>This month</span>
                <span>
                  {rs(month)} of {rs(LIMITS.monthly)}
                </span>
              </p>
              <MeterBar parts={[{ value: Number(month), tone: 'chart' }]} max={Number(LIMITS.monthly)} />
            </div>
            <p className="app-small app-muted">Up to {rs(LIMITS.perPayment)} a payment; the wallet holds up to {rs(LIMITS.maxBalance)}.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
