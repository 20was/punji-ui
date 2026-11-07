import { CashFlowChart, type CashFlowPeriod } from '@punji/ui/cash-flow-chart';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { money } from '@punji/ui/money';
import { StatusBanner } from '@punji/ui/status-banner';
import { Switch } from '@punji/ui/switch';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatPlainAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { shortDate } from '../shared/books.ts';
import { POLICY, nprText, type Week } from './treasury.ts';
import { useTreasury } from './store.ts';

const weekLabel = (w: Week) => `Week ${w.index + 1}`;

/** Thirteen weeks of cash: money in and out per week (CashFlowChart), then each week's opening and closing position
 *  against the policy minimum, in words as well as colour. */
export default function ForecastScreen() {
  const { state, derived, dispatch } = useTreasury();
  const { weeks, placed } = derived;
  const periods: CashFlowPeriod[] = weeks.map((w) => ({ key: `w${w.index + 1}`, label: `W${w.index + 1}`, inflow: money(w.moneyIn, 'NPR'), outflow: money(w.moneyOut, 'NPR') }));
  // The control totals come from the placed items, not from the weekly sums the table adds up.
  const inside = placed.filter((p) => p.week !== null);
  const expectedIn = inside.filter((p) => p.npr > 0n).reduce((n, p) => n + p.npr, 0n);
  const expectedOut = inside.filter((p) => p.npr < 0n).reduce((n, p) => n - p.npr, 0n);
  const columns: FinancialColumn<Week>[] = [
    {
      key: 'week',
      label: 'Week',
      rowHeader: true,
      render: (w) => (
        <span className="td-desc">
          <strong>{weekLabel(w)}</strong>
          <span>From {shortDate(w.start)}</span>
        </span>
      ),
    },
    { key: 'opening', label: 'Opening', kind: 'money', num: true, render: (w) => <Amount value={w.opening} plain /> },
    { key: 'in', label: 'Money in', kind: 'money', num: true, value: (w) => nprMoney(w.moneyIn), aggregate: 'sum', formatAggregate: (v) => formatPlainAggregate(v), render: (w) => <Amount value={w.moneyIn} plain /> },
    { key: 'out', label: 'Money out', kind: 'money', num: true, value: (w) => nprMoney(w.moneyOut), aggregate: 'sum', formatAggregate: (v) => formatPlainAggregate(v), render: (w) => <Amount value={w.moneyOut} plain /> },
    { key: 'closing', label: 'Closing', kind: 'money', num: true, render: (w) => <Amount value={w.closing} plain /> },
    {
      key: 'policy',
      label: 'Against the minimum',
      render: (w) => (w.breach ? <strong className="td-breach">{`! Below by ${nprText(POLICY.minimum - w.closing)}`}</strong> : `✓ ${nprText(w.closing - POLICY.minimum)} above`),
    },
  ];
  return (
    <div className="app-stack">
      <ScreenTitle>13-week forecast</ScreenTitle>
      <div className="td-switch">
        <Switch checked={state.stress} onChange={(on) => dispatch({ type: 'stress', on })} labelledBy="td-f-stress-l" testId="td-f-stress" />
        <strong id="td-f-stress-l">Customers pay two weeks late</strong>
      </div>
      {derived.breaches.length > 0 && (
        <StatusBanner tone="danger" title={`Below the minimum in ${derived.breaches.length} ${derived.breaches.length === 1 ? 'week' : 'weeks'}`} testId="td-f-breach">
          Week {derived.breaches[0]!.index + 1} closes at {nprText(derived.breaches[0]!.closing)}, under the policy minimum of {nprText(POLICY.minimum)}. Defer a supplier payment on the Payments screen to lift it.
        </StatusBanner>
      )}
      <Card title="Money in and out" description={`Weekly, from ${shortDate(weeks[0]!.start)}. The line is the net; the table below has every figure.`} headingLevel={3} testId="td-forecast-chart">
        <CashFlowChart periods={periods} label="Weekly cash flow for 13 weeks, NPR" height={240} testId="td-cashflow" />
      </Card>
      <Card title="Week by week" description="Each week opens where the last one closed. Amounts in NPR; dollar items at the scenario rate." headingLevel={3} flush testId="td-forecast-table">
        <FinancialTable
          caption="13-week liquid cash forecast (NPR)"
          columns={columns}
          rows={weeks}
          rowKey={(w) => String(w.index)}
          emptyTitle="No forecast"
          expectedTotals={{ in: nprMoney(expectedIn), out: nprMoney(expectedOut) }}
          totalsLabels={{ total: '13 weeks' }}
        />
      </Card>
    </div>
  );
}
