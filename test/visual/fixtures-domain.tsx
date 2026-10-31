import { useState, type ReactNode } from 'react';
import {
  DebitCredit, FinancialPeriodSelector, JournalEntryView, LedgerTable, MarketHeatmap, MarketIndices, MarketMovers, MarketStatus, PaymentStatus, PriceLimitIndicator,
  StatementTable, StockTable, TrialBalance, Watchlist, getMarketSession, heatmapItemsFromQuotes, nepseSchedule, nepalFiscalMonthPeriods, nepalFiscalQuarterPeriods,
  nepalFiscalYearPeriods, rollUp, sortQuotes, type MarketState, type MoverKind, type QuoteSort,
} from '@punji/ui';
import { circuit, marketIndices, quotes, quotesWithGaps, sampleNow } from '../../fixtures/market-data.ts';
import {
  cashEntries, cashOpening, incomeStatement, journals, paymentStatuses, periods, periodSpec, saleJournal, unbalancedJournal,
} from '../../fixtures/accounting-data.ts';

// Market and accounting fixtures. All data comes from fixtures/market-data.ts and fixtures/accounting-data.ts,
// the same files the docs site reads (one source). Synthetic, never live.
const noop = () => undefined;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Stack = ({ children }: { children: ReactNode }) => <div style={{ display: 'grid', gap: 24 }}>{children}</div>;

// --- StockTable -----------------------------------------------------------

function StockTableFixture({ mode }: { mode: 'default' | 'loading' | 'empty' | 'error' | 'selection' | 'stacked' }) {
  const [sort, setSort] = useState<QuoteSort>({ key: 'changePercent', dir: 'desc' });
  const [selected, setSelected] = useState<readonly string[]>(['NABIL', 'HDL']);
  const rows = sortQuotes(quotes.slice(0, 6), sort);
  const common = { caption: 'NEPSE quotes · NPR', testId: 'vr-stock' } as const;
  switch (mode) {
    case 'loading': return <StockTable {...common} quotes={[]} state="loading" />;
    case 'empty': return <StockTable {...common} quotes={[]} emptyLabel="No quotes match your filter." />;
    case 'error': return <Stack>
      <Block title="With onRetry"><StockTable {...common} quotes={[]} state="error" onRetry={noop} /></Block>
      <Block title="Without onRetry (no button)"><StockTable caption="NEPSE quotes · NPR" testId="vr-stock-noretry" quotes={[]} state="error" /></Block>
    </Stack>;
    case 'selection': return <StockTable {...common} quotes={rows} sort={sort} onSortChange={setSort} selectedSymbols={selected} onSelectedSymbolsChange={setSelected} />;
    case 'stacked': return <StockTable {...common} quotes={quotesWithGaps} columns={['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend']} selectedSymbols={selected} onSelectedSymbolsChange={setSelected} density="compact" />;
    default: return <StockTable {...common} quotes={rows} sort={sort} onSortChange={setSort} columns={['symbol', 'ltp', 'change', 'volume', 'turnover', 'trend']} />;
  }
}

// --- Market components ----------------------------------------------------

function MarketMoversFixture() {
  const [tab, setTab] = useState<MoverKind>('gainers');
  return <Stack>
    <MarketMovers quotes={quotes} label="Market movers" tab={tab} onTabChange={setTab} limit={4} footer="As of the 14 Nov close. Synthetic data." testId="vr-movers" />
    <Block title="Flat day: empty tabs"><MarketMovers quotes={quotes.map((q) => ({ ...q, previousClose: q.ltp }))} label="Quiet market" limit={4} /></Block>
  </Stack>;
}

function MarketIndicesFixture() {
  const session = getMarketSession(sampleNow, nepseSchedule);
  return <Stack>
    <Block title="Cards"><MarketIndices indices={marketIndices} label="Market indices" state="open" asOf="As of 14:58, 14 Nov" /></Block>
    <Block title="Strip"><MarketIndices indices={marketIndices.slice(0, 3)} label="Index strip" variant="strip" session={session} showTrend={false} convention="red-up" /></Block>
    <Block title="Loading"><MarketIndices indices={[]} label="Loading indices" state="open" loading /></Block>
  </Stack>;
}

const marketStates: MarketState[] = ['open', 'pre-open', 'closed', 'halted', 'holiday'];
function MarketStatusFixture() {
  return <Stack>
    <Block title="Every state">
      <div className="vr-row">{marketStates.map((state) => <MarketStatus key={state} state={state} market="NEPSE" />)}</div>
      <div className="vr-row">{marketStates.map((state) => <MarketStatus key={`sm-${state}`} state={state} size="sm" />)}</div>
    </Block>
    <Block title="Derived from a schedule"><MarketStatus session={getMarketSession(sampleNow, nepseSchedule)} market="NEPSE" /></Block>
  </Stack>;
}

function PriceLimitFixture() {
  const limits = { previousClose: circuit.previousClose, lowerLimit: circuit.lower, upperLimit: circuit.upper } as const;
  return <Stack>
    <Block title="Mid band"><PriceLimitIndicator symbol="NABIL" ltp={50_120n} {...limits} /></Block>
    <Block title="At the upper limit"><PriceLimitIndicator symbol="HDL" ltp={circuit.upper} {...limits} /></Block>
    <Block title="At the lower limit"><PriceLimitIndicator symbol="CHCL" ltp={circuit.lower} {...limits} /></Block>
    <Block title="Unavailable"><PriceLimitIndicator symbol="NO DATA" ltp={null} /></Block>
  </Stack>;
}

function WatchlistFixture() {
  const [list, setList] = useState(quotes.slice(0, 5));
  return <Stack>
    <Block title="Reorder and remove">
      <Watchlist
        quotes={list}
        label="My watchlist"
        testId="vr-watch"
        onReorder={(symbols) => setList((current) => symbols.map((s) => current.find((q) => q.symbol === s)!))}
        onRemove={(symbol) => setList((current) => current.filter((q) => q.symbol !== symbol))}
        emptyTitle="Nothing on your watchlist"
        emptyBody="Search for a company to follow it."
      />
    </Block>
    <Block title="Read only, with gaps"><Watchlist quotes={quotesWithGaps} label="Shared watchlist" /></Block>
    <Block title="Empty"><Watchlist quotes={[]} label="Empty watchlist" emptyTitle="Nothing on your watchlist" emptyBody="Search for a company to follow it." /></Block>
  </Stack>;
}

function MarketHeatmapFixture() {
  return <Stack>
    <Block title="Turnover"><MarketHeatmap items={heatmapItemsFromQuotes(quotes, 'turnover')} label="NEPSE turnover heatmap" sizeLabel="Turnover" /></Block>
    <Block title="Gaps and red-up"><MarketHeatmap
      items={[
        { id: 'NABIL', label: 'NABIL', name: 'Nabil Bank', size: 5_200, change: 1.25 },
        { id: 'NTC', label: 'NTC', name: 'Nepal Telecom', size: 3_100, change: -0.47 },
        { id: 'HDL', label: 'HDL', name: 'Himalayan Distillery', size: 1_800, change: 4.2 },
        { id: 'SBL', label: 'SBL', name: 'Siddhartha Bank', size: 600, change: null },
        { id: 'BFC', label: 'BFC', name: 'Butwal Finance', size: null, change: 0 },
      ]}
      label="Heatmap with gaps" sizeLabel="Turnover" aspect={1} scaleMax={4} convention="red-up"
    /></Block>
  </Stack>;
}

// --- Accounting -----------------------------------------------------------

function JournalEntryFixture() {
  return <Stack>
    <Block title="Balanced"><JournalEntryView journal={saleJournal} testId="vr-journal-ok" /></Block>
    <Block title="Out of balance"><JournalEntryView journal={unbalancedJournal} testId="vr-journal-bad" /></Block>
  </Stack>;
}

function LedgerTableFixture() {
  return <Stack>
    <Block title="Opening, postings, totals and closing"><LedgerTable caption="Cash ledger, Shrawan 2081 (NPR)" entries={cashEntries} normal="debit" opening={cashOpening} /></Block>
    <Block title="Overdrawn: balance reads Cr, no Ref column"><LedgerTable caption="Overdrawn cash (NPR)" entries={cashEntries} normal="debit" opening={-20_000_000n} showReference={false} /></Block>
    <Block title="Error without a retry"><LedgerTable caption="Cash ledger (NPR)" entries={[]} normal="debit" state="error" /></Block>
  </Stack>;
}

function TrialBalanceFixture() {
  return <Stack>
    <Block title="Balanced, net"><TrialBalance caption="Trial balance (NPR)" data={journals} /></Block>
    <Block title="Balanced, gross totals"><TrialBalance caption="Trial balance, gross (NPR)" data={journals} basis="totals" /></Block>
    <Block title="Out of balance"><TrialBalance caption="Trial balance with a draft entry (NPR)" data={[...journals, unbalancedJournal]} /></Block>
  </Stack>;
}

function StatementTableFixture() {
  const rows = rollUp(incomeStatement);
  return <Stack>
    <Block title="With variance"><StatementTable caption="Income statement (NPR)" periods={periods} rows={rows} variance={{ from: '2080/81', to: '2081/82' }} /></Block>
    <Block title="Minus signs"><StatementTable caption="Income statement, minus signs (NPR)" periods={periods} rows={rows} negative="minus" /></Block>
  </Stack>;
}

function PaymentStatusFixture() {
  return <Stack>
    <Block title="Statuses"><div className="vr-row">{paymentStatuses.map((status) => <PaymentStatus key={status} status={status} />)}</div></Block>
    <Block title="Small"><div className="vr-row">{paymentStatuses.map((status) => <PaymentStatus key={status} status={status} size="sm" />)}</div></Block>
    <Block title="DebitCredit"><div className="vr-row"><DebitCredit value={1250000n} /><DebitCredit value={-300000n} variant="signed" /><DebitCredit value={null} /></div></Block>
  </Stack>;
}

const fiscalPeriods = [
  ...nepalFiscalYearPeriods(periodSpec.from, periodSpec.to),
  ...nepalFiscalQuarterPeriods(periodSpec.detailYear),
  ...nepalFiscalMonthPeriods(periodSpec.detailYear),
];
function PeriodSelectorFixture() {
  const [value, setValue] = useState<string>(periodSpec.initial);
  return <div style={{ maxWidth: 420 }}>
    <FinancialPeriodSelector periods={fiscalPeriods} value={value} onChange={(id) => setValue(id)} label="Reporting period" kindLabels={{ year: 'Year', quarter: 'Quarter', month: 'Month' }} testId="vr-period" />
    <p data-testid="vr-period-value">{value}</p>
  </div>;
}

export const domainRegistry: Record<string, () => ReactNode> = {
  'stock-table': () => <StockTableFixture mode="default" />,
  'stock-table-loading': () => <StockTableFixture mode="loading" />,
  'stock-table-empty': () => <StockTableFixture mode="empty" />,
  'stock-table-error': () => <StockTableFixture mode="error" />,
  'stock-table-selection': () => <StockTableFixture mode="selection" />,
  'stock-table-stacked': () => <StockTableFixture mode="stacked" />,
  'market-movers': MarketMoversFixture,
  'market-indices': MarketIndicesFixture,
  'market-status': MarketStatusFixture,
  'price-limit': PriceLimitFixture,
  watchlist: WatchlistFixture,
  'market-heatmap': MarketHeatmapFixture,
  'journal-entry': JournalEntryFixture,
  'ledger-table': LedgerTableFixture,
  'trial-balance': TrialBalanceFixture,
  'statement-table': StatementTableFixture,
  'payment-status': PaymentStatusFixture,
  'period-selector': PeriodSelectorFixture,
};
