import { useMemo, useState } from 'react';
import { VirtualFinancialTable, compareByRules, type SortRule, type VirtualColumn } from '@punji/ui/virtual-table';
import { TableExport, rowsWithIds } from '@punji/ui/table-export';
import { createMoneyFormatter, nepalMoneyConfig } from '@punji/ui/money';
import { minorUnitsToDecimal } from '@punji/ui/nepal/money';
import { sampleTrades, type SampleTrade } from '../../sample.ts';

// 10,000 synthetic NEPSE trades (seeded, so every visit shows the same ones).
const npr = createMoneyFormatter(nepalMoneyConfig());
const rowKey = (t: SampleTrade) => t.id;

const columns: VirtualColumn<SampleTrade>[] = [
  { key: 'id', label: 'Contract', rowHeader: true, pin: 'left', width: 136, sortable: true, render: (t) => t.id },
  { key: 'time', label: 'Time', width: 92, sortable: true, render: (t) => t.time },
  { key: 'symbol', label: 'Symbol', width: 96, sortable: true, render: (t) => <b>{t.symbol}</b> },
  { key: 'buyer', label: 'Buyer', num: true, width: 84, sortable: true, render: (t) => t.buyer },
  { key: 'seller', label: 'Seller', num: true, width: 84, sortable: true, render: (t) => t.seller },
  { key: 'quantity', label: 'Units', num: true, width: 96, sortable: true, render: (t) => t.quantity.toLocaleString('en-IN') },
  { key: 'rate', label: 'Rate', num: true, width: 120, sortable: true, render: (t) => npr.format(t.rate) },
  { key: 'amount', label: 'Amount', num: true, width: 150, sortable: true, render: (t) => npr.format(t.amount) },
];
const read = {
  id: (t: SampleTrade) => t.id,
  time: (t: SampleTrade) => t.time,
  symbol: (t: SampleTrade) => t.symbol,
  buyer: (t: SampleTrade) => t.buyer,
  seller: (t: SampleTrade) => t.seller,
  quantity: (t: SampleTrade) => t.quantity,
  rate: (t: SampleTrade) => t.rate,
  amount: (t: SampleTrade) => t.amount,
};
const decimal = (value: unknown) => minorUnitsToDecimal(value as bigint);
const csvColumns = [
  { header: 'Contract', accessor: 'id' as const },
  { header: 'Time', accessor: 'time' as const },
  { header: 'Symbol', accessor: 'symbol' as const },
  { header: 'Buyer', accessor: 'buyer' as const },
  { header: 'Seller', accessor: 'seller' as const },
  { header: 'Units', accessor: 'quantity' as const },
  { header: 'Rate (NPR)', accessor: 'rate' as const, format: decimal, keepNumericText: true },
  { header: 'Amount (NPR)', accessor: 'amount' as const, format: decimal, keepNumericText: true },
];

export default function Example() {
  const all = useMemo(() => sampleTrades(10_000), []);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortRule[]>([{ key: 'id', dir: 'asc' }]);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    const found = q ? all.filter((t) => t.symbol.includes(q) || t.id.includes(q)) : all;
    return found.toSorted(compareByRules(sort, read));
  }, [all, query, sort]);
  return (
    <VirtualFinancialTable
      caption="Floorsheet, 10,000 trades, amounts in NPR"
      columns={columns}
      rows={rows}
      rowKey={rowKey}
      emptyTitle="No trades match"
      height={440}
      sort={sort}
      onSortChange={setSort}
      search={{ label: 'Search trades', value: query, onChange: setQuery, placeholder: 'Symbol or contract' }}
      selection={{ selectedRowIds: selected, onChange: setSelected, rowLabel: (id) => `Select trade ${id}` }}
      toolbar={<TableExport columns={csvColumns} filename={(scope) => `floorsheet-${scope}`} visibleRows={rows} allRows={all} selectedRows={rowsWithIds(rows, selected, rowKey)} />}
    />
  );
}
