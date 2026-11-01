import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { FinancialSummary, FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { SHARE_TONES, ShareBar } from '@punji/ui/meter';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PaymentTimeline } from '@punji/ui/payment-timeline';
import { EmptyState } from '@punji/ui/states';
import { StatusPill } from '@punji/ui/status-pill';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { CATEGORY_LABEL, fundById, navText, type FundCategory, type FundTx, type Holding } from './data.ts';
import { Gain, Pct, dateText, percentOf } from './bits.tsx';
import { instalmentDates, navUnits, npr, nprPlain, orderSteps, portfolioOf, rs, useInvest } from './store.ts';

/** Units, value and XIRR per fund and in total, allocation by category, SIPs, orders in progress and every allotment. */
export default function PortfolioScreen() {
  const { state, dispatch, go, openFund, invest } = useInvest();
  const [view, setView] = useState<'holdings' | 'sips' | 'orders' | 'history'>('holdings');
  const p = useMemo(() => portfolioOf(state.txs), [state.txs]);
  const live = state.orders.filter((o) => o.stage !== 'allotted');

  if (p.holdings.length === 0)
    return (
      <div className="app-stack">
        <ScreenTitle>Portfolio</ScreenTitle>
        <EmptyState title="No investments yet" body="Start a SIP or invest once in a fund, and your units and returns appear here." headingLevel={3} action={<Button size="sm" onClick={() => go('funds')}>Explore funds</Button>} />
      </div>
    );

  const byCategory = new Map<FundCategory, bigint>();
  for (const h of p.holdings) byCategory.set(h.fund.category, (byCategory.get(h.fund.category) ?? 0n) + h.value);
  // Shares by largest remainder in tenths of a percent, so the legend sums to exactly 100.0%.
  const entries = [...byCategory.entries()];
  const raw = entries.map(([, v]) => (v * 1000n * 1_000_000n) / p.value);
  const floors = raw.map((r) => r / 1_000_000n);
  let left = 1000n - floors.reduce((s, f) => s + f, 0n);
  const order = raw.map((r, i) => ({ i, rem: r % 1_000_000n })).toSorted((a, b) => (b.rem > a.rem ? 1 : b.rem < a.rem ? -1 : a.i - b.i));
  for (const { i } of order) if (left > 0n) { floors[i]! += 1n; left -= 1n; }
  const shares = entries.map(([c], i) => ({ key: c, label: CATEGORY_LABEL[c], pct: Number(floors[i]) / 10, tone: SHARE_TONES[i % SHARE_TONES.length]!, value: `${(Number(floors[i]) / 10).toFixed(1)}%` }));

  const columns: FinancialColumn<Holding>[] = [
    { key: 'fund', label: 'Fund', rowHeader: true, render: (h) => <button type="button" className="app-sym" onClick={() => { openFund(h.fund.id); go('funds'); }}><strong>{h.fund.name}</strong><span>{navUnits(h.units)} units · invested {rs(h.invested)}</span></button> },
    { key: 'value', label: 'Value (NPR)', num: true, render: (h) => <MoneyDisplay value={h.value} preset={nprPlain} testId={`ii-value-${h.fund.id}`} /> },
    { key: 'gain', label: 'Gain (NPR)', num: true, render: (h) => <Gain value={h.gain} plain /> },
    { key: 'xirr', label: 'XIRR', num: true, render: (h) => <Pct value={h.xirr} /> },
    { key: 'nav', label: 'NAV', num: true, render: (h) => navText(h.nav) },
  ];
  const historyColumns: FinancialColumn<FundTx>[] = [
    { key: 'fund', label: 'Fund', rowHeader: true, render: (t) => <span className="ii-cell"><strong>{fundById(t.fundId)?.name}</strong><span className="app-muted app-small">{dateText(t.date)} · {t.kind === 'sip' ? 'SIP instalment' : 'Lump sum'}</span></span> },
    { key: 'amount', label: 'Amount (NPR)', num: true, render: (t) => <MoneyDisplay value={t.amount} preset={nprPlain} /> },
    { key: 'nav', label: 'NAV', num: true, render: (t) => navText(t.nav) },
    { key: 'units', label: 'Units', num: true, render: (t) => navUnits(t.units) },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-muted app-small">Valued at NAVs of {dateText(SESSION_DATE)}</span>}>Portfolio</ScreenTitle>
      <div className="app-summary">
        <FinancialSummary
          label="Portfolio totals"
          metrics={[
            { id: 'value', label: 'Current value', value: <MoneyDisplay value={p.value} preset={npr} testId="ii-pf-value" /> },
            { id: 'invested', label: 'Invested', value: <MoneyDisplay value={p.invested} preset={npr} testId="ii-pf-invested" /> },
            { id: 'gain', label: 'Gain', value: <Gain value={p.gain} testId="ii-pf-gain" />, note: <Pct value={percentOf(p.gain, p.invested)} /> },
            { id: 'xirr', label: 'XIRR', value: <span data-testid="ii-pf-xirr"><Pct value={p.xirr} /></span>, note: 'Annualised, every instalment dated' },
          ]}
        />
      </div>
      <div className="app-grid is-split">
        <div className="app-stack">
          <SegmentedControl
            label="Portfolio view"
            prefix="ii-pf"
            value={view}
            onChange={setView}
            wrap
            options={[
              { value: 'holdings', label: 'Holdings', count: p.holdings.length },
              { value: 'sips', label: 'SIPs', count: state.mandates.length },
              { value: 'orders', label: 'Orders', count: live.length || undefined },
              { value: 'history', label: 'History' },
            ]}
          />
          {view === 'holdings' && <FinancialTable caption="Holdings" columns={columns} rows={p.holdings} rowKey={(h) => h.fund.id} emptyTitle="No holdings" />}
          {view === 'sips' && (
            <ul className="ii-list" aria-label="SIPs" data-testid="ii-sips">
              {state.mandates.map((m) => {
                const fund = fundById(m.fundId);
                const next = instalmentDates(m, SESSION_DATE, '2027-12-31')[0];
                return (
                  <li key={m.id} className="ii-row">
                    <span className="ii-cell">
                      <strong>{fund?.name}</strong>
                      <span className="app-muted app-small">
                        <MoneyDisplay value={m.monthly} preset={npr} /> on day {m.day}
                        {m.stepUp !== '0' ? `, +${m.stepUp}% a year` : ''} · {m.paused ? 'paused' : `next ${next ? `${dateText(next, 'bs')} (${dateText(next)})` : '—'}`}
                      </span>
                    </span>
                    <span className="ii-row-end">
                      <StatusPill tone={m.paused ? 'warn' : 'gain'} size="sm">{m.paused ? 'Paused' : 'Active'}</StatusPill>
                      <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'mandate', id: m.id, paused: !m.paused })} testId={`ii-sip-toggle-${m.id}`}>
                        {m.paused ? 'Resume' : 'Pause'}
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {view === 'orders' &&
            (state.orders.length === 0 ? (
              <EmptyState title="No orders today" body="Orders you place from the SIP planner show here until their units are allotted." headingLevel={3} action={<Button size="sm" onClick={() => invest('himal-growth', 'lumpsum')}>Invest now</Button>} bare />
            ) : (
              <ul className="ii-list" aria-label="Orders">
                {state.orders.map((o) => (
                  <li key={o.id} className="ii-order">
                    <p className="ii-order-head">
                      <strong>{fundById(o.fundId)?.name}</strong>
                      <span className="app-muted app-small">
                        {o.id} · {o.kind === 'sip' ? 'SIP' : 'Lump sum'} · <MoneyDisplay value={o.amount} preset={npr} />
                      </span>
                    </p>
                    <PaymentTimeline steps={orderSteps(o)} label={`Order ${o.id} progress`} />
                  </li>
                ))}
              </ul>
            ))}
          {view === 'history' && <FinancialTable caption="Allotments" columns={historyColumns} rows={state.txs.toReversed()} rowKey={(t) => t.id} emptyTitle="No allotments yet" />}
        </div>
        <div className="app-stack">
          <Card title="Allocation" description="By category, at current value" headingLevel={3}>
            <ShareBar label={`Allocation: ${shares.map((s) => `${s.label} ${s.value}`).join(', ')}`} items={shares} legend="list" testId="ii-allocation" />
          </Card>
          <Card title="How XIRR is worked out" headingLevel={3}>
            <p className="app-small">Each instalment is a dated payment out and today&apos;s value a payment in; XIRR is the yearly rate that makes them balance, solved exactly with <code>xirr</code> from <code>@punji/ui/invest</code> to 0.01%. A fund held under 30 days shows no XIRR, because annualising a few days misleads.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
