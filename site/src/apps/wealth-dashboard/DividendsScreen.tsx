import { Card } from '@punji/ui/card';
import { DividendHistory } from '@punji/ui/dividend-history';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { dividendEntriesFromTransactions, dividendsByFiscalYear } from '@punji/ui/portfolio';
import { ScreenTitle } from '../shared/kit.tsx';
import { npr, useWealth } from './store.ts';

/** What the portfolio paid, per Nepal fiscal year: cash, bonus shares at par and rights, with yields on value and cost. */
export default function DividendsScreen() {
  const { state, derived } = useWealth();
  const entries = dividendEntriesFromTransactions(state.transactions);
  const totals = derived.summary.totals;
  const years = dividendsByFiscalYear(entries, { marketValue: totals.marketValue, costBasis: totals.costBasis });
  const cash = entries.filter((e) => e.kind === 'cash').reduce((s, e) => s + e.amount, 0n);
  const latest = years.at(-1);
  return (
    <div className="app-stack">
      <ScreenTitle>Dividends</ScreenTitle>
      <MetricRow label="Income" count={3} dense>
        <MetricTile label="Cash received" value={<MoneyDisplay value={cash} preset={npr} />} note={`${entries.filter((e) => e.kind === 'cash').length} payments since 2023`} compact />
        <MetricTile label={`Fiscal year ${latest?.label ?? ''}`} value={<MoneyDisplay value={latest?.total ?? 0n} preset={npr} />} note="Cash, bonus at par and rights" compact />
        <MetricTile label="Yield on cost" value={latest?.yieldOnCost === null || latest?.yieldOnCost === undefined ? '—' : `${latest.yieldOnCost.toFixed(2)}%`} note="Latest year's cash over cost" compact />
      </MetricRow>
      <Card title="By fiscal year" description="Bikram Sambat fiscal years start on 1 Shrawan" headingLevel={3}>
        <DividendHistory entries={entries} caption="Dividends by fiscal year" money={npr} marketValue={totals.marketValue} costBasis={totals.costBasis} testId="wd-dividends" />
      </Card>
    </div>
  );
}
