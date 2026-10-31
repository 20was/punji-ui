// Fixtures for the money components and the modules migrated into the kit
// (meters, figures, bars, charts, lists, pagination). Same conventions as
// fixtures.tsx: synthetic NEPSE/NPR data, one registry entry per fixture.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Button, Breakdown, BreakdownRow, Card, CardLink, CheckList, CheckRow, ChoiceGroup, ColumnChart, ColumnLegend, CurrencyInput, DataRow, DataRows,
  DateRangePicker, DistributionBar, DivergingBar, FactList, FigureChip, HeadlineFigure, InlineState, KeyStats, LinkTable, LinkTableRow, MeterBar,
  MetricRow, MetricTile, MoneyDisplay, NetBar, NetBarHead, OrderBookDepth, Pagination, PriceChange, RangeBar, RetryNote, ShareBar, ShareDonut,
  Sparkline, SplitBar, StatusDisc, StatusPill, StepList, StockLabel, SummaryFigure, formatNepalNumber, nepalMoneyConfig, usePagination,
  type CurrencyInputChange, type DateRange, type ShareItem,
} from '@punji/ui';
import { bookAsks, bookBids, dividendColumns, dividendSeries, nabilCloses, today } from './data.ts';

const noop = () => undefined;
const Group = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title}><h2 className="vr-h">{title}</h2><div className="vr-row" style={{ marginTop: 8 }}>{children}</div></section>;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title}><h2 className="vr-h">{title}</h2><div style={{ marginTop: 8 }}>{children}</div></section>;
const Glyph = ({ d = 'M8 2v12M2 8h12' }: { d?: string }) => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d={d} stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>;
const rs = (v: number) => `Rs ${formatNepalNumber(v, { fractionDigits: 0 })}`;
const lakh = (v: number) => `${v < 0 ? '-' : ''}${Math.abs(v) >= 100_000 ? `${+(Math.abs(v) / 100_000).toFixed(2)}L` : `${Math.round(Math.abs(v) / 1000)}K`}`;

const npr = nepalMoneyConfig();
const usd = { currency: 'USD', locale: 'en-US' } as const;

function MoneyDisplayFixture() {
  return <div className="vr-grid">
    <Block title="NPR (lakh and crore)"><div style={{ display: 'grid', gap: 6 }}>
      <MoneyDisplay preset={npr} value={124835000n} />
      <MoneyDisplay preset={npr} value={-4875050n} />
      <MoneyDisplay preset={npr} value={0n} />
      <MoneyDisplay preset={npr} value="1248350.5" />
    </div></Block>
    <Block title="USD, JPY, KWD"><div style={{ display: 'grid', gap: 6 }}>
      <MoneyDisplay {...usd} value={123456789n} />
      <MoneyDisplay currency="JPY" locale="en-US" value={1250000n} />
      <MoneyDisplay currency="KWD" locale="en-US" value={12345678n} />
      <MoneyDisplay {...usd} display="name" value={150000n} />
    </div></Block>
    <Block title="Accounting negative"><div style={{ display: 'grid', gap: 6 }}>
      <MoneyDisplay {...usd} accounting value={-123456n} />
      <MoneyDisplay {...usd} accounting value={123456n} />
      <MoneyDisplay {...usd} signDisplay="always" value={9900n} />
    </div></Block>
    <Block title="Missing"><div style={{ display: 'grid', gap: 6 }}>
      <MoneyDisplay preset={npr} value={null} />
      <MoneyDisplay preset={npr} value={undefined} missing="Not published" />
      <MoneyDisplay preset={npr} value="not a number" />
    </div></Block>
    <Block title="Compact"><div style={{ display: 'grid', gap: 6 }}>
      <MoneyDisplay preset={npr} compact value={124835000000n} />
      <MoneyDisplay preset={npr} compact value={4875050n} />
      <MoneyDisplay {...usd} compact value={123456789012n} />
    </div></Block>
    <Block title="In a tight cell"><div style={{ width: 168, border: '1px solid var(--pu-color-border)', padding: 8 }}><MoneyDisplay preset={npr} value={124835000n} /></div></Block>
  </div>;
}

function PriceChangeFixture() {
  return <div className="vr-grid">
    <Block title="Green up (default)"><div style={{ display: 'grid', gap: 6 }}>
      <PriceChange preset={npr} current={48750n} previous={48140n} />
      <PriceChange preset={npr} current={84200n} previous={84600n} />
      <PriceChange preset={npr} current={33120n} previous={33120n} />
      <PriceChange preset={npr} current={null} previous={33120n} />
    </div></Block>
    <Block title="Red up"><div style={{ display: 'grid', gap: 6 }}>
      <PriceChange preset={npr} convention="red-up" current={48750n} previous={48140n} />
      <PriceChange preset={npr} convention="red-up" current={84200n} previous={84600n} />
      <PriceChange preset={npr} convention="red-up" current={33120n} previous={33120n} />
    </div></Block>
    <Block title="Small, in a table row"><div style={{ display: 'grid', gap: 6 }}>
      <PriceChange preset={npr} size="sm" current={48750n} previous={48140n} />
      <PriceChange preset={npr} size="sm" current={84200n} previous={84600n} />
      <PriceChange preset={npr} size="sm" showAbsolute={false} current={21500n} previous={21010n} />
    </div></Block>
    <Block title="USD"><PriceChange {...usd} current={18235n} previous={17980n} /></Block>
  </div>;
}

function CurrencyCase({ label, initial, currency, locale, preset, error, disabled, hint, focusOnMount, testId }: {
  label: string; initial: string; currency?: string; locale?: string; preset?: typeof npr; error?: string; disabled?: boolean; hint?: string; focusOnMount?: boolean; testId?: string;
}) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusOnMount) ref.current?.focus(); }, [focusOnMount]);
  return <CurrencyInput label={label} value={v} onValueChange={(c: CurrencyInputChange) => setV(c.value)} {...(currency ? { currency } : {})} {...(locale ? { locale } : {})} {...(preset ? { preset } : {})} {...(error ? { error } : {})} {...(hint ? { hint } : {})} disabled={disabled} ref={ref} testId={testId} />;
}
function CurrencyInputFixture() {
  return <div className="vr-grid">
    <CurrencyCase label="Amount (empty)" initial="" preset={npr} hint="Rs, to the paisa" testId="vr-ci" />
    <CurrencyCase label="Amount (filled)" initial="1248350.5" preset={npr} />
    <CurrencyCase label="Amount (error)" initial="12.5" preset={npr} error="Minimum order is Rs 100" />
    <CurrencyCase label="Amount (disabled)" initial="9800" preset={npr} disabled />
    <CurrencyCase label="Amount (focus)" initial="487.5" preset={npr} focusOnMount />
    <CurrencyCase label="Yen (no fraction)" initial="1250000" currency="JPY" locale="en-US" testId="vr-ci-jpy" />
    <CurrencyCase label="Dinar (three digits)" initial="12.345" currency="KWD" locale="en-US" />
    <CurrencyCase label="Dollars" initial="1234.5" currency="USD" locale="en-US" />
  </div>;
}

function OrderBookDepthFixture() {
  const labels = {
    buyQty: 'Buy quantity', bid: 'Bid', ask: 'Ask', sellQty: 'Sell quantity', caption: 'Order book for NABIL',
    buyTotal: (p: string, q: string) => `Buy ${p} · ${q}`, sellTotal: (p: string, q: string) => `Sell ${p} · ${q}`,
  };
  return <div className="vr-grid">
    <Card title="NABIL depth"><OrderBookDepth bids={bookBids} asks={bookAsks} labels={labels} testId="vr-depth" /></Card>
    <Card title="Uneven book, published totals"><OrderBookDepth bids={bookBids.slice(0, 3)} asks={bookAsks} totals={{ buy: 41_210, sell: 29_450 }} labels={labels} /></Card>
  </div>;
}

function CardKitFixture() {
  return <div className="vr-grid">
    <Card eyebrow="Selected sector" title="Commercial banks" description="21 listed companies">Sector turnover Rs 41.2 crore.</Card>
    <Card size="lg" eyebrow="Portfolio" title="Worth now" action={<StatusPill tone="gain" dot>Open</StatusPill>}>Rs 12,48,350.00</Card>
    <Card tone="inverse" eyebrow="Summary" size="lg" title="If you sold today" description="After fees" meta="9 holdings" action={<CardLink href="#portfolio">Open</CardLink>}>Rs 12,41,000</Card>
    <Card title="Watchlist" meta="9" action={<Button size="sm" variant="ghost">Edit</Button>}>Meta beside a title.</Card>
  </div>;
}

function CardNarrowFixture() {
  return <div style={{ width: 270 }}>
    <Card title="Banking and finance holdings" meta="Updated 3:00 PM" description="Across three accounts">Meta in a narrow card.</Card>
    <div style={{ height: 12 }} />
    <Card title="Watchlist" meta="9 of 24 shown" action={<Button size="sm" variant="ghost">Edit</Button>}>Meta and an action in a narrow card.</Card>
  </div>;
}

function RowsKitFixture() {
  return <div className="vr-grid">
    <Card title="Today's range"><DataRows label="Range" flush>
      <DataRow label="Last traded" value="Rs 547.00" bar={<RangeBar fill={547} domain={[512, 560]} marks={[{ value: 547, kind: 'strong' }]} />} note="547.00 sits 73% of the way up the day's range" />
      <DataRow label="Volume" value="41,210" bar={<MeterBar parts={[{ value: 62, tone: 'chart' }]} max={100} />} />
      <DataRow label="Only a note" value="Rs 1,020.00" note="Previous close" total />
    </DataRows></Card>
    <Group title="Status pill info"><StatusPill tone="info">Info</StatusPill><StatusPill tone="info" dot>Delayed 15 min</StatusPill><StatusPill tone="info" size="sm">Small</StatusPill></Group>
    <Group title="Button external link">
      <Button href="https://www.nepalstock.com" variant="secondary">NEPSE website</Button>
      <Button href="https://www.sebon.gov.np" variant="ghost" size="sm">SEBON</Button>
      <Button href="https://www.cdsc.com.np" external iconOnly label="CDSC" icon={<Glyph />} />
    </Group>
    <RetryNote retryLabel="Try again" onRetry={noop}>Could not load your holdings.</RetryNote>
    <div style={{ maxWidth: 260 }}><RetryNote retryLabel="Try again" onRetry={noop}>Could not load the order book for Himalayan Distillery Limited right now.</RetryNote></div>
  </div>;
}

function MetersFixture() {
  const shares: ShareItem[] = [
    { key: 'b', label: 'Banking', sub: '6 holdings', pct: 52.4, tone: 'chart' },
    { key: 'h', label: 'Hydropower', pct: 24.1, tone: 'series2' },
    { key: 'i', label: 'Insurance', pct: 13.5, tone: 'series3' },
    { key: 'o', label: 'Others', pct: 10, tone: 'rest' },
  ];
  return <div className="vr-grid">
    <Card title="MeterBar"><div style={{ display: 'grid', gap: 12 }}>
      <MeterBar parts={[{ value: 62, tone: 'chart' }]} max={100} label="62 of 100" />
      <MeterBar parts={[{ value: 40, tone: 'gain' }, { value: 25, tone: 'loss' }]} max={100} marker={55} />
      <MeterBar parts={[]} max={100} label="Empty" />
    </div></Card>
    <Card title="RangeBar"><div style={{ display: 'grid', gap: 18 }}>
      <RangeBar head="52-week range" fill={547} domain={[412, 689]} marks={[{ value: 412, kind: 'edge', label: 'Rs 412' }, { value: 547, kind: 'strong', label: 'Rs 547' }, { value: 689, kind: 'edge', label: 'Rs 689' }]} />
      <RangeBar span={[480, 560]} domain={[412, 689]} marks={[{ value: 520, kind: 'dot', label: 'Avg' }, { value: 600, kind: 'tick', label: 'Target' }]} legend={['Low', 'Mid', 'High']} label="Span of 480 to 560" />
    </div></Card>
    <Card title="ShareBar"><ShareBar label="Banking 52.4 percent, Hydropower 24.1 percent, Insurance 13.5 percent, Others 10 percent" items={shares} foot="Share of portfolio value" /></Card>
    <Card title="ShareBar (list legend, selectable)"><ShareBar legend="list" label="Sector shares" items={shares.map((s) => ({ ...s, onSelect: noop, selected: s.key === 'h' }))} /></Card>
    <Card title="ShareDonut"><div className="vr-row">
      <ShareDonut items={shares} label="Sector shares" count="4" unit="sectors" />
      <ShareDonut items={shares} label="Sector shares, small" size="sm" />
    </div></Card>
    <Card title="DistributionBar"><DistributionBar label="Holdings by return band" foot="Count of holdings" items={[
      { key: 'a', label: 'Below -10%', count: 2, step: 0 }, { key: 'b', label: '-10% to 0%', count: 5, step: 1 }, { key: 'c', label: '0% to 10%', count: 9, step: 2 },
      { key: 'd', label: '10% to 25%', count: 6, step: 3 }, { key: 'e', label: 'Above 25%', count: 3, step: 4 },
    ]} /></Card>
  </div>;
}

function FiguresKitFixture() {
  return <div className="vr-grid">
    <Block title="SummaryFigure"><div style={{ display: 'grid', gap: 12 }}>
      <SummaryFigure label="If you sold everything today" value="Rs 1,24,500" note="after Rs 1,120 fees" />
      <SummaryFigure tone="tint" label="Net gain" value="+Rs 26,800" note="27.3% on cost" />
      <SummaryFigure size="lg" label="Long label that must wrap cleanly on a narrow phone screen without truncating" value="Rs 12,48,35,000.00" />
    </div></Block>
    <Block title="HeadlineFigure">
      <HeadlineFigure label="Worth now" currency="Rs" value="12,48,000" line="Across 14 holdings." labelAction={<Button size="sm" variant="ghost">Hide</Button>} aside="NPR">
        <FigureChip tone="up" srLabel="Gain">+Rs 8,240 (+0.7%) today</FigureChip>
        <FigureChip tone="down" srLabel="Loss">-Rs 21,400 (-1.7%) this week</FigureChip>
        <FigureChip tone="flat">Rs 0 this hour</FigureChip>
      </HeadlineFigure>
    </Block>
    <Block title="HeadlineFigure lg"><HeadlineFigure size="lg" label="Day return" value={<MoneyDisplay preset={npr} value={824000n} />}><FigureChip tone="up">+0.7%</FigureChip></HeadlineFigure></Block>
  </div>;
}

function CheckListFixture() {
  return <div className="vr-grid">
    <Card title="Portfolio checks" flush><CheckList label="Portfolio checks">
      <CheckRow icon={<Glyph d="M3 8l3 3 7-7" />} tone="gain" title="Diversification" line="Seven sectors held" figure="7" status={{ label: 'Good', tone: 'gain' }} />
      <CheckRow icon={<Glyph />} tone="warn" title="Concentration" line="Banking is 62% of holdings" figure="62%" figureSub="+4.1%" figureSubTone="loss" status={{ label: 'Watch', tone: 'warn' }} onClick={noop} pressed />
      <CheckRow icon={<Glyph />} tone="loss" title="Single stock weight" line="NABIL is over a quarter of value" trail={<Sparkline values={nabilCloses} width={64} height={22} />} figure="27%" status={{ label: 'High', tone: 'loss' }} href="#detail" />
      <CheckRow icon={<Glyph />} tone="info" title="Dividend history" line="Two years of cash dividends" kind="report" action={<Button size="sm" variant="ghost">Open</Button>} />
      <CheckRow icon={<Glyph />} tone="series3" title="Fees" line="Brokerage commission paid this year" figure={rs(14_250)} />
    </CheckList></Card>
    <Group title="StatusDisc">
      {(['neutral', 'gain', 'warn', 'loss', 'info', 'series3'] as const).map((t) => <StatusDisc key={t} tone={t}><Glyph /></StatusDisc>)}
      <StatusDisc size="lg" tone="gain"><Glyph /></StatusDisc>
    </Group>
  </div>;
}

function CheckTabsFixture() {
  const [on, setOn] = useState('a');
  const tabs = [{ id: 'a', title: 'Concentration', line: 'Banking is 62% of holdings', tone: 'warn' as const }, { id: 'b', title: 'Diversification', line: 'Seven sectors held', tone: 'gain' as const }, { id: 'c', title: 'Fees', line: 'Rs 14,250 this year', tone: 'neutral' as const }];
  return <div className="vr-grid">
    <CheckList role="tablist" label="Check details" testId="vr-checktabs">
      {tabs.map((t) => <CheckRow key={t.id} icon={<Glyph />} tone={t.tone} title={t.title} line={t.line} onClick={() => setOn(t.id)} tab={{ selected: on === t.id, controls: 'vr-check-panel', id: `vr-check-tab-${t.id}`, tabIndex: on === t.id ? 0 : -1 }} testId={`vr-check-tab-${t.id}`} />)}
    </CheckList>
    <div id="vr-check-panel" role="tabpanel" aria-labelledby={`vr-check-tab-${on}`} tabIndex={0} data-testid="vr-check-panel">Detail: {on}</div>
  </div>;
}

function InlineStateFixture() {
  return <div className="vr-grid">
    <Card title="Locked"><InlineState icon="lock" title="Not included on this account" body="Upgrade to see broker analytics." actions={<Button size="sm" variant="secondary">See plans</Button>} /></Card>
    <Card title="Failed"><InlineState icon="error" tone="error" role="alert" title="Could not load orders" body="Check your connection." actions={<Button size="sm">Try again</Button>} /></Card>
    <Card title="Offline row"><InlineState icon="offline" tone="warn" layout="row" role="status" title="Offline. Prices last updated 11:02." /></Card>
    <Card title="Empty"><InlineState icon="chart" title="No trades yet" body="Your first NABIL purchase will show here." /></Card>
    <Card title="Bare, stale"><InlineState bare icon="clock" tone="warn" title="Prices are 15 minutes old" /></Card>
    <Group title="Every icon">{(['lock', 'error', 'clock', 'offline', 'info', 'star', 'bell', 'chart', 'eyeOff', 'check'] as const).map((i) => <InlineState key={i} bare icon={i} title={i} />)}</Group>
  </div>;
}

function KeyStatsFixture() {
  const items = [{ label: 'Open', value: 'Rs 1,020.00' }, { label: 'EPS', value: '38.2', sub: 'Q1 2082/83' }, { label: 'P/E', value: null }, { label: 'Day change', value: '+1.25%', tone: 'up' as const }, { label: 'Week change', value: '-2.10%', tone: 'down' as const }, { label: 'Book value', value: 'Rs 214.50' }];
  return <div className="vr-grid">
    <Card title="Grid, 2 columns"><KeyStats label="NABIL session" empty="Not published" items={items} /></Card>
    <Card title="Grid, 3 columns"><KeyStats cols={3} label="NABIL session 3" empty="Not published" items={items} /></Card>
    <Card title="Strip"><KeyStats layout="strip" label="NABIL strip" empty="Not published" items={items.slice(0, 4)} /></Card>
    <Card title="Loading"><KeyStats loading label="Loading stats" empty="Not published" items={items.slice(0, 4)} /></Card>
    <Card title="FactList"><FactList title="Listing" facts={[{ label: 'Sector', value: 'Commercial banks' }, { label: 'Listed shares', value: '26,41,50,000' }, { label: 'Dividend', value: 'Need 5 years', quiet: true }]} /></Card>
    <Card title="FactList stacked"><FactList stack title="Listing stacked" facts={[{ label: 'Sector', value: 'Commercial banks' }, { label: 'Registrar', value: 'Nabil Investment Banking Limited' }]} /></Card>
  </div>;
}

function StepListFixture() {
  const steps = [{ title: 'Add a holding', body: 'Search for NABIL' }, { title: 'Set an alert', body: 'Get told when it crosses a price' }, { title: 'Import a statement' }];
  const [open, setOpen] = useState(true);
  return <div className="vr-grid">
    <StepList title="Start with your first holding" eyebrow="New here" lead="Three steps." foot="You can skip any of these." current={0} steps={steps} />
    <StepList tone="plain" layout="rows" title="Rows, plain" current={1} steps={steps} />
    <StepList tone="plain" layout="rows" title="No current step" current={-1} steps={steps} />
    {open ? <div style={{ gridColumn: '1 / -1' }}><StepList layout="banner" title="Banner" lead="Two quick steps." current={0} steps={steps.slice(0, 2)} onDismiss={() => setOpen(false)} /></div> : null}
  </div>;
}

function CardLinkFixture() {
  return <div className="vr-grid">
    <Card title="In-app link" action={<CardLink href="#portfolio">Open portfolio</CardLink>}>Same tab, chevron.</Card>
    <Card title="External link" action={<CardLink href="https://www.nepalstock.com">NEPSE</CardLink>}>New tab, arrow.</Card>
    <Card title="Long label in a narrow card" action={<CardLink href="#all">See every holding across all accounts</CardLink>}>Wraps beside the title.</Card>
  </div>;
}

function LinkTableFixture() {
  const rows = [
    { s: 'NABIL', n: 'Nabil Bank', u: '120 shares', v: 'Rs 58,500', c: '+1.25%' },
    { s: 'NTC', n: 'Nepal Telecom', u: '40 shares', v: 'Rs 33,680', c: '-0.47%' },
    { s: 'HDL', n: 'Himalayan Distillery Limited', u: '25 shares', v: 'Rs 53,750', c: '+2.31%' },
  ];
  return <Card title="Holdings" flush><LinkTable label="Holdings" columns={[{ key: 's', label: 'Stock', track: 'minmax(0, 1.4fr)' }, { key: 'u', label: 'Units', track: '100px', end: true }, { key: 'v', label: 'Value', track: '110px', end: true }, { key: 'c', label: 'Change', track: '80px', end: true }]}>
    {rows.map((r) => <LinkTableRow key={r.s} href={`#stock-${r.s}`} cells={[<StockLabel key="a" symbol={r.s} tag="A" line={r.n} />, r.u, r.v, r.c]} compact={{ lead: <StockLabel symbol={r.s} line={r.n} extra={r.u} />, trail: r.v }} />)}
  </LinkTable></Card>;
}

function BarsFixture() {
  return <div className="vr-grid">
    <Card title="SplitBar"><div style={{ display: 'grid', gap: 14 }}>
      <SplitBar parts={[{ key: 'u', value: 141, tone: 'gain', label: '141 up' }, { key: 'f', value: 12, tone: 'neutral', label: '12 unchanged' }, { key: 'd', value: 96, tone: 'loss', label: '96 down' }]} />
      <SplitBar label="Bought 58 percent, sold 42 percent" parts={[{ key: 'b', value: 58, tone: 'chart' }, { key: 's', value: 42, tone: 'nepse' }]} />
      <SplitBar label="Empty split" parts={[{ key: 'z', value: 0, tone: 'gain' }, { key: 'n', value: -5, tone: 'loss' }]} />
    </div></Card>
    <Card title="DivergingBar"><div style={{ display: 'grid', gap: 10 }}>
      <DivergingBar value={32} max={100} label="Up 32" />
      <DivergingBar value={-68} max={100} label="Down 68" />
      <DivergingBar value={0} max={100} label="Flat" />
    </div></Card>
    <Card title="NetBar"><div style={{ display: 'grid', gap: 8 }}>
      <div style={{ font: '600 12px var(--pu-font-body)', color: 'var(--pu-color-text-muted)' }}><NetBarHead left="Sold" right="Bought" /></div>
      <NetBar value={42_000} max={100_000} text="+42,000" tip={{ title: 'Broker 58', rows: [{ label: 'Bought', value: '86,000', tone: 'gain' }, { label: 'Sold', value: '44,000', tone: 'loss' }] }} />
      <NetBar value={-76_500} max={100_000} text="-76,500" />
      <NetBar value={0} max={100_000} text="0" />
    </div></Card>
  </div>;
}

function SparklineFixture() {
  return <div className="vr-grid">
    <Group title="Normal"><Sparkline values={nabilCloses} label="NABIL, 30 days" /><Sparkline values={nabilCloses} tone="chart" width={140} height={40} /><Sparkline values={nabilCloses.toReversed()} label="Falling" /><Sparkline values={[5, 5, 5, 5]} label="Flat" /></Group>
    <Group title="Fewer than two points"><Sparkline values={[]} /><Sparkline values={[487.5]} /><Sparkline values={null} /><Sparkline values={[null, undefined, Number.NaN]} /></Group>
    <Group title="With nulls"><Sparkline values={[471, null, 475, undefined, 480, Number.NaN, 487, 484]} label="With gaps" /></Group>
    <Block title="Fluid"><div style={{ width: '100%' }}><Sparkline values={nabilCloses} fluid width={300} height={48} label="Fluid sparkline" /></div></Block>
  </div>;
}

function ColumnChartFixture() {
  const common = { format: rs, formatAxis: lakh } as const;
  const series = dividendSeries;
  return <div className="vr-grid" style={{ gridTemplateColumns: '1fr' }}>
    <Card title="Normal"><ColumnChart legend label="Dividends received by fiscal year" series={series} columns={dividendColumns} {...common} /></Card>
    <Card title="Empty"><ColumnChart label="No dividends yet" series={series} columns={[]} {...common} /></Card>
    <Card title="All zero"><ColumnChart label="No dividends this period" series={series.slice(0, 1)} columns={[{ key: 'a', label: '2081/82', values: [0] }, { key: 'b', label: '2082/83', values: [null] }]} {...common} /></Card>
    <Card title="Negative"><ColumnChart legend label="Realised gain and loss" series={[{ key: 'g', label: 'Gain', tone: 'gain' }, { key: 'l', label: 'Loss', tone: 'loss' }]} columns={[{ key: 'a', label: 'Q1', values: [120_000, -45_000] }, { key: 'b', label: 'Q2', values: [30_000, -98_000] }, { key: 'c', label: 'Q3', values: [0, -12_000] }, { key: 'd', label: 'Q4', values: [210_000, 0] }]} {...common} /></Card>
    <Card title="Outlier"><ColumnChart label="One large dividend year" series={series.slice(0, 1)} columns={[{ key: 'a', label: '2079/80', values: [12_000] }, { key: 'b', label: '2080/81', values: [9_500] }, { key: 'c', label: '2081/82', values: [1_850_000] }, { key: 'd', label: '2082/83', values: [14_200] }]} {...common} /></Card>
  </div>;
}

function ColumnLegendCardFixture() {
  return <div className="vr-grid">
    <Card title="Dividends by year" description="Three series" action={<ColumnLegend series={dividendSeries} />}><ColumnChart label="Dividends in the card" series={dividendSeries} columns={dividendColumns} format={rs} formatAxis={lakh} /></Card>
    <Card title="Dividends" action={<ColumnLegend series={dividendSeries.slice(0, 2)} />}><ColumnChart label="Dividends two series" series={dividendSeries.slice(0, 2)} columns={dividendColumns} format={rs} formatAxis={lakh} /></Card>
  </div>;
}

function BreakdownFixture() {
  return <div className="vr-grid">
    <Breakdown live>
      <BreakdownRow label="Sale amount" note="100 shares at Rs 1,240" value="Rs 1,24,000.00" />
      <BreakdownRow label="Broker commission" note="0.40% of the amount" value="- Rs 497.00" tone="down" />
      <BreakdownRow label="Capital gain" value="+ Rs 8,240.00" tone="up" />
      <BreakdownRow label="You receive" total value={<MoneyDisplay value="123503.00" preset={npr} />} />
    </Breakdown>
    <Breakdown tone="tint">
      <BreakdownRow label="Invested" value="Rs 9,80,000" />
      <BreakdownRow label="Current value" value="Rs 12,48,000" />
      <BreakdownRow label="Return" total value="+Rs 2,68,000" tone="up" />
    </Breakdown>
  </div>;
}

function PagerLive() {
  const pager = usePagination({ total: 12, defaultPageSize: 5 });
  return <Pagination {...pager} onPageChange={pager.setPage} label="Holdings pages" testId="vr-pager" />;
}
function PaginationFixture() {
  const common = { pageSize: 5, onPageChange: noop, label: 'Pages' } as const;
  return <div className="vr-grid">
    <Block title="First page"><Pagination {...common} page={1} total={12} /></Block>
    <Block title="Middle page"><Pagination {...common} page={2} total={20} /></Block>
    <Block title="Last page"><Pagination {...common} page={3} total={12} /></Block>
    <Block title="0 of 0"><Pagination {...common} page={1} total={0} /></Block>
    <Block title="Many pages, no numbers"><Pagination {...common} page={4} total={120} /></Block>
    <Block title="Interactive"><PagerLive /></Block>
  </div>;
}

function MetricTileFixture() {
  return <div className="vr-grid" style={{ gridTemplateColumns: '1fr' }}>
    <Card title="Portfolio totals"><MetricRow label="Portfolio totals">
      <MetricTile label="Invested" value="Rs 9,80,000" note="14 holdings" meter={<MeterBar parts={[{ value: 80, tone: 'chart' }]} max={100} />} />
      <MetricTile tone="inverse" label="Total return" value="+Rs 2,68,000" note="27.3% on cost" meter={<MeterBar parts={[{ value: 27, tone: 'gain' }]} max={100} />} />
      <MetricTile label="Day change" value="-Rs 4,200" note="-0.3%" meter={<MeterBar parts={[{ value: 12, tone: 'loss' }]} max={100} />} />
      <MetricTile label="Dividends" value="Rs 31,000" note="This fiscal year" />
    </MetricRow></Card>
    <Card title="Compact, three across"><MetricRow label="Compact totals" count={3} dense>
      <MetricTile compact label="Holdings" value="14" note="6 sectors" />
      <MetricTile compact label="Advancers" value="142" note="of 264" />
      <MetricTile compact label="Turnover" value="Rs 48.2 cr" note="Today" />
    </MetricRow></Card>
  </div>;
}

function ChoiceCompactPageFixture() {
  const [side, setSide] = useState('sell');
  return <div style={{ display: 'grid', gap: 12 }}>
    <ChoiceGroup appearance="compact" size="md" options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }, { value: 'sip', label: 'SIP' }]} value={side} onChange={setSide} label="Compact side on the page" testId="vr-choice-page" />
    <ChoiceGroup appearance="compact" size="sm" options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} value="buy" onChange={noop} label="Small compact on the page" testId="vr-choice-page-sm" />
  </div>;
}

function DateRangeNarrowFixture() {
  const [r, setR] = useState<DateRange | null>(null);
  return <div style={{ display: 'grid', gap: 16 }}>
    <div style={{ width: 284 }}><DateRangePicker label="Statement period" value={r} onChange={setR} today={today} defaultMonth="2025-11-01" testId="vr-drp-narrow" /></div>
    <div style={{ width: 284 }}><DateRangePicker label="Statement period (set)" value={{ start: '2025-11-03', end: '2025-11-14' }} onChange={noop} today={today} defaultMonth="2025-11-01" /></div>
  </div>;
}

export const kitRegistry: Record<string, () => ReactNode> = {
  'money-display': MoneyDisplayFixture, 'price-change': PriceChangeFixture, 'currency-input': CurrencyInputFixture, 'order-book-depth': OrderBookDepthFixture,
  'card-kit': CardKitFixture, 'card-narrow': CardNarrowFixture, 'rows-kit': RowsKitFixture, meters: MetersFixture, 'figures-kit': FiguresKitFixture,
  'check-list': CheckListFixture, 'check-list-tabs': CheckTabsFixture, 'inline-state': InlineStateFixture, 'key-stats': KeyStatsFixture, 'step-list': StepListFixture,
  'card-link': CardLinkFixture, 'link-table': LinkTableFixture, bars: BarsFixture, sparkline: SparklineFixture, 'column-chart': ColumnChartFixture,
  'column-legend-card': ColumnLegendCardFixture, breakdown: BreakdownFixture, pagination: PaginationFixture, 'metric-tile': MetricTileFixture,
  'choice-compact-page': ChoiceCompactPageFixture, 'date-range-narrow': DateRangeNarrowFixture,
};
