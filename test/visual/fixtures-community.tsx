import type { ReactNode } from 'react';
import { CashFlowChart, DataFreshness, FxRateDisplay, money, NetWorthChart, RangeSelector, StatusBanner, WaterfallChart } from '../../src/index.ts';
import { Accordion, Breadcrumb, MenuButton } from '@punji/ui';
import { ScrollTable, Watchlist, type ColumnDef, type WatchlistQuote } from '@punji/ui';
// new:component inserts imports above this line

// Visual fixtures for components scaffolded with `npm run new:component <name>` (docs/CONTRIBUTING-COMPONENT.md).
// Each starts `pending` in manifest.ts (axe runs, no screenshot) until its Docker baseline is recorded.
// The generator inserts code above the marker lines, keep them.

const T = '2026-11-07T04:00:00Z';
const rate = { base: 'USD', quote: 'NPR', rate: '133.40', asOf: T, source: 'Nepal Rastra Bank' } as const;
const fixed = () => Date.parse('2026-11-07T04:12:00Z');

function FxRateFixture() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <FxRateDisplay rate={rate} timeZone="UTC" now={fixed()} />
      <FxRateDisplay buy={{ ...rate, rate: '133.10' }} sell={{ ...rate, rate: '133.70' }} timeZone="UTC" />
      <FxRateDisplay rate={rate} inverse timeZone="UTC" hideSource />
      <FxRateDisplay rate={rate} locale="ne-NP-u-nu-deva" timeZone="UTC" />
    </div>
  );
}

// Menu is a portal that opens on interaction: the fixture shows its buttons (text and icon-only); the open state is covered by the unit tests.
function MenuFixture() {
  const items = [{ id: "a", label: "View", onSelect: () => {} }];
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <MenuButton label="Account" items={items} />
      <MenuButton iconOnly label="Actions for NABIL" items={items} />
      <MenuButton label="Disabled" items={items} disabled />
    </div>
  );
}

function DataFreshnessFixture() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <DataFreshness state="live" asOf={T} now={fixed} />
      <DataFreshness state="delayed" delayMinutes={15} asOf={T} now={fixed} />
      <DataFreshness state="end-of-day" asOf={T} now={fixed} />
      <DataFreshness state="stale" asOf={T} now={fixed} />
      <DataFreshness state="offline" asOf={T} now={fixed} />
    </div>
  );
}

function BreadcrumbFixture() {
  const trail = [{ label: "Accounts", href: "/accounts" }, { label: "Savings", href: "/accounts/savings" }, { label: "Joint", href: "/accounts/savings/joint" }, { label: "Kartik 2082" }];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Breadcrumb items={trail} labels={{ nav: "Fixture path" }} />
      <Breadcrumb items={trail} maxItems={3} labels={{ nav: "Fixture collapsed path" }} />
    </div>
  );
}

function StatusBannerFixture() {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <StatusBanner title="Markets are closed." action={{ label: 'Trading hours', href: '/hours' }}>Orders queue for the next session.</StatusBanner>
      <StatusBanner tone="warn" title="Prices are delayed." dismissible>Do not rely on them for time-sensitive decisions.</StatusBanner>
      <StatusBanner tone="danger" title="Payments are degraded." action={{ label: 'View status', onClick: () => undefined }}>Transfers may fail or arrive late, and this longer sentence checks that the message wraps beside the action on a narrow screen.</StatusBanner>
    </div>
  );
}

function AccordionFixture() {
  const items = [
    { id: "fees", header: "Fees", children: <p>No monthly fee.</p> },
    { id: "limits", header: "Limits", children: <p>NPR 500,000 a day.</p> },
    { id: "closing", header: "Closing", disabled: true, children: <p>Visit a branch.</p> },
  ];
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <Accordion items={items} defaultValue={["fees"]} />
      <Accordion items={items} type="multiple" defaultValue={["fees", "limits"]} />
    </div>
  );
}

const npr = (rupees: number) => money(BigInt(rupees) * 100n, 'NPR');

function WaterfallChartFixture() {
  return (
    <div style={{ maxWidth: 560 }}>
      <WaterfallChart
        label="Profit bridge"
        steps={[
          { key: 'open', label: 'Opening', amount: npr(500_000), total: true },
          { key: 'sales', label: 'Sales', amount: npr(1_200_000) },
          { key: 'cogs', label: 'Cost of sales', amount: npr(-700_000) },
          { key: 'tax', label: 'Tax', amount: npr(-90_000) },
          { key: 'close', label: 'Closing', amount: npr(0), total: true },
        ]}
      />
    </div>
  );
}

const flow = (key: string, i: number, o: number) => ({ key, label: key, inflow: npr(i), outflow: npr(o) });

function CashFlowChartFixture() {
  const p = flow;
  return (
    <div style={{ maxWidth: 560 }}>
      <CashFlowChart label="Cash flow" periods={[p('Shr', 180_000, 120_000), p('Bha', 175_000, 140_000), p('Asw', 210_000, 260_000), p('Kar', 190_000, 150_000), p('Man', 185_000, 135_000)]} />
    </div>
  );
}

function NetWorthChartFixture() {
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const a = [900, 940, 980, 1010, 1060, 1100];
  const l = [300, 290, 280, 1050, 1030, 1010];
  return (
    <div style={{ maxWidth: 560 }}>
      <NetWorthChart label="Net worth" points={m.map((k, i) => ({ key: k, label: k, assets: npr(a[i]! * 1000), liabilities: npr(l[i]! * 1000) }))} />
    </div>
  );
}

function RangeSelectorFixture() {
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 390 }}>
      <RangeSelector value="1M" onChange={() => {}} />
      <RangeSelector value="All" onChange={() => {}} fill />
    </div>
  );
}

// Sorted by value (largest first), a folded column, a missing value and exact footer totals; a second table with the sticky column scrolled.
interface Co { s: string; name: string; cap: ReturnType<typeof money>; chg: number | null }
const COS: Co[] = [
  { s: 'NABIL', name: 'Nabil Bank', cap: money(13_400_000_000_00n, 'NPR'), chg: 1.2 },
  { s: 'ADBL', name: 'Agricultural Development Bank', cap: money(6_150_000_000_00n, 'NPR'), chg: null },
  { s: 'SCBL', name: 'Standard Chartered Bank Nepal', cap: money(5_320_000_000_00n, 'NPR'), chg: -0.5 },
];
const COS_COLUMNS: ColumnDef<Co, ReactNode>[] = [
  { id: 's', header: 'Company', accessor: (c) => c.s, sortable: true, cell: (c) => <><b>{c.s}</b> {c.name}</> },
  { id: 'chg', header: 'Today', kind: 'percent', accessor: (c) => c.chg, sortable: true, cell: (c) => (c.chg === null ? 'Not traded' : `${c.chg > 0 ? '▲ +' : '▼ '}${c.chg.toFixed(2)}%`) },
  { id: 'cap', header: 'Value, Rs', kind: 'money', accessor: (c) => c.cap, sortable: true, aggregate: 'sum' },
];
function ScrollTableFixture() {
  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      <ScrollTable caption="Banks by value" showCaption columns={COS_COLUMNS} rows={COS} rowKey={(c) => c.s} defaultSort={{ key: 'cap', dir: 'desc' }} totals />
      <ScrollTable caption="Banks, empty" columns={COS_COLUMNS} rows={[]} rowKey={(c) => c.s} />
    </div>
  );
}

// Month and since-added columns (one missing), an actions slot, and the loading rows.
const WQ = (symbol: string, extra: Partial<WatchlistQuote> = {}): WatchlistQuote => ({ symbol, name: `${symbol} Limited`, ltp: 51000n, previousClose: 50000n, volume: 1200, turnover: 61_200_000n, ...extra });
const alertOn = (q: WatchlistQuote) => <button type="button" aria-label={`Alert on ${q.symbol}`}>!</button>;
function WatchlistColumnsFixture() {
  const list = [WQ('NABIL', { monthAgo: 46000n, addedPrice: 56000n }), WQ('NICA', { monthAgo: null, addedPrice: 51000n })];
  return (
    <div style={{ display: 'grid', gap: 12, width: '100%' }}>
      <Watchlist quotes={list} label="With columns" showMonth showSinceAdded actions={alertOn} />
      <Watchlist quotes={[]} label="Loading" loading skeletonRows={2} showMonth showSinceAdded />
    </div>
  );
}

// new:component inserts fixtures above this line

export const communityRegistry: Record<string, () => ReactNode> = {
  'fx-rate': FxRateFixture,
  'data-freshness': DataFreshnessFixture,
  'status-banner': StatusBannerFixture,
  'menu': MenuFixture,
  'breadcrumb': BreadcrumbFixture,
  'accordion': AccordionFixture,
  'waterfall-chart': WaterfallChartFixture,
  'cash-flow-chart': CashFlowChartFixture,
  'net-worth-chart': NetWorthChartFixture,
  'range-selector': RangeSelectorFixture,
  'scroll-table': ScrollTableFixture,
  'watchlist-columns': WatchlistColumnsFixture,
  // new:component inserts registry entries above this line
};
