import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AppShell, Avatar, Button, Calendar, Card, Checkbox, Chip, ChipRow, ChoiceGroup, CommandPalette, CompanySearch, Cell, CountBadge,
  DataListRow, DataRow, DataRows, DataTable, DatePicker, DateRangePicker, Delta, Drawer, DrawerBody, DrawerFooter, DrawerHeader,
  DrawerScreen, EmptyState, Field, FilterChip, Figure, FinancialSummary, FinancialTable, InfoTip, InlineConfirm, ListFilter,
  ListSectionHeader, LiveFigure, LockedNote, NumberField, Note, OrderBook, PageHeader, PageLayout, PanelTabs, Popover, PopoverAnchor,
  PriceChart, PriceField, RangeSlider, RowList, SegmentedControl, Select, SelectField, Sheet, ShowMore, Skeleton, SkeletonText,
  StatGrid, StatTile, StatusPill, StatusTag, Switch, SymbolField, Tabs, TextAreaField, DateField, ToastProvider, Tooltip, ValueRow,
  formatNPR, formatNepalNumber, formatPercent, useToast, type CommandItem, type DateRange, type FinancialColumn,
} from '@punji/ui';
import { holdings, symbols, today, weeklyValue, type Holding } from '../../fixtures/market-data.ts';
import { bankingRegistry } from './fixtures-banking.tsx';
import { layoutRegistry } from './fixtures-layout.tsx';
import { chartsRegistry } from './fixtures-charts.tsx';
import { domainRegistry } from './fixtures-domain.tsx';
import { fitRegistry } from './fixtures-fit.tsx';
import { rtlRegistry } from './fixtures-rtl.tsx';
import { portfolioRegistry } from './fixtures-portfolio.tsx';
import { kitRegistry } from './fixtures-kit.tsx';
import { formsRegistry } from './fixtures-forms.tsx';
import { tableScaleRegistry } from './fixtures-table-scale.tsx';
import { tradingRegistry } from './fixtures-trading.tsx';
import { shareIssuesRegistry } from './fixtures-share-issues.tsx';
import { walletRegistry } from './fixtures-wallet.tsx';
import { lendingRegistry } from './fixtures-lending.tsx';
// Tax, invoicing and payroll fixtures.
import { taxRegistry } from './fixtures-tax.tsx';

const money = (v: number | null) => formatNPR(v);
const Group = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title}><h2 className="vr-h">{title}</h2><div className="vr-row" style={{ marginTop: 8 }}>{children}</div></section>;
const noop = () => undefined;
const Icon = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>;

function ButtonFixture() {
  return <>
    {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => <Group key={variant} title={variant}>
      <Button variant={variant}>Buy NABIL</Button>
      <Button variant={variant} size="sm">Sell</Button>
      <Button variant={variant} size="lg" icon={<Icon />}>Place order</Button>
      <Button variant={variant} disabled>Disabled</Button>
      <Button variant={variant} loading>Submitting</Button>
      <Button variant={variant} iconOnly label="Add to watchlist" icon={<Icon />} />
    </Group>)}
    <Group title="Block and link"><Button block>Confirm order of 100 NTC shares</Button><Button href="#portfolio" variant="secondary">View portfolio</Button></Group>
  </>;
}

function FieldsFixture() {
  const [v, setV] = useState({ symbol: 'NABIL', qty: '120', price: '487.50', note: 'Long-term hold', date: '2025-11-14', kind: 'buy' });
  const set = (k: keyof typeof v) => (x: string) => setV((s) => ({ ...s, [k]: x }));
  return <div className="vr-grid">
    <Field label="Symbol" value={v.symbol} onChange={set('symbol')} hint="Listed NEPSE ticker" />
    <Field label="Symbol (error)" value="NABLI" onChange={noop} error="NABLI is not a listed symbol" />
    <Field label="Locked" value="Read only" onChange={noop} disabled />
    <Field label="Empty with placeholder" value="" onChange={noop} placeholder="Search by symbol" />
    <NumberField label="Quantity" value={v.qty} onChange={set('qty')} integer hint="Units" />
    <PriceField label="Limit price (NPR)" value={v.price} onChange={set('price')} source="LTP" />
    <TextAreaField label="Note" value={v.note} onChange={set('note')} hint="Visible only to you" />
    <DateField label="Trade date" type="date" value={v.date} onChange={set('date')} />
    <SelectField label="Order type" value={v.kind} onChange={set('kind')} options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} />
    <SymbolField label="Find company" value="" onChange={noop} options={symbols} placeholder="NABIL, NTC, HDL" />
  </div>;
}

function SelectFixture() {
  const [a, setA] = useState('nepse');
  const opts = [{ value: 'nepse', label: 'NEPSE index' }, { value: 'sensitive', label: 'Sensitive index' }, { value: 'float', label: 'Float index', disabled: true }];
  return <div className="vr-grid">
    <Select label="Index" labelPlacement="above" value={a} onChange={setA} options={opts} testId="select-default" />
    <Select label="Index (inline)" labelPlacement="inline" value={a} onChange={setA} options={opts} />
    <Select label="Index (disabled)" labelPlacement="above" value={a} onChange={setA} options={opts} disabled />
    <Select label="Index (loading)" labelPlacement="above" value={a} onChange={setA} options={opts} loading />
    <Select label="Index (native)" labelPlacement="above" value={a} onChange={setA} options={opts} native />
    <Select label="Small" labelPlacement="above" size="sm" value={a} onChange={setA} options={opts} />
    <Select label="Large" labelPlacement="above" size="lg" value={a} onChange={setA} options={opts} />
  </div>;
}

function ControlsFixture() {
  const [range, setRange] = useState('1m');
  const [seg, setSeg] = useState('all');
  const [choice, setChoice] = useState('buy');
  const periods = [{ value: '1w', label: '1W' }, { value: '1m', label: '1M' }, { value: '1y', label: '1Y' }];
  return <>
    <Group title="Chips"><Chip onClick={noop}>Banks</Chip><Chip selected onClick={noop} count={12}>Hydro</Chip><Chip current onClick={noop}>Current</Chip><Chip disabled onClick={noop}>Disabled</Chip><Chip size="sm" onClick={noop}>Small</Chip></Group>
    <ChipRow options={periods} value={range} onChange={setRange} prefix="vr-chip" label="Period" />
    <SegmentedControl options={[{ value: 'all', label: 'All', count: 24 }, { value: 'gain', label: 'Gainers' }, { value: 'loss', label: 'Losers' }]} value={seg} onChange={setSeg} prefix="vr-seg" label="Movers" />
    <SegmentedControl tone="accent" disabled options={periods} value="1m" onChange={noop} prefix="vr-seg-d" label="Disabled period" />
    <ChoiceGroup options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }, { value: 'sip', label: 'SIP', disabled: true }]} value={choice} onChange={setChoice} label="Order side" testId="vr-choice" />
    <Card title="Compact choice on a card"><ChoiceGroup appearance="compact" size="md" options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} value="sell" onChange={noop} label="Compact side" testId="vr-choice-c" /></Card>
    <Group title="Filter chips"><FilterChip label="Sector" value="Banking" onOpen={noop} onRemove={noop} removeLabel="Remove sector filter" /><FilterChip label="Price" caret expanded onOpen={noop} /><FilterChip label="Volume" value="Invalid" error onOpen={noop} /></Group>
    <ListFilter value="" onChange={noop} label="Filter watchlist" clear="Clear filter" testId="vr-filter" slash placeholder="Filter by symbol" labelPlacement="above" />
  </>;
}

function CheckboxSwitchFixture() {
  const [c, setC] = useState({ a: true, b: false });
  const [s, setS] = useState({ a: true, b: false });
  return <>
    <Group title="Checkbox"><Checkbox checked={c.a} onChange={(a) => setC({ ...c, a })} testId="vr-cb-a">Include NABIL</Checkbox><Checkbox checked={c.b} onChange={(b) => setC({ ...c, b })} testId="vr-cb-b">Include NTC</Checkbox><Checkbox checked onChange={noop} disabled>Disabled checked</Checkbox><Checkbox checked={false} onChange={noop} disabled>Disabled</Checkbox></Group>
    <Group title="Switch"><Switch checked={s.a} onChange={(a) => setS({ ...s, a })} label="Price alerts" testId="vr-sw-a" /><Switch checked={s.b} onChange={(b) => setS({ ...s, b })} label="Dividend alerts" testId="vr-sw-b" /><Switch checked onChange={noop} disabled label="Locked on" /><Switch checked={false} busy onChange={noop} label="Saving" /></Group>
  </>;
}

function TabsFixture() {
  const [a, setA] = useState('holdings');
  const [b, setB] = useState('day');
  const opts = [{ value: 'holdings', label: 'Holdings', count: 12 }, { value: 'orders', label: 'Orders' }, { value: 'history', label: 'History' }];
  return <>
    <Tabs options={opts} value={a} onChange={setA} prefix="vr-tabs" label="Portfolio sections" panelId="vr-panel-a" testId="vr-tabs" />
    <div id="vr-panel-a" role="tabpanel" aria-labelledby={`vr-tabs-${a}`} tabIndex={0}>Panel: {a}</div>
    <PanelTabs options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={b} onChange={setB} prefix="vr-ptabs" label="Range" panelId="vr-panel-b" />
    <div id="vr-panel-b" role="tabpanel" aria-labelledby={`vr-ptabs-${b}`} tabIndex={0}>Panel: {b}</div>
  </>;
}

function CardFixture() {
  return <div className="vr-grid">
    <Card title="Portfolio value" description="Across 3 accounts" meta="Updated 3:00 PM" action={<Button size="sm" variant="secondary">Export</Button>}>NPR 12,48,350.00</Card>
    <Card title="With footer" footer={<Button size="sm" variant="ghost">View all</Button>} rule>Dividend declared by NABIL: 12% cash.</Card>
    <Card tone="inverse" title="Inverse tone" description="Contrast on the inverse surface">NTC 842.00</Card>
    <Card flush title="Flush content"><RowList label="Flush rows"><ValueRow symbol="HDL" name="Himalayan Distillery" figure="2,150.00" /></RowList></Card>
    <Card title="Long title that must wrap cleanly on narrow phones without clipping" clipDescription description="A long description about the dividend schedule that should be clipped to a single line when requested by the card.">Body</Card>
  </div>;
}

function BadgesFixture() {
  return <>
    <Group title="Status pill">{(['gain', 'loss', 'warn', 'accent', 'highlight'] as const).map((t) => <StatusPill key={t} tone={t} dot>{t}</StatusPill>)}<StatusPill size="sm">Small</StatusPill><CountBadge count={7} label="7 alerts" /></Group>
    <Group title="Status tag"><StatusTag>Public</StatusTag><StatusTag tone="accent" icon="check">Verified</StatusTag><StatusTag icon="lock">Locked</StatusTag><StatusTag icon="eyeOff">Hidden</StatusTag><StatusTag icon="eye">Visible</StatusTag></Group>
    <Group title="Avatar"><Avatar name="Sita Sharma" size="sm" /><Avatar name="Ram Thapa" /><Avatar name="Bishnu Karki" size="lg" tone="accent" /><Avatar email="trader@example.com" /><Avatar loading /></Group>
    <Group title="Figures"><Figure value={487.5} kind="rs" /><Figure value={null} /><Delta value={1.25} kind="pct" /><Delta value={-0.47} kind="pct" /><Delta value={0} kind="pct" /><LiveFigure value={2150} kind="rs" /></Group>
  </>;
}

function StatesFixture() {
  const [confirm, setConfirm] = useState(true);
  return <div className="vr-grid">
    <EmptyState title="No holdings yet" body="Add your first NEPSE position to start tracking." action={<Button size="sm">Add holding</Button>} />
    <EmptyState bare center title="No alerts" />
    <EmptyState role="alert" title="Could not load orders" body="Check your connection and try again." action={<Button size="sm" variant="secondary">Retry</Button>} />
    <div><Note>Prices delayed by 15 minutes.</Note><div style={{ height: 8 }} /><Note tone="warn">Market closed: values are from 2:55 PM.</Note><div style={{ height: 8 }} /><Note tone="error">Order rejected: insufficient balance.</Note><div style={{ height: 8 }} /><Note quiet>Source: NEPSE, synthetic.</Note></div>
    <div><Skeleton width={160} height={20} label="Loading price" /><div style={{ height: 8 }} /><Skeleton circle width={40} height={40} still /><div style={{ height: 8 }} /><SkeletonText lines={3} label="Loading description" /></div>
    <LockedNote title="Not included on this account">Upgrade to see broker analytics.</LockedNote>
    {confirm ? <InlineConfirm title="Delete order?" body="Order #4021 for 100 NABIL will be cancelled." confirm="Delete" cancel="Keep" onConfirm={() => setConfirm(false)} onCancel={() => setConfirm(false)} testId="vr-confirm" /> : <Button onClick={() => setConfirm(true)}>Show confirm</Button>}
    <InlineConfirm title="Working" confirm="Delete" cancel="Keep" busy onConfirm={noop} onCancel={noop} />
  </div>;
}

function RowsFixture() {
  const [more, setMore] = useState(false);
  return <>
    <ListSectionHeader title="Holdings" detail="12 positions" action={<Button size="sm" variant="ghost">Edit</Button>} />
    <Card flush><RowList label="Holdings">{holdings.slice(0, 4).map((h) => <ValueRow key={h.symbol} symbol={h.symbol} name={h.name} line={`${h.qty} units`} figure={money(h.ltp * h.qty)} note={formatPercent(h.change)} chevron onClick={noop} pill={h.change < 0 ? <StatusPill tone="loss" size="sm">Down</StatusPill> : undefined} />)}</RowList></Card>
    <Card title="Valuation"><ListSectionHeader level={3} caption title="At the last close" /><DataRows label="Valuation" flush><DataRow label="Cost" value={money(1_050_000)} /><DataRow label="Market value" value={money(1_248_350)} /><DataRow label="Gain" value={money(198_350)} total /></DataRows></Card>
    <StatGrid cols={3} label="Key stats"><StatTile label="Day change" value="+1.25%" note="NEPSE" /><StatTile label="Turnover" value={`NPR ${formatNepalNumber(4_82_50_000, { fractionDigits: 0 })}`} /><StatTile label="Advancers" value="142" note="of 264" /></StatGrid>
    <Card title="Disclosures"><p style={{ margin: 0 }}>Brokerage commission applies. {more ? 'SEBON fee 0.015% and DP charge NPR 25 per transaction.' : ''}</p><ShowMore expanded={more} onToggle={() => setMore(!more)} more="Show more" less="Show less" testId="vr-showmore" /></Card>
  </>;
}

function RangeFixture() {
  const [r, setR] = useState<[number, number]>([300, 800]);
  return <Card title="Price range (NPR)"><RangeSlider min={0} max={1000} step={10} lo={r[0]} hi={r[1]} onChange={(lo, hi) => setR([lo, hi])} labelLo="Minimum price" labelHi="Maximum price" valueText={(v) => `NPR ${v}`} testId="vr-range" /><p>{`NPR ${r[0]} to NPR ${r[1]}`}</p></Card>;
}

const tableColumns = [
  { key: 'symbol', label: 'Symbol', sortable: true },
  { key: 'name', label: 'Company', hideUnder: 1024 as const },
  { key: 'qty', label: 'Units', num: true },
  { key: 'ltp', label: 'LTP (NPR)', num: true, sortable: true },
  { key: 'change', label: 'Change', num: true },
] as const;

function TableFixture({ mode }: { mode: 'ready' | 'loading' | 'empty' }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: 'symbol' | 'name' | 'qty' | 'ltp' | 'change'; dir: 'asc' | 'desc' }>({ key: 'symbol', dir: 'asc' });
  const [sel, setSel] = useState<readonly string[]>(mode === 'ready' ? ['NTC'] : []);
  const base = mode === 'ready' ? holdings : [];
  const matches = base.filter((h) => `${h.symbol} ${h.name}`.toLowerCase().includes(q.toLowerCase()))
    .toSorted((a, b) => { const k = sort.key; const d = sort.dir === 'asc' ? 1 : -1; return (typeof a[k] === 'number' ? (a[k] as number) - (b[k] as number) : String(a[k]).localeCompare(String(b[k]))) * d; });
  const rows: Holding[] = matches.slice(page * 5, page * 5 + 5);
  return <DataTable caption="Holdings · NPR" columns={[...tableColumns]} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
    loading={mode === 'loading'} empty="No holdings match your search." testId="vr-table"
    search={{ label: 'Search holdings', value: q, onChange: (v) => { setQ(v); setPage(0); }, placeholder: 'Symbol or company', testId: 'vr-table-search' }}
    pagination={{ pageIndex: page, pageSize: 5, rowCount: matches.length, onPageChange: setPage, testIdPrefix: 'vr-table-page' }}
    selection={{ selectedRowIds: sel, onChange: setSel, rowLabel: (id) => `Select ${id}`, testIdPrefix: 'vr-table-sel' }}>
    {rows.map((h) => <DataListRow key={h.symbol} rowId={h.symbol} selectionDisabled={h.symbol === 'SBL'}>
      <Cell sym header>{h.symbol}</Cell><Cell hideUnder={1024}>{h.name}</Cell><Cell num>{h.qty}</Cell><Cell num>{money(h.ltp)}</Cell><Cell num><Delta value={h.change} kind="pct" /></Cell>
    </DataListRow>)}
  </DataTable>;
}

const finColumns: FinancialColumn<Holding>[] = [
  { key: 'symbol', label: 'Symbol', rowHeader: true, sortable: true, render: (h) => h.symbol },
  { key: 'qty', label: 'Units', num: true, render: (h) => formatNepalNumber(h.qty, { fractionDigits: 0 }) },
  { key: 'value', label: 'Value (NPR)', num: true, render: (h) => money(h.qty * h.ltp) },
  { key: 'change', label: 'Change', num: true, render: (h) => formatPercent(h.change) },
];
function FinancialTableFixture({ state }: { state: 'ready' | 'loading' | 'error' | 'empty' }) {
  return <FinancialTable caption="Holdings · NPR" columns={finColumns} rows={state === 'ready' ? holdings.slice(0, 6) : []} rowKey={(h) => h.symbol}
    state={state === 'empty' ? 'ready' : state} emptyTitle="No holdings yet" emptyBody="Import a Meroshare statement to begin." emptyAction={<Button size="sm">Import statement</Button>}
    errorTitle="Unable to load holdings" errorAction={<Button size="sm" variant="secondary">Retry</Button>} sort={{ key: 'symbol', dir: 'asc' }} onSort={noop} />;
}

function FinancialFixture() {
  return <>
    <FinancialSummary label="Portfolio summary" metrics={[{ id: 'v', label: 'Portfolio value', value: money(1_248_350), note: 'Known values only' }, { id: 'c', label: 'Holdings', value: '12' }, { id: 'g', label: 'Unrealised gain', value: money(198_350), note: 'Before tax' }, { id: 'r', label: 'Day return', value: formatPercent(-0.47), note: 'vs previous close' }]} />
    <PriceChart label="Account value · weekly" points={weeklyValue} formatValue={money} />
    <OrderBook caption="NABIL · order book" bids={[{ price: 487, quantity: 100 }, { price: 486.5, quantity: 300 }]} asks={[{ price: 488, quantity: 200 }, { price: 489, quantity: 50 }]} labels={{ bidQuantity: 'Buy quantity', bid: 'Bid', ask: 'Ask', askQuantity: 'Sell quantity' }} formatPrice={money} formatQuantity={(v) => formatNepalNumber(v, { fractionDigits: 0 })} />
  </>;
}

function CalendarFixture() {
  const [d, setD] = useState<string | null>('2025-11-20');
  const [r, setR] = useState<DateRange | null>({ start: '2025-11-10', end: '2025-11-18' });
  return <div className="vr-grid">
    <Calendar label="Trade date" value={d} onChange={setD} today={today} defaultMonth="2025-11-01" testId="vr-cal" />
    <Calendar label="Bikram Sambat" calendar="bikram-sambat" value={d} onChange={setD} today={today} defaultMonth="2025-11-01" />
    <Calendar label="Range" mode="range" value={r} onChange={setR} today={today} defaultMonth="2025-11-01" min="2025-11-03" isDateUnavailable={(iso) => iso.endsWith('-15')} />
    <Calendar label="Disabled" value={null} onChange={noop} today={today} defaultMonth="2025-11-01" disabled />
  </div>;
}

function DatePickerFixture() {
  const [d, setD] = useState<string | null>(null);
  const [r, setR] = useState<DateRange | null>(null);
  return <div className="vr-grid">
    <DatePicker label="Settlement date" value={d} onChange={setD} today={today} defaultMonth="2025-11-01" hint="T+2 settlement" testId="vr-dp" />
    <DatePicker label="Settlement (error)" value={null} onChange={noop} today={today} error="Pick a trading day" />
    <DatePicker label="Settlement (disabled)" value="2025-11-18" onChange={noop} today={today} disabled />
    <DateRangePicker label="Statement period" value={r} onChange={setR} today={today} defaultMonth="2025-11-01" testId="vr-drp" />
  </div>;
}

function CompanySearchFixture() {
  const [opened, setOpened] = useState('');
  return <div className="vr-grid">
    <div><CompanySearch options={symbols} label="Search companies" placeholder="Search NEPSE" onOpen={setOpened} none={(q) => `No company matches “${q}”`} testId="vr-cs" optionTestId="vr-cs-opt" listTestId="vr-cs-list" sub={(o) => o.name} /><p data-testid="vr-cs-opened">{opened}</p></div>
    <CompanySearch options={symbols} label="Selected company" placeholder="Search" onOpen={noop} none={() => 'None'} testId="vr-cs2" optionTestId="vr-cs2-opt" value="NABIL" valueName="Nabil Bank Limited" meta="Banking" />
    <CompanySearch options={symbols} label="Error" placeholder="Search" onOpen={noop} none={() => 'None'} testId="vr-cs3" optionTestId="vr-cs3-opt" error="Symbols failed to load" />
    <CompanySearch options={[]} label="Loading" placeholder="Search" onOpen={noop} none={() => 'None'} testId="vr-cs4" optionTestId="vr-cs4-opt" loading />
    <SymbolField label="Symbol" value="NTC" onChange={noop} options={symbols} />
  </div>;
}

function TooltipsFixture() {
  return <Group title="Hints">
    <span>Dividend yield <InfoTip label="About dividend yield" testId="vr-info">Annual cash dividend divided by the last traded price.</InfoTip></span>
    <Tooltip content="Add NABIL to watchlist"><Button iconOnly label="Add to watchlist" icon={<Icon />} variant="secondary" /></Tooltip>
    <InfoTip label="T+2 settlement" trigger="T+2">Trades settle two trading days later.</InfoTip>
  </Group>;
}

function ShellFixture() {
  return <AppShell brand={<strong>Punji</strong>} navigationLabel="Primary" navigation={<><a href="#portfolio" aria-current="page">Portfolio</a><a href="#watchlist">Watchlist</a><a href="#orders">Orders</a></>} actions={<Button size="sm" variant="secondary">Sign out</Button>} footer="Synthetic demonstration data · No trading services">
    <PageLayout>
      <PageHeader eyebrow="Portfolio" title="Holdings" meta="FY 2082/83 · Sample data" actions={<Button size="sm">Add holding</Button>} backTo="#home" backLabel="Dashboard" stamp="As of 3:00 PM" />
      <FinancialSummary label="Summary" metrics={[{ id: 'a', label: 'Value', value: money(1_248_350) }, { id: 'b', label: 'Holdings', value: '12' }, { id: 'c', label: 'Day return', value: formatPercent(1.25), note: 'vs previous close' }]} />
      <FinancialTableFixture state="ready" />
    </PageLayout>
  </AppShell>;
}

function DrawerScreenFixture() {
  return <div style={{ maxWidth: 480 }}><DrawerScreen testId="vr-ds">
    <DrawerHeader title="Add transaction" onBack={noop} onClose={noop} backLabel="Back" closeLabel="Close" />
    <DrawerBody title="Details" description="Record a purchase of NABIL shares."><Field label="Units" value="100" onChange={noop} /><PriceField label="Price (NPR)" value="487.50" onChange={noop} /></DrawerBody>
    <DrawerFooter note="Fees are added automatically."><Button block>Save transaction</Button></DrawerFooter>
  </DrawerScreen></div>;
}

function DrawerFixture() {
  const [open, setOpen] = useState(true);
  return <><div className="vr-stage"><Button onClick={() => setOpen(true)} testId="vr-open">Open drawer</Button></div>
    <Drawer open={open} label="Order ticket" onClose={() => setOpen(false)} testId="vr-drawer"><div style={{ padding: 16, display: 'grid', gap: 12 }}><h2 style={{ margin: 0, font: '600 18px var(--pu-font-display)' }}>Order ticket</h2><Field label="Symbol" value="NABIL" onChange={noop} /><Button>Review order</Button></div></Drawer></>;
}

function SheetFixture() {
  const [open, setOpen] = useState(true);
  return <><div className="vr-stage"><Button onClick={() => setOpen(true)} testId="vr-open">Open sheet</Button></div>
    <Sheet open={open} title="Confirm order" body="Buy 100 NABIL at NPR 487.50" onClose={() => setOpen(false)} testId="vr-sheet"><Button block>Confirm</Button><Button block variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></Sheet></>;
}

function PopoverFixture() {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLButtonElement>(null);
  return <div className="vr-stage"><PopoverAnchor><Button ref={ref} onClick={() => setOpen(!open)} testId="vr-open" variant="secondary">Filters</Button>
    <Popover open={open} onClose={() => setOpen(false)} anchor={ref} label="Filters" align="start" testId="vr-popover"><div style={{ padding: 12, display: 'grid', gap: 8 }}><Checkbox checked onChange={noop}>Banks</Checkbox><Checkbox checked={false} onChange={noop}>Hydropower</Checkbox><Button size="sm">Apply</Button></div></Popover></PopoverAnchor></div>;
}

function CommandPaletteFixture() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const items: CommandItem[] = symbols.map((s) => ({ id: s.symbol, group: 'companies', groupLabel: 'Companies', title: s.symbol, sub: s.name, kind: 'entity', actions: [{ id: 'open', label: 'Open' }] }));
  const shown = items.filter((i) => `${i.title} ${i.sub}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  return <><div className="vr-stage"><Button onClick={() => setOpen(true)} testId="vr-open">Open palette</Button></div>
    {open && <CommandPalette labels={{ dialog: 'Command palette', close: 'Close', move: 'Move', choose: 'Choose', open: 'Open', closeKey: 'Close', chosen: (l) => `${l} chosen`, chosenMark: 'Chosen', actionsHint: 'Actions' }} placeholder="Search companies" query={query} onQuery={setQuery} items={shown} onRun={() => setOpen(false)} onClose={() => setOpen(false)} empty={shown.length ? undefined : "No matches"} />}</>;
}

function ToastButtons({ auto }: { auto: boolean }) {
  const toast = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (!auto || shown.current) return;
    shown.current = true;
    // Freeze the auto-dismiss timers so the screenshot is deterministic.
    const original = window.setTimeout;
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => original(handler, delay !== undefined && delay >= 4000 ? 2_000_000_000 : delay, ...args)) as typeof window.setTimeout;
    toast.show('success', 'Order placed', { body: 'Buy 100 NABIL at NPR 487.50' });
    toast.show('error', 'Order rejected', { body: 'Insufficient balance', action: { label: 'Retry', run: noop } });
    toast.show('info', 'Market closed');
  }, [auto, toast]);
  return <div className="vr-stage"><div className="vr-row">
    <Button onClick={() => toast.show('success', 'Order placed', { body: 'Buy 100 NABIL at NPR 487.50' })}>Success</Button>
    <Button onClick={() => toast.show('error', 'Order rejected', { body: 'Insufficient balance', action: { label: 'Retry', run: noop } })}>Error</Button>
    <Button onClick={() => toast.show('info', 'Market closed')}>Info</Button></div></div>;
}
const ToastFixture = () => <ToastProvider><ToastButtons auto={!location.search.includes('quiet=1')} /></ToastProvider>;

export const registry: Record<string, () => ReactNode> = {
  button: ButtonFixture, fields: FieldsFixture, select: SelectFixture, controls: ControlsFixture, 'checkbox-switch': CheckboxSwitchFixture,
  tabs: TabsFixture, card: CardFixture, badges: BadgesFixture, states: StatesFixture, rows: RowsFixture, 'range-slider': RangeFixture,
  table: () => <TableFixture mode="ready" />, 'table-loading': () => <TableFixture mode="loading" />, 'table-empty': () => <TableFixture mode="empty" />,
  financial: FinancialFixture, 'financial-table': () => <FinancialTableFixture state="ready" />, 'financial-table-loading': () => <FinancialTableFixture state="loading" />,
  'financial-table-error': () => <FinancialTableFixture state="error" />, 'financial-table-empty': () => <FinancialTableFixture state="empty" />,
  calendar: CalendarFixture, 'date-picker': DatePickerFixture, 'company-search': CompanySearchFixture, tooltips: TooltipsFixture,
  shell: ShellFixture, 'drawer-screen': DrawerScreenFixture, drawer: DrawerFixture, sheet: SheetFixture, popover: PopoverFixture,
  'command-palette': CommandPaletteFixture, toast: ToastFixture,
  ...kitRegistry,
  ...formsRegistry,
  ...tableScaleRegistry,
  ...domainRegistry,
  ...bankingRegistry,
  ...layoutRegistry,
  ...chartsRegistry,
  ...portfolioRegistry,
  ...fitRegistry,
  ...rtlRegistry,
  ...tradingRegistry,
  ...shareIssuesRegistry,
  ...walletRegistry,
  ...lendingRegistry,
  // Tax, invoicing and payroll.
  ...taxRegistry,
};
// Fixtures that draw their own full-width stage (shell, overlays).
export const ownStage = new Set(['shell', 'drawer', 'sheet', 'popover', 'command-palette', 'toast']);
