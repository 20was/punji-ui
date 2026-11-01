import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@punji/ui/button';
import { Checkbox } from '@punji/ui/checkbox';
import { ChipRow } from '@punji/ui/controls';
import { FilterChip, type FilterChipProps } from '@punji/ui/filter-chip';
import { ListFilter } from '@punji/ui/list-filter';
import { minorUnitsToDecimal } from '@punji/ui/nepal/money';
import { Popover, PopoverAnchor } from '@punji/ui/popover';
import { PriceChange } from '@punji/ui/price-change';
import { RangeSlider } from '@punji/ui/range-slider';
import { compactCount } from '@punji/ui/stock-table';
import { TableExport } from '@punji/ui/table-export';
import { useColumnVisibility } from '@punji/ui/use-column-visibility';
import { VirtualFinancialTable, compareByRules, type SortRule, type VirtualColumn } from '@punji/ui/virtual-table';
import { formatPrice } from '@punji/ui/nepal/market-format';
import { ScreenTitle } from '../shared/kit.tsx';
import { SECTOR_NAMES, companyOf, fundamentalsOf, range52 } from './market.ts';
import { changePct, npr, usePortal } from './store.ts';

export interface ScreenRow {
  symbol: string;
  name: string;
  sector: string;
  ltp: bigint;
  previousClose: bigint;
  change: number;
  volume: number;
  turnover: bigint;
  marketCap: bigint;
  pe: number | null;
  pb: number;
  eps: bigint;
  dividendYield: number;
  roe: number;
  high52: bigint;
  low52: bigint;
  /** Percent below the 52-week high (0 at the high). */
  fromHigh: number;
}

type RangeKey = 'pe' | 'pb' | 'dividendYield' | 'change' | 'fromHigh';
interface RangeDef { key: RangeKey; label: string; min: number; max: number; step: number; unit: string; read: (r: ScreenRow) => number | null }
const RANGES: readonly RangeDef[] = [
  { key: 'pe', label: 'P/E', min: 0, max: 100, step: 1, unit: '', read: (r) => r.pe },
  { key: 'pb', label: 'P/B', min: 0, max: 8, step: 0.1, unit: '', read: (r) => r.pb },
  { key: 'dividendYield', label: 'Dividend yield', min: 0, max: 8, step: 0.25, unit: '%', read: (r) => r.dividendYield },
  { key: 'change', label: 'Change today', min: -10, max: 10, step: 0.5, unit: '%', read: (r) => r.change },
  { key: 'fromHigh', label: 'Below 52-week high', min: 0, max: 60, step: 1, unit: '%', read: (r) => r.fromHigh },
];
type Ranges = Partial<Record<RangeKey, [number, number]>>;

type Preset = 'all' | 'value' | 'income' | 'momentum' | 'highs';
const PRESETS: { value: Preset; label: string; ranges: Ranges }[] = [
  { value: 'all', label: 'All companies', ranges: {} },
  { value: 'value', label: 'Value', ranges: { pe: [0, 20], pb: [0, 2] } },
  { value: 'income', label: 'Income', ranges: { dividendYield: [2, 8] } },
  { value: 'momentum', label: 'Momentum', ranges: { change: [1.5, 10] } },
  { value: 'highs', label: 'Near 52-week high', ranges: { fromHigh: [0, 5] } },
];

const num = (n: number | null, digits = 2) => (n === null ? '—' : n.toFixed(digits));
const fmtRange = (d: RangeDef, [lo, hi]: [number, number]) => `${lo}${d.unit} to ${hi}${d.unit}`;
const rs = (paisa: bigint) => formatPrice(Number(paisa) / 100);
const decimal = (v: unknown) => minorUnitsToDecimal(v as bigint);

/** Every listed company with live fundamentals, from the same quotes the overview shows. */
export function screenRows(quotes: ReturnType<typeof usePortal>['derived']['quotes']): ScreenRow[] {
  return quotes.map((q) => {
    const c = companyOf(q.symbol)!;
    const f = fundamentalsOf(c, q.ltp);
    const r = range52(c, q);
    return {
      symbol: q.symbol, name: q.name, sector: q.sector, ltp: q.ltp, previousClose: q.previousClose, change: Math.round(changePct(q) * 100) / 100, volume: q.volume, turnover: q.turnover,
      marketCap: f.marketCap, pe: f.pe, pb: f.pb, eps: c.eps, dividendYield: f.dividendYield, roe: f.roe, high52: r.high, low52: r.low,
      fromHigh: r.high > 0n ? Math.round((Number(r.high - q.ltp) / Number(r.high)) * 10_000) / 100 : 0,
    };
  });
}

const READ: Record<string, (r: ScreenRow) => string | number | bigint | null> = {
  symbol: (r) => r.symbol, name: (r) => r.name, sector: (r) => r.sector, ltp: (r) => r.ltp, change: (r) => r.change, volume: (r) => r.volume, turnover: (r) => r.turnover,
  marketCap: (r) => r.marketCap, pe: (r) => r.pe, pb: (r) => r.pb, eps: (r) => r.eps, dividendYield: (r) => r.dividendYield, roe: (r) => r.roe, high52: (r) => r.high52, low52: (r) => r.low52, fromHigh: (r) => r.fromHigh,
};
const COLUMN_IDS = Object.keys(READ);
const LABELS: Record<string, string> = {
  symbol: 'Symbol', name: 'Company', sector: 'Sector', ltp: 'LTP', change: 'Change', volume: 'Volume', turnover: 'Turnover', marketCap: 'Market cap', pe: 'P/E', pb: 'P/B', eps: 'EPS',
  dividendYield: 'Div. yield', roe: 'ROE', high52: '52w high', low52: '52w low', fromHigh: 'From high',
};
const rowKey = (r: ScreenRow) => r.symbol;

/** One chip and its editor in a popover; the chip's button anchors it and takes focus back on Esc. */
function ChipEditor({ id, open, onToggle, chip, label, children }: { id: string; open: boolean; onToggle: (id: string | null) => void; chip: Omit<FilterChipProps, 'onOpen' | 'expanded'>; label: string; children: ReactNode }) {
  const anchor = useRef<HTMLElement | null>(null);
  const onOpen = (el: HTMLButtonElement) => {
    anchor.current = el;
    onToggle(open ? null : id);
  };
  return (
    <PopoverAnchor>
      <FilterChip {...chip} expanded={open} onOpen={onOpen} />
      <Popover open={open} anchor={anchor} onClose={() => onToggle(null)} label={label} align="start" testId={`mp-pop-${id}`}>
        <div className="mp-pop">{children}</div>
      </Popover>
    </PopoverAnchor>
  );
}

/**
 * The screener: every listed company with live price, valuation and dividend figures; filter by sector and ranges,
 * sort by several columns, choose columns and export what is shown.
 */
export default function ScreenerScreen() {
  const { state, derived, dispatch, open } = usePortal();
  const [query, setQuery] = useState('');
  const [sectors, setSectors] = useState<readonly string[]>([]);
  const [ranges, setRanges] = useState<Ranges>({});
  const [preset, setPreset] = useState<Preset>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [sort, setSort] = useState<SortRule[]>([{ key: 'turnover', dir: 'desc' }]);
  const columns = useColumnVisibility({ columns: COLUMN_IDS, defaultHidden: new Set(['eps', 'roe', 'low52', 'volume']) });

  const all = useMemo(() => screenRows(derived.quotes), [derived.quotes]);
  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    const shown = all.filter((r) => {
      if (q && !r.symbol.includes(q) && !r.name.toUpperCase().includes(q)) return false;
      if (sectors.length && !sectors.includes(r.sector)) return false;
      for (const d of RANGES) {
        const range = ranges[d.key];
        if (!range) continue;
        const v = d.read(r);
        if (v === null || v < range[0] || v > range[1]) return false;
      }
      return true;
    });
    return shown.toSorted(compareByRules(sort, READ));
  }, [all, query, sectors, ranges, sort]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    setRanges(PRESETS.find((x) => x.value === p)!.ranges);
  };
  const setRange = (key: RangeKey, value: [number, number] | null) => {
    setPreset('all');
    setRanges((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };
  const clear = () => {
    setQuery('');
    setSectors([]);
    setRanges({});
    setPreset('all');
  };
  const filtered = query !== '' || sectors.length > 0 || Object.keys(ranges).length > 0;

  const symbolCell = (r: ScreenRow) => (
    <button type="button" className="app-sym mp-sym" onClick={() => open(r.symbol)} title={`Open ${r.name}`}>
      <strong>{r.symbol}</strong>
    </button>
  );
  const defs: Record<string, VirtualColumn<ScreenRow>> = {
    symbol: { key: 'symbol', label: 'Symbol', rowHeader: true, pin: 'left', width: 96, sortable: true, render: symbolCell },
    name: { key: 'name', label: 'Company', width: 220, sortable: true, render: (r) => r.name },
    sector: { key: 'sector', label: 'Sector', width: 160, sortable: true, render: (r) => r.sector },
    ltp: { key: 'ltp', label: 'LTP', num: true, width: 100, sortable: true, render: (r) => rs(r.ltp) },
    change: { key: 'change', label: 'Change', num: true, width: 120, sortable: true, render: (r) => <PriceChange current={r.ltp} previous={r.previousClose} preset={npr} showAbsolute={false} size="sm" /> },
    volume: { key: 'volume', label: 'Volume', num: true, width: 100, sortable: true, render: (r) => compactCount(r.volume) },
    turnover: { key: 'turnover', label: 'Turnover', num: true, width: 110, sortable: true, render: (r) => compactCount(Number(r.turnover) / 100) },
    marketCap: { key: 'marketCap', label: 'Market cap', num: true, width: 116, sortable: true, render: (r) => compactCount(Number(r.marketCap) / 100) },
    pe: { key: 'pe', label: 'P/E', num: true, width: 80, sortable: true, render: (r) => (r.pe === null ? <span title="Loss-making: no P/E">Loss</span> : num(r.pe)) },
    pb: { key: 'pb', label: 'P/B', num: true, width: 80, sortable: true, render: (r) => num(r.pb) },
    eps: { key: 'eps', label: 'EPS', num: true, width: 90, sortable: true, render: (r) => rs(r.eps) },
    dividendYield: { key: 'dividendYield', label: 'Div. yield', num: true, width: 100, sortable: true, render: (r) => `${num(r.dividendYield)}%` },
    roe: { key: 'roe', label: 'ROE', num: true, width: 84, sortable: true, render: (r) => `${num(r.roe)}%` },
    high52: { key: 'high52', label: '52w high', num: true, width: 104, sortable: true, render: (r) => rs(r.high52) },
    low52: { key: 'low52', label: '52w low', num: true, width: 104, sortable: true, render: (r) => rs(r.low52) },
    fromHigh: { key: 'fromHigh', label: 'From high', num: true, width: 100, sortable: true, render: (r) => `−${num(r.fromHigh)}%` },
  };
  const shownColumns = columns.visible.map((id) => defs[id]!);
  const csv = columns.visible.map((id) => {
    const money = ['ltp', 'turnover', 'marketCap', 'eps', 'high52', 'low52'].includes(id);
    return { header: money ? `${LABELS[id]} (NPR)` : LABELS[id]!, accessor: (r: ScreenRow) => READ[id]!(r), ...(money ? { format: decimal, keepNumericText: true } : {}) };
  });

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-small app-muted" aria-live="polite" data-testid="mp-screen-count">{rows.length} of {all.length} companies</span>}>Screener</ScreenTitle>
      <ChipRow label="Screens" prefix="mp-preset" value={preset} onChange={choosePreset} options={PRESETS.map((p) => ({ value: p.value, label: p.label }))} />
      <div className="mp-filters" role="group" aria-label="Filters">
        <ListFilter value={query} onChange={setQuery} label="Find a company" clear="Clear search" placeholder="Symbol or name" size="md" testId="mp-screen-search" />
        <ChipEditor
          id="sector"
          open={editing === 'sector'}
          onToggle={setEditing}
          label="Sectors"
          chip={{ label: 'Sector', value: sectors.length === 0 ? 'All' : sectors.length === 1 ? sectors[0] : `${sectors.length} sectors`, caret: true, openPrefix: 'Choose', testId: 'mp-f-sector' }}
        >
          <fieldset className="mp-checks">
            <legend className="kit-sr">Sectors to show</legend>
            {SECTOR_NAMES.map((s) => (
              <Checkbox key={s} checked={sectors.includes(s)} onChange={(on) => setSectors((prev) => (on ? [...prev, s] : prev.filter((x) => x !== s)))}>
                {s} <span className="app-muted">({all.filter((r) => r.sector === s).length})</span>
              </Checkbox>
            ))}
          </fieldset>
          <Button size="sm" variant="ghost" onClick={() => setSectors([])} disabled={sectors.length === 0}>
            All sectors
          </Button>
        </ChipEditor>
        {RANGES.map((d) => {
          const range = ranges[d.key];
          const [lo, hi] = range ?? [d.min, d.max];
          return (
            <ChipEditor
              key={d.key}
              id={d.key}
              open={editing === d.key}
              onToggle={setEditing}
              label={d.label}
              chip={{ label: d.label, value: range ? fmtRange(d, range) : 'Any', openPrefix: 'Edit', testId: `mp-f-${d.key}`, ...(range ? { onRemove: () => setRange(d.key, null), removeLabel: `Remove ${d.label}` } : {}) }}
            >
              <p className="mp-pop-value" aria-hidden="true">{fmtRange(d, [lo, hi])}</p>
              <RangeSlider
                min={d.min}
                max={d.max}
                step={d.step}
                lo={lo}
                hi={hi}
                onChange={(a, b) => setRange(d.key, a === d.min && b === d.max ? null : [a, b])}
                labelLo={`${d.label} minimum`}
                labelHi={`${d.label} maximum`}
                valueText={(v) => `${v}${d.unit}`}
                testId={`mp-r-${d.key}`}
              />
              {d.key === 'pe' && <p className="app-small app-muted">Loss-making companies have no P/E and leave the list while this is set.</p>}
            </ChipEditor>
          );
        })}
        <ChipEditor
          id="columns"
          open={editing === 'columns'}
          onToggle={setEditing}
          label="Columns"
          chip={{ label: 'Columns', value: `${columns.visible.length} of ${COLUMN_IDS.length}`, caret: true, openPrefix: 'Choose', testId: 'mp-f-columns' }}
        >
          <fieldset className="mp-checks">
            <legend className="kit-sr">Columns to show</legend>
            {COLUMN_IDS.map((id) => (
              <Checkbox key={id} checked={columns.isVisible(id)} disabled={id === 'symbol'} onChange={() => columns.toggle(id)}>
                {LABELS[id]}
              </Checkbox>
            ))}
          </fieldset>
          <Button size="sm" variant="ghost" onClick={columns.showAll}>
            Show all columns
          </Button>
        </ChipEditor>
        {filtered && (
          <Button size="sm" variant="ghost" onClick={clear} testId="mp-screen-clear">
            Clear filters
          </Button>
        )}
      </div>
      <VirtualFinancialTable
        caption="Listed companies, prices in NPR"
        columns={shownColumns}
        rows={rows}
        rowKey={rowKey}
        state={state.feedDown ? 'error' : 'ready'}
        errorTitle="The price feed stopped, so live ratios are not shown."
        errorAction={
          <Button size="sm" onClick={() => dispatch({ type: 'feed', down: false })}>
            Reconnect
          </Button>
        }
        emptyTitle="No company matches these filters"
        emptyBody="Widen a range, choose more sectors, or clear the filters."
        height={560}
        sort={sort}
        onSortChange={setSort}
        toolbar={<TableExport columns={csv} filename={(scope) => `nepse-screener-${scope}`} visibleRows={rows} allRows={all} testIdPrefix="mp-screen-export" />}
        testId="mp-screener"
      />
      <p className="app-small app-muted">
        Shift with a column head adds it to the sort. P/E and P/B use the live price over trailing EPS and book value per share; yield is the last cash dividend over the live price.
      </p>
    </div>
  );
}
