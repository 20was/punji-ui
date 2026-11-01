import { useMemo, useState, type ReactNode } from 'react';
import { TableExport, VirtualFinancialTable, compareByRules, createMoneyFormatter, nepalMoneyConfig, rowsWithIds, type SortRule, type VirtualColumn } from '@punji/ui';
import { sampleTrades, type SampleTrade } from '../../fixtures/trade-data.ts';

// Wave 3 table scale: 2,000 seeded synthetic trades in VirtualFinancialTable with pinned
// columns, a two-column sort, two selected rows and export controls. Not market data.
const npr = createMoneyFormatter(nepalMoneyConfig());
const rowKey = (t: SampleTrade) => t.id;
const columns: VirtualColumn<SampleTrade>[] = [
  { key: 'id', label: 'Contract', rowHeader: true, pin: 'left', width: 132, sortable: true, render: (t) => t.id },
  { key: 'symbol', label: 'Symbol', width: 96, sortable: true, render: (t) => <b>{t.symbol}</b> },
  { key: 'time', label: 'Time', width: 92, render: (t) => t.time },
  { key: 'buyer', label: 'Buyer', num: true, width: 80, render: (t) => t.buyer },
  { key: 'seller', label: 'Seller', num: true, width: 80, render: (t) => t.seller },
  { key: 'quantity', label: 'Units', num: true, width: 90, sortable: true, render: (t) => t.quantity.toLocaleString('en-IN') },
  { key: 'rate', label: 'Rate', num: true, width: 120, sortable: true, render: (t) => npr.format(t.rate) },
  { key: 'amount', label: 'Amount', num: true, width: 150, pin: 'right', render: (t) => npr.format(t.amount) },
];
const read = { id: (t: SampleTrade) => t.id, symbol: (t: SampleTrade) => t.symbol, quantity: (t: SampleTrade) => t.quantity, rate: (t: SampleTrade) => t.rate };
const csvColumns = [{ header: 'Contract', accessor: 'id' as const }, { header: 'Symbol', accessor: 'symbol' as const }, { header: 'Units', accessor: 'quantity' as const }];

function VirtualTableFixture() {
  const all = useMemo(() => sampleTrades(2_000, 11), []);
  const [sort, setSort] = useState<SortRule[]>([{ key: 'symbol', dir: 'asc' }, { key: 'rate', dir: 'desc' }]);
  const [selected, setSelected] = useState<readonly string[]>(() => [all[0]!.id, all[1]!.id]);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (q ? all.filter((t) => t.symbol.includes(q)) : all).toSorted(compareByRules(sort, read));
  }, [all, sort, query]);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <VirtualFinancialTable
        caption="Floorsheet, 2,000 trades, NPR"
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        emptyTitle="No trades"
        height={360}
        sort={sort}
        onSortChange={setSort}
        columnWidths={widths}
        onColumnResize={(key, width) => setWidths((prev) => ({ ...prev, [key]: width }))}
        search={{ label: 'Search trades', value: query, onChange: setQuery, placeholder: 'Symbol', testId: 'vr-vt-search' }}
        selection={{ selectedRowIds: selected, onChange: setSelected, rowLabel: (id) => `Select trade ${id}` }}
        toolbar={<TableExport columns={csvColumns} filename="floorsheet" visibleRows={rows} allRows={all} selectedRows={rowsWithIds(rows, selected, rowKey)} testIdPrefix="vr-vt-export" />}
        testId="vr-vt"
      />
      <output hidden data-testid="vr-vt-widths">{JSON.stringify(widths)}</output>
    </div>
  );
}

export const tableScaleRegistry: Record<string, () => ReactNode> = {
  'virtual-table': VirtualTableFixture,
};
