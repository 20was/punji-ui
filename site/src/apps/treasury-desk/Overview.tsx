import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MeterBar } from '@punji/ui/meter';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { StatusBanner } from '@punji/ui/status-banner';
import { Switch } from '@punji/ui/switch';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatMoneyAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { ACCOUNTS, POLICY, moneyText, nprText, shockLabel, toNpr, type BankAccount } from './treasury.ts';
import { useTreasury } from './store.ts';

interface Line {
  account: BankAccount;
  /** Rupee equivalent at the scenario rate. */
  npr: bigint;
}

/** Where cash stands: every account in rupees, the liquid total against the policy, and every breach as a banner. */
export function Overview() {
  const { state, derived, dispatch, go } = useTreasury();
  const { today, lowest, alerts, exposure } = derived;
  const lines: Line[] = ACCOUNTS.map((account) => ({ account, npr: account.currency === 'USD' ? toNpr(account.balance, exposure.rate) : account.balance }));
  // The control total comes the other way round: liquid cash from the forecast engine plus the locked balances.
  const total = today + ACCOUNTS.filter((a) => !a.liquid).reduce((n, a) => n + a.balance, 0n);
  const columns: FinancialColumn<Line>[] = [
    {
      key: 'account',
      label: 'Account',
      rowHeader: true,
      render: (l) => (
        <span className="td-desc">
          <strong>{l.account.name}</strong>
          <span>{l.account.bank}</span>
        </span>
      ),
    },
    { key: 'ccy', label: 'Currency', render: (l) => l.account.currency },
    { key: 'balance', label: 'Balance', num: true, render: (l) => moneyText({ minor: l.account.balance, currency: l.account.currency }) },
    {
      key: 'npr',
      label: 'In NPR',
      kind: 'money',
      num: true,
      value: (l) => nprMoney(l.npr),
      aggregate: 'sum',
      formatAggregate: formatMoneyAggregate,
      render: (l) => <Amount value={l.npr} plain />,
    },
  ];
  const max = Number(POLICY.target * 3n / 2n);
  return (
    <div className="app-stack">
      <ScreenTitle>Position and liquidity</ScreenTitle>
      <MetricRow label="Cash position" count={4} testId="td-kpis">
        <MetricTile
          label="Liquid cash"
          value={<Amount value={today} plain testId="td-kpi-liquid" />}
          note="Available within a day, in NPR"
          meter={<MeterBar parts={[{ value: Number(today), tone: today < POLICY.minimum ? 'loss' : 'chart' }]} max={max} marker={Number(POLICY.minimum)} />}
        />
        <MetricTile label="Policy minimum" value={<Amount value={POLICY.minimum} plain />} note={`Target ${nprText(POLICY.target)}`} compact />
        <MetricTile label="Lowest in 13 weeks" value={<Amount value={lowest.closing} plain testId="td-kpi-lowest" />} note={`Week ${lowest.index + 1}`} compact tone={lowest.breach ? 'inverse' : 'tint'} />
        <MetricTile label="Dollar position" value={<Amount value={exposure.netNpr} plain testId="td-kpi-fx" />} note={`At ${exposure.rate} (${shockLabel(state.fxBps).toLowerCase()})`} compact />
      </MetricRow>

      <section className="td-banners" aria-labelledby="td-alerts-h" data-testid="td-alerts">
        <h3 id="td-alerts-h" className="td-h">
          Liquidity buffer
        </h3>
        {alerts.map((a) => (
          <StatusBanner key={a.title} tone={a.tone} title={a.title} action={a.tone === 'danger' || a.tone === 'warn' ? { label: a.title.startsWith('Dollar') ? 'See exposure' : 'See the forecast', onClick: () => go(a.title.startsWith('Dollar') ? 'fx' : 'forecast') } : undefined} testId={`td-alert-${a.tone}`}>
            {a.body}
          </StatusBanner>
        ))}
      </section>

      <Card title="Scenario" description="Test the buffer before it is tested for you." headingLevel={3}>
        <div className="td-scenario">
          <div className="td-switch">
            <Switch checked={state.stress} onChange={(on) => dispatch({ type: 'stress', on })} labelledBy="td-stress-l" describedBy="td-stress-d" testId="td-stress" />
            <span>
              <strong id="td-stress-l">Customers pay two weeks late</strong>
              <span id="td-stress-d" className="app-muted app-small td-block">
                Moves every receipt back 14 days. Press S to switch it.
              </span>
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => go('payments')} testId="td-open-payments">
            Defer a payment
          </Button>
        </div>
      </Card>

      <Card title="Bank accounts" description="Liquid accounts count towards the buffer; the term deposit does not." headingLevel={3} flush testId="td-accounts">
        <FinancialTable
          caption="Bank accounts in NPR"
          columns={columns}
          rows={lines}
          rowKey={(l) => l.account.id}
          emptyTitle="No accounts"
          groupBy={(l) => (l.account.liquid ? 'liquid' : 'term')}
          groupLabel={(key) => (key === 'liquid' ? 'Available within a day' : 'Locked until maturity')}
          expectedTotals={{ npr: nprMoney(total) }}
          totalsLabels={{ total: 'All accounts' }}
        />
      </Card>
    </div>
  );
}
