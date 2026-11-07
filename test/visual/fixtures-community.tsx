import { CashFlowChart, CorrelationMatrix, DataFreshness, FairValueBar, FilterBar, FilterMenu, FilterMenuGroup, FilterMenuItem, FxRateDisplay, heatCell, Histogram, money, MonthGrid, NetWorthChart, PerformanceChart, PresetRow, PresetTile, PriceTargetChart, RangeEditor, RangeSelector, ReturnsHeatTable, ScoreRadar, StatusBanner, type FilterBarValues, type MonthGridData, WaterfallChart } from '../../src/index.ts';
import { Accordion, AlertListEmpty, AlertRow, AlertRowCompact, AlertRowList, AlertRowSkeleton, AlertSummary, AlertSummaryNote, AlertSummarySection, BarList, Breadcrumb, BrokerBadge, Card, CardSection, CardSectionRow, Figure, HeadlineList, InstrumentHeader, LinkRow, LinkRowList, MenuButton, MoneyDisplay, MonthStrip, PrivateAmount, RatingChangeList, RatingChangeRow, RatingChip, RatingScale, RouteAnnouncer, ScrollTable, SettingList, SettingRow, SkipLink, StatusTag, ThemeProvider, type ColumnDef, type WatchlistQuote, Watchlist } from '@punji/ui';
import { performanceDates, performanceSeries } from '../../fixtures/market-data.ts';
import { type ReactNode, useState } from 'react';
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

function InstrumentHeaderFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <InstrumentHeader symbol="NABIL" name="Nabil Bank Limited" group="Commercial Banks" glyph={<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16V8l7-4 7 4v8M7 16v-5h6v5" /></svg>} currency="NPR" price={51230n} previousClose={50800n} actions={<button type="button">Watch</button>} />
      <InstrumentHeader symbol="NEPSE" tag="Index" name="Nepal Stock Exchange index" figure="2,641.18" figureChange={{ text: '−12.40 · −0.47%', direction: 'down' }} />
      <InstrumentHeader symbol="HIDCL" name="Hydroelectricity Investment and Development Company Limited" currency="NPR" price={31890n} previousClose={31890n} note="Last close · 16 Oct" />
      <InstrumentHeader symbol="NICA" currency="NPR" price={null} loading />
    </div>
  );
}

function BrokerBadgeFixture() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {([36, 40, 48, 56] as const).map((size) => <BrokerBadge key={size} code={58} size={size} />)}
      <BrokerBadge code={7} tone="inverse" />
      <BrokerBadge code={58} tone="accent" size={56} />
      <BrokerBadge code={58} size={132} caption="Broker" />
    </div>
  );
}

function HeadlineListFixture() {
  return (
    <div style={{ width: '100%', maxWidth: 390 }}>
      <HeadlineList label="Latest headlines" items={[
        { key: 'a', title: 'NABIL proposes a 12% cash dividend for the fiscal year and a book closure on 18 Oct, subject to the AGM', line: 'Company filing · 2 days ago', href: 'https://example.com/nabil' },
        { key: 'b', title: 'Board meeting on Sunday', line: 'NEPSE · 3 days ago' },
      ]} />
    </div>
  );
}

function RatingScaleFixture() {
  const steps = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {steps.map((s, i) => <RatingChip key={s} step={i}>{s}</RatingChip>)}
        <RatingChip step={null}>Not rated</RatingChip>
      </div>
      <RatingScale value={3} from={1} label="Agree, up from Disagree" />
      <RatingScale legend={['Low', 'Medium', 'High']} size="lg" label="Risk" />
      <RatingChangeList title="Moved up" icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>} tone="gain" count={2}>
        <RatingChangeRow icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>} title="NABIL" line="Nabil Bank Limited" from={{ step: 2, label: 'Neutral' }} to={{ step: 3, label: 'Mildly bullish' }} figure="512.30" figureSub="Getting stronger" moveLabel="Neutral to Mildly bullish" />
        <RatingChangeRow icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>} title="NICA" line="NIC Asia Bank" from={{ step: null, label: 'Not rated' }} to={{ step: 4, label: 'Bullish' }} figure="348.10" />
      </RatingChangeList>
      <RatingChangeList label="Held" variant="held"><RatingChangeRow variant="held" title="SBI" line="Nepal SBI Bank" to={{ step: 2, label: 'Neutral' }} /></RatingChangeList>
    </div>
  );
}

const monthCell = (key: string, label: string, text: string, tone: 'gain' | 'loss' | 'flat') => ({ key, label, text, tone, aria: `${label} 2026: ${text}` });

function MonthStripFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <MonthStrip label="Months" head="3 of 4 months rose" foot="Best Jun, worst Jul" cells={[monthCell('1', 'Jun', '+1.64%', 'gain'), monthCell('2', 'Jul', '−0.80%', 'loss'), monthCell('3', 'Aug', '0.00%', 'flat'), monthCell('4', 'Sep', '+2.10%', 'gain')]} />
    </div>
  );
}

function BarListFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <BarList label="Sectors" empty="No sectors" heading="By sector" items={[
        { id: 'a', label: 'Commercial Banks', value: 94_100_000_00n, valueText: 'Rs 9.41 crore' },
        { id: 'b', label: 'Hydropower', value: 31_200_000_00n, valueText: 'Rs 3.12 crore' },
        { id: 'c', label: 'Hotels and Tourism', value: null, valueText: 'No data' },
      ]} />
      <BarList label="Empty" empty="Nothing here yet" items={[]} />
      <BarList label="Loading" empty="" items={[]} loading />
    </div>
  );
}

function AlertRowFixture() {
  const row = { symbol: 'HRL', name: 'Himalayan Reinsurance', mark: 'above' as const, condition: 'Above Rs 500', repeat: 'Once', price: 'Rs 493.80', distance: '1.26% to go', onOpen: () => {} };
  return (
    <div style={{ display: 'grid', gap: 24, width: '100%', maxWidth: 390 }}>
      <AlertRowList label="Alerts">
        <AlertRow {...row} status="waiting" closeness={0.87} />
        <AlertRow {...row} symbol="NABIL" status="crossed" distance="Past the target · fires on the next check" closeness={1} />
        <AlertRow {...row} symbol="NICA" mark="below" status="fired" distance="Reached Fri 16 Oct, 13:42" closeness={null} />
        <AlertRow {...row} symbol="SBI" status="paused" closeness={0.4} />
        <AlertRowSkeleton />
      </AlertRowList>
      <div>
        <AlertRowCompact title={<><b>HRL</b> above Rs 500</>} aside="1.26% to go" status="waiting" closeness={0.87} href="/a" />
        <AlertRowCompact title={<><b>NABIL</b> below Rs 480</>} aside="Reached" status="fired" sub="Now 478.00 · Fri 16 Oct, 13:42" />
      </div>
      <AlertListEmpty title="No alerts yet" body="Set a price alert from a stock page." />
    </div>
  );
}

function AlertSummaryFixture() {
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%', maxWidth: 390 }}>
      <AlertSummary label="Price alerts" value="4 active" sub="1 paused · 1 triggered">
        <AlertSummarySection title="Closest to firing">
          <AlertRowCompact title={<><b>HRL</b> above Rs 500</>} aside="1.26% to go" status="waiting" closeness={0.87} />
        </AlertSummarySection>
        <AlertSummarySection title="Fired lately"><AlertSummaryNote>Fills in when prices load</AlertSummaryNote></AlertSummarySection>
      </AlertSummary>
      <AlertSummary label="Price alerts" value="" loading />
    </div>
  );
}

// Parity charts: MonthGrid, ReturnsHeatTable, Histogram, CorrelationMatrix and the PerformanceChart layers.
const edge = (i: number) => (i * 0.5).toFixed(1);
const rs = (v: number) => `Rs ${new Intl.NumberFormat('en-IN').format(Math.round(v))}`;
const mgGrid: MonthGridData = {
  calendar: 'bs',
  years: [
    { year: 2079, months: [-2.8, -5.5, 1.1, 3.6, 8.9, -0.2, 2.4, 6.1, -3.7, 0.9, 4.8, -1.6], yearReturn: 12.3 },
    { year: 2080, months: [1.5, 2.2, -3.9, 7.4, 0, 5.6, -2.1, 3.3, 11.8, -4.6, 1.2, 2.9], yearReturn: 24.7 },
    { year: 2081, months: [4.1, -0.8, 2.6, -6.2, 3.9, 1.7, 5.3, -1.1, 0.6, 7.9, -3.4, 2.0], yearReturn: 16.9 },
    { year: 2082, months: [-1.9, 3.8, 5.2, 2.4, -2.7, 6.6, 0.3, null, null, null, null, null], yearReturn: null },
  ],
};

function MonthGridFixture() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <MonthGrid grid={mgGrid} label="NEPSE return by month, BS" minYears={3} selected={4} onSelect={() => {}} legend testId="vr-mg" />
      <MonthGrid grid={{ ...mgGrid, calendar: 'ad' }} label="NEPSE return by month, AD" minYears={5} averageNote="Appears once a month has 5 years of history" />
    </div>
  );
}

function ReturnsHeatTableFixture() {
  const columns = [{ key: '1w', label: '1W' }, { key: '1m', label: '1M' }, { key: '3m', label: '3M' }, { key: '1y', label: '1Y' }];
  const rows = [
    { id: 'hydro', name: 'Hydropower', sub: '64 companies', cells: [-0.8, -2.4, 6.9, 31.2].map((v) => heatCell(v)) },
    { id: 'bank', name: 'Commercial banks', sub: '20 companies', cells: [1.2, 4.8, -3.1, 14.6].map((v) => heatCell(v)) },
    { id: 'life', name: 'Life insurance', cells: [0.3, 0.04, 2.2, -9.7].map((v) => heatCell(v)) },
    { id: 'micro', name: 'Microfinance', cells: [heatCell(2.9), heatCell(7.3), heatCell(null), heatCell(null)] },
  ];
  return (
    <ReturnsHeatTable caption="Sector returns by period" headName="Sector" columns={columns} rows={rows} average={{ id: 'avg', name: 'Market average', cells: [0.9, 2.7, 1.5, 9.4].map((v) => heatCell(v)) }} sortKey="1y" sortDir="desc" onSort={() => {}} selected="bank" onSelect={() => {}} noneLabel="No history" testId="vr-rht" />
  );
}

function HistogramFixture() {
  const counts = [2, 6, 14, 22, 31, 24, 17, 11, 8, 5, 3, 2];
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 520 }}>
      <Histogram counts={counts} kept={counts.map((_, i) => i >= 2 && i <= 6)} label="Stocks by price to book" bucketLabels={counts.map((_, i) => `${edge(i)} to ${edge(i + 1)}`)} ticks={[{ at: 0, label: '0' }, { at: 4, label: '2' }, { at: 8, label: '4' }, { at: 12, label: '6' }]} testId="vr-hist" />
      <Histogram counts={[0, 3, 0, 9, 4]} label="Sparse buckets" height={72} />
    </div>
  );
}

function CorrelationMatrixFixture() {
  const names = ['Commercial banks', 'Hydropower', 'Life insurance', 'Microfinance', 'Hotels'];
  const values = [[1, 0.62, 0.81, 0.88, 0.35], [0.62, 1, 0.55, 0.47, -0.12], [0.81, 0.55, 1, 0.74, null], [0.88, 0.47, 0.74, 1, 0.29], [0.35, -0.12, null, 0.29, 1]];
  return <CorrelationMatrix names={names} shortNames={['Banks', 'Hydro', 'Life', 'Micro', 'Hotels']} values={values} caption="Sector correlation, daily returns" defaultSelected={0} testId="vr-corr" />;
}

function PerformanceLayersFixture() {
  const lead = performanceSeries.slice(0, 1);
  const putIn = performanceDates.map((_, i) => (i < 30 ? 1_000_000 : 1_100_000));
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <PerformanceChart label="Goal, money put in and drawdown" dates={performanceDates} series={lead} normalize={false} area={false} formatValue={rs} reference={{ value: 1_150_000, label: 'Goal' }} contributions={putIn} drawdown testId="vr-perf-layers" />
      <PerformanceChart label="Rebased to 100 with end labels" dates={performanceDates} series={performanceSeries} rebase={100} area={false} endLabels />
      <div style={{ maxWidth: 360 }}><PerformanceChart label="Quiet axis" dates={performanceDates} series={performanceSeries.slice(0, 2)} axis="quiet" height={140} /></div>
      <PerformanceChart label="Far goal pinned to the edge" dates={performanceDates} series={lead} normalize={false} formatValue={rs} reference={{ value: 5_000_000, label: 'Goal' }} height={160} />
    </div>
  );
}


function RangeEditorFixture() {
  const [from, setFrom] = useState('5');
  const [to, setTo] = useState('');
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 440 }}>
      <RangeEditor why='Price over earnings per share.' presets={[{ id: 'a', label: 'Under 10', from: '', to: '10' }]} track={{ min: '0', max: '60', step: '1' }} from={from} to={to} onFrom={setFrom} onTo={setTo} onClear={() => {}} applyLabel='Show 12 stocks' onApply={() => {}} />
      <RangeEditor from='9' to='4' onFrom={() => {}} onTo={() => {}} error='To must be at least From.' onClear={() => {}} applyLabel='Show 0 stocks' onApply={() => {}} />
    </div>
  );
}

function FilterMenuFixture() {
  return (
    <div style={{ maxWidth: 440 }}>
      <FilterMenu label='Add filter'>
        <FilterMenuGroup title='Valuation'>
          <FilterMenuItem on onLabel='set' onClick={() => {}}>P/E</FilterMenuItem>
          <FilterMenuItem aside='12' onClick={() => {}}>P/B</FilterMenuItem>
        </FilterMenuGroup>
        <FilterMenuGroup title='Bank health' column={2} note='Choose only banks under Sector first.'>
          <FilterMenuItem disabled onClick={() => {}}>NPL</FilterMenuItem>
        </FilterMenuGroup>
        <FilterMenuGroup title='Flags' column={2}>
          <FilterMenuItem toggle on onClick={() => {}}>Breakout</FilterMenuItem>
          <FilterMenuItem toggle onClick={() => {}}>Cash for 5 years</FilterMenuItem>
        </FilterMenuGroup>
      </FilterMenu>
    </div>
  );
}

function PresetTileFixture() {
  return (
    <PresetRow label='Screens'>
      <PresetTile title='Steady dividends' count={14} line='Pays out 40 to 80% of profit.' pressed onClick={() => {}} />
      <PresetTile title='Value' count={9} line='Under 12 times earnings.' pressed={false} onClick={() => {}} />
      <PresetTile title='Quality' locked lockedLabel='Not included' line='High return, low debt.' pressed={false} onClick={() => {}} />
    </PresetRow>
  );
}

function FilterBarFixture() {
  const [values, setValues] = useState<FilterBarValues>({ pe: { max: '12' }, sector: ['banks'], breakout: true });
  return (
    <FilterBar
      fields={[
        { kind: 'multi', id: 'sector', label: 'Sector', pinned: true, options: [{ value: 'banks', label: 'Commercial Banks' }] },
        { kind: 'range', id: 'pe', label: 'Price to earnings', chipLabel: 'P/E' },
        { kind: 'boolean', id: 'breakout', label: 'Breakout' },
      ]}
      values={values}
      onChange={setValues}
    />
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


// ThemeProvider and RouteAnnouncer draw nothing: the fixtures show the region the theme is applied to, and the (hidden) live region beside it.
function ThemeProviderFixture() {
  return (
    <ThemeProvider storageKey="fixture-theme" defaultTheme="light" target={() => document.getElementById('theme-fixture-region')}>
      <div id="theme-fixture-region" style={{ padding: 16, borderRadius: 12, background: 'var(--pu-color-bg)', color: 'var(--pu-color-text)' }}>Region themed by ThemeProvider</div>
    </ThemeProvider>
  );
}

function PrivateAmountFixture() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div>Shown: <MoneyDisplay currency="NPR" value={124835000n} /> <Figure value={1250} kind="int" /></div>
      <div>Masked: <MoneyDisplay currency="NPR" value={124835000n} masked /> <Figure value={1250} kind="int" masked /></div>
      <div>Wrapper in a headline: <b style={{ fontSize: 28 }}><PrivateAmount>Rs 12,48,350.00</PrivateAmount></b></div>
    </div>
  );
}

function SkipLinkFixture() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <SkipLink href="#fixture-main" />
      <p>The link is off screen until it takes focus. This fixture focuses it.</p>
      <div id="fixture-main" role="region" aria-label="Main content">Main content</div>
    </div>
  );
}

function RouteAnnouncerFixture() {
  return (
    <div>
      <RouteAnnouncer routeKey="/markets" />
      <p>The live region is visually hidden; it announces the page title after a route change.</p>
    </div>
  );
}

function CardSectionFixture() {
  return (
    <Card flush label="Sections">
      <CardSection title="Holdings" note="as of close" titleId="fx-cs-h" aside={<StatusTag>NPR</StatusTag>}>
        <p style={{ margin: 0 }}>Nabil Bank, Nepal Telecom and Himalayan Bank make up 62% of the portfolio.</p>
      </CardSection>
      <CardSectionRow>
        <CardSection title="Bought" headingLevel={3}><MoneyDisplay currency="NPR" value={18450000n} /></CardSection>
        <CardSection title="Sold" headingLevel={3}><MoneyDisplay currency="NPR" value={7120000n} /></CardSection>
      </CardSectionRow>
      <CardSection foot><p>Source: broker statements. Nothing here is advice.</p></CardSection>
    </Card>
  );
}

function SettingRowFixture() {
  return (
    <Card label="Settings">
      <SettingList>
        <SettingRow title="Daily summary" line="On · one summary after the close" toggle={{ checked: true, onChange: () => {} }} />
        <SettingRow title="Profile" line="A very long line of words that wraps onto a second row on a narrow screen without cutting" href="/me" />
        <SettingRow title="Terms" href="https://example.com/terms" newTab />
        <SettingRow danger title="Delete account" line="This cannot be undone" onClick={() => {}} />
      </SettingList>
    </Card>
  );
}

function LinkRowFixture() {
  return (
    <Card title="Watchlist" flush>
      <LinkRowList label="Watchlist">
        <LinkRow href="/stocks/NABIL" symbol="NABIL" name="Nabil Bank Limited with a very long name that truncates before the symbol" pill={<StatusTag>Banks</StatusTag>} line="Rs 1,250.00 · +1.20% today" value="Rs 1,250" caption="Today" />
        <LinkRow href="/stocks/HBL" symbol="HBL" name="Himalayan Bank" line="Held: 0 units" value="No cash" tone="neutral" />
        <LinkRow href="/stocks/SHL" symbol="SHL" dense line="Down from your cost" value="-56.82%" tone="warn" />
      </LinkRowList>
    </Card>
  );
}


function ScoreRadarFixture() {
  const five = [
    { key: 'value', label: 'Value', score: 2, comparison: 3 },
    { key: 'growth', label: 'Future growth', score: 4, comparison: 4 },
    { key: 'past', label: 'Past performance', score: 5, comparison: 3 },
    { key: 'health', label: 'Financial health', score: 6, comparison: 4 },
    { key: 'income', label: 'Dividends', score: 4, comparison: 2 },
  ];
  const eight = ['Future performance outlook', 'Past performance record', 'Financial health and leverage', 'Dividend track record', 'Value against peers', 'Ownership', 'Management quality', 'Liquidity'].map((label, i) => ({ key: `k${i}`, label, score: (i * 5) % 7 }));
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <ScoreRadar label="Company scores" axes={five} labels={{ comparison: 'Sector average' }} defaultSelected="health" />
      <div style={{ maxWidth: 320 }}>
        <ScoreRadar label="Eight long axis names at 320px" axes={eight} />
      </div>
      <ScoreRadar label="Weak total" axes={five.map((a) => ({ ...a, score: 1, comparison: undefined }))} />
    </div>
  );
}

function FairValueBarFixture() {
  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 560 }}>
      <FairValueBar label="Undervalued" price="1284.50" fairValue="1670.00" />
      <FairValueBar label="About fair value" price="990.00" fairValue="1000.00" />
      <FairValueBar label="Overvalued" price={money(231_050n, 'NPR')} fairValue={money(150_000n, 'NPR')} thresholds={{ undervalued: 10, overvalued: 30 }} />
      <FairValueBar label="Far above" price="5200.00" fairValue="1000.00" />
    </div>
  );
}

function PriceTargetChartFixture() {
  const closes = [1010.5, 1032, 1018.25, 1046, 1071.75, 1058, 1089.5, 1102, 1094.25, 1121.5, 1138, 1127.75];
  const history = closes.map((c, i) => ({ date: new Date(Date.UTC(2026, i, 28)).toISOString().slice(0, 10), close: c.toFixed(2) }));
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 640 }}>
      <PriceTargetChart label="Price and analyst targets" history={history} targets={{ date: '2027-11-28', low: '1040.00', average: '1295.50', high: '1480.00' }} />
      <PriceTargetChart label="Targets close together" height={200} history={history} targets={{ date: '2027-05-28', low: '1127.00', average: '1128.50', high: '1130.00' }} />
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
  'instrument-header': InstrumentHeaderFixture,
  'broker-badge': BrokerBadgeFixture,
  'headline-list': HeadlineListFixture,
  'rating-scale': RatingScaleFixture,
  'month-strip': MonthStripFixture,
  'bar-list': BarListFixture,
  'alert-row': AlertRowFixture,
  'alert-summary': AlertSummaryFixture,
  'month-grid': MonthGridFixture,
  'returns-heat-table': ReturnsHeatTableFixture,
  'histogram': HistogramFixture,
  'correlation-matrix': CorrelationMatrixFixture,
  'performance-chart-layers': PerformanceLayersFixture,
  'range-editor': RangeEditorFixture,
  'filter-menu': FilterMenuFixture,
  'preset-tile': PresetTileFixture,
  'filter-bar': FilterBarFixture,
  'scroll-table': ScrollTableFixture,
  'watchlist-columns': WatchlistColumnsFixture,
  'theme-provider': ThemeProviderFixture,
  'private-amount': PrivateAmountFixture,
  'skip-link': SkipLinkFixture,
  'route-announcer': RouteAnnouncerFixture,
  'card-section': CardSectionFixture,
  'setting-row': SettingRowFixture,
  'link-row': LinkRowFixture,
  'score-radar': ScoreRadarFixture,
  'fair-value-bar': FairValueBarFixture,
  'price-target-chart': PriceTargetChartFixture,
  // new:component inserts registry entries above this line
};
