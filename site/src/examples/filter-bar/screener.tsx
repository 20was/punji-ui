import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { FilterBar, type FilterBarField, type FilterBarGroup } from '@punji/ui/filter-bar';
import { filtersEqual, filtersToLink, type FilterSchema } from '@punji/ui/filter-url';
import { compareDecimals } from '@punji/ui/nepal/decimal';
import { PresetRow, PresetTile } from '@punji/ui/preset-tile';
import { Stack } from '@punji/ui/stack';
import { useClipboard } from '@punji/ui/use-clipboard';
import { useUrlFilters } from '@punji/ui/use-url-filters';

// Invented stocks. Prices and P/E are decimal strings, compared exactly; no Number touches a price.
const STOCKS = [
  { symbol: 'ABNK', sector: 'banks', price: '512.50', pe: '11.2', breakout: false },
  { symbol: 'BRDG', sector: 'banks', price: '298.00', pe: '8.9', breakout: true },
  { symbol: 'CMRC', sector: 'banks', price: '1045.10', pe: '19.4', breakout: false },
  { symbol: 'DHRA', sector: 'hydro', price: '388.75', pe: '27.8', breakout: true },
  { symbol: 'EKTA', sector: 'hydro', price: '742.00', pe: '31.6', breakout: false },
  { symbol: 'FLOW', sector: 'hydro', price: '219.90', pe: '14.1', breakout: false },
  { symbol: 'GRNL', sector: 'life', price: '1620.00', pe: '23.0', breakout: true },
  { symbol: 'HMLY', sector: 'life', price: '905.40', pe: '16.7', breakout: false },
  { symbol: 'IRIS', sector: 'life', price: '133.20', pe: '6.3', breakout: false },
  { symbol: 'JANA', sector: 'banks', price: '455.00', pe: '12.0', breakout: false },
];

const SCHEMA = {
  sector: { kind: 'multi', options: ['banks', 'hydro', 'life'] },
  pe: { kind: 'range', fractionDigits: 2 },
  price: { kind: 'range', fractionDigits: 2 },
  breakout: { kind: 'boolean' },
} as const satisfies FilterSchema;

const FIELDS: FilterBarField[] = [
  { kind: 'multi', id: 'sector', label: 'Sector', group: 'market', pinned: true, options: [{ value: 'banks', label: 'Commercial Banks' }, { value: 'hydro', label: 'Hydro Power' }, { value: 'life', label: 'Life Insurance' }] },
  { kind: 'range', id: 'pe', label: 'Price to earnings', chipLabel: 'P/E', group: 'valuation', why: 'Price over earnings per share.', track: { min: '0', max: '40', step: '1' } },
  { kind: 'range', id: 'price', label: 'Last price', chipLabel: 'Price', group: 'valuation', why: 'The last traded price, in rupees.', fractionDigits: 2, track: { min: '0', max: '2000', step: '10' }, formatValue: (v) => `Rs ${v}` },
  { kind: 'boolean', id: 'breakout', label: 'Breakout', group: 'flags' },
];
const GROUPS: FilterBarGroup[] = [
  { id: 'market', title: 'Market' },
  { id: 'valuation', title: 'Valuation' },
  { id: 'flags', title: 'Flags' },
];

type Filters = ReturnType<typeof useUrlFilters<typeof SCHEMA>>['filters'];

const keeps = (s: (typeof STOCKS)[number], f: Filters) =>
  (!f.sector || f.sector.includes(s.sector)) &&
  (!f.pe || ((f.pe.min === undefined || compareDecimals(s.pe, f.pe.min) >= 0) && (f.pe.max === undefined || compareDecimals(s.pe, f.pe.max) <= 0))) &&
  (!f.price || ((f.price.min === undefined || compareDecimals(s.price, f.price.min) >= 0) && (f.price.max === undefined || compareDecimals(s.price, f.price.max) <= 0))) &&
  (!f.breakout || s.breakout);

const PRESETS: { id: string; title: string; line: string; filters: Filters }[] = [
  { id: 'cheap', title: 'Cheap banks', line: 'Banks under 13 times earnings.', filters: { sector: ['banks'], pe: { max: '13' } } },
  { id: 'moving', title: 'Breaking out', line: 'Stocks at a new high.', filters: { breakout: true } },
  { id: 'big', title: 'High price', line: 'Above Rs 900 a share.', filters: { price: { min: '900' } } },
];

// The address is the state. This demo keeps its "address" in useState; with a router, `get` and `set` read and
// write its search params (the page shows both). Change a filter and the link changes; copy it and paste it back.
export default function Example() {
  const [search, setSearch] = useState('sector=banks&pe=..13');
  const url = useUrlFilters({ schema: SCHEMA, get: () => search, set: setSearch });
  const { copy, copied } = useClipboard();
  const rows = STOCKS.filter((s) => keeps(s, url.filters));
  const link = filtersToLink('https://example.com/screener', SCHEMA, url.filters);
  const count = (draft: Partial<Filters>) => STOCKS.filter((s) => keeps(s, draft as Filters)).length;
  return (
    <Stack>
      <PresetRow label="Ready-made screens">
        {PRESETS.map((p) => (
          <PresetTile
            key={p.id}
            title={p.title}
            line={p.line}
            count={count(p.filters)}
            pressed={filtersEqual(SCHEMA, url.filters, p.filters)}
            onClick={() => url.setFilters(filtersEqual(SCHEMA, url.filters, p.filters) ? {} : p.filters)}
          />
        ))}
      </PresetRow>
      <FilterBar fields={FIELDS} groups={GROUPS} values={url.filters} onChange={(next) => url.setFilters(next as Filters)} count={(draft) => count(draft as Partial<Filters>)} testId="screener" />
      <div role="status" style={{ fontSize: 'var(--pu-text-sm)', color: 'var(--pu-color-text-muted)' }}>
        {rows.length === 0 ? 'No stock fits. Remove a filter.' : `${rows.length} of ${STOCKS.length} stocks.`}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--pu-text-sm)', fontVariantNumeric: 'tabular-nums' }}>
          <caption className="kit-sr">Stocks that fit the filters</caption>
          <thead>
            <tr>
              {['Symbol', 'Sector', 'Price (Rs)', 'P/E'].map((h, i) => (
                <th key={h} scope="col" style={{ textAlign: i > 1 ? 'end' : 'start', padding: 'var(--pu-space-2)', borderBottom: '1px solid var(--pu-color-border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.symbol}>
                <th scope="row" style={{ textAlign: 'start', padding: 'var(--pu-space-2)' }}>{s.symbol}</th>
                <td style={{ padding: 'var(--pu-space-2)' }}>{s.sector}</td>
                <td style={{ textAlign: 'end', padding: 'var(--pu-space-2)' }}>{s.price}</td>
                <td style={{ textAlign: 'end', padding: 'var(--pu-space-2)' }}>{s.pe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--pu-space-2)' }}>
        <Button variant="secondary" size="sm" onClick={() => void copy(link)}>
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
        <Button variant="ghost" size="sm" onClick={url.clear} disabled={url.active.length === 0}>
          Clear all
        </Button>
        <code style={{ fontSize: 'var(--pu-text-xs)', overflowWrap: 'anywhere', minWidth: 0 }}>{link}</code>
      </div>
    </Stack>
  );
}
