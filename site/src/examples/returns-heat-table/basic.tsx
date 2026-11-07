import { useState } from 'react';
import { heatCell, ReturnsHeatTable, type HeatColumn, type HeatRow } from '@punji/ui/returns-heat-table';

const columns: HeatColumn[] = [
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '1y', label: '1Y' },
];

// One returns row per sector; null is a period with no history, never zero.
const DATA: Record<string, { name: string; sub: string; returns: (number | null)[] }> = {
  bank: { name: 'Commercial banks', sub: '20 companies', returns: [1.2, 4.8, -3.1, 14.6] },
  hydro: { name: 'Hydropower', sub: '64 companies', returns: [-0.8, -2.4, 6.9, 31.2] },
  life: { name: 'Life insurance', sub: '14 companies', returns: [0.3, 1.1, 2.2, -9.7] },
  micro: { name: 'Microfinance', sub: '55 companies', returns: [2.9, 7.3, null, null] },
};

export default function Example() {
  const [sort, setSort] = useState({ key: '1m', dir: 'desc' as 'asc' | 'desc' });
  const [picked, setPicked] = useState<string | undefined>('bank');
  const at = columns.findIndex((c) => c.key === sort.key);
  const rows: HeatRow[] = Object.entries(DATA)
    .toSorted(([, a], [, b]) => {
      const [x, y] = [a.returns[at], b.returns[at]];
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1; // no figure sorts last
      return sort.dir === 'desc' ? y - x : x - y;
    })
    .map(([id, d]) => ({ id, name: d.name, sub: d.sub, cells: d.returns.map((r) => heatCell(r)) }));
  return (
    <ReturnsHeatTable
      caption="Sector returns by period"
      headName="Sector"
      columns={columns}
      rows={rows}
      average={{ id: 'avg', name: 'Market average', cells: [heatCell(0.9), heatCell(2.7), heatCell(1.5), heatCell(9.4)] }}
      sortKey={sort.key}
      sortDir={sort.dir}
      onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}
      selected={picked}
      onSelect={setPicked}
      noneLabel="Not enough history yet"
    />
  );
}
