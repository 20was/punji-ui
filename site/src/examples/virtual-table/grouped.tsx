import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { VirtualFinancialTable, type VirtualColumn } from '@punji/ui/virtual-table';
import { sortRows, type ColumnDef } from '@punji/ui/table-core';
import { createMoneyFormatter, isMoney, money, nepalMoneyConfig } from '@punji/ui/money';
import { sampleTrades, type SampleTrade } from '../../sample.ts';

// 5,000 trades grouped by symbol: each group header is a virtual row with its
// subtotals; the totals row stays at the bottom of the scroll box. Amounts are
// summed as bigint paisa, so the totals are exact.
const npr = createMoneyFormatter(nepalMoneyConfig());
const rowKey = (t: SampleTrade) => t.id;
const bySymbol = (t: SampleTrade) => t.symbol;
const show = (value: unknown) => (isMoney(value) ? npr.format(value.minor) : typeof value === 'number' ? value.toLocaleString('en-IN') : String(value));

const columns: VirtualColumn<SampleTrade>[] = [
  { key: 'id', label: 'Contract', rowHeader: true, pin: 'left', width: 150, render: (t) => t.id },
  { key: 'time', label: 'Time', kind: 'date', width: 92, render: (t) => t.time },
  { key: 'quantity', label: 'Units', kind: 'quantity', width: 110, value: (t) => t.quantity, aggregate: 'sum', formatAggregate: show, render: (t) => t.quantity.toLocaleString('en-IN') },
  { key: 'rate', label: 'High rate', kind: 'price', width: 130, value: (t) => money(t.rate, 'NPR'), aggregate: 'max', formatAggregate: show, render: (t) => npr.format(t.rate) },
  { key: 'amount', label: 'Amount', kind: 'money', width: 170, pin: 'right', value: (t) => money(t.amount, 'NPR'), aggregate: 'sum', formatAggregate: show, render: (t) => npr.format(t.amount) },
];
// The same columns as ColumnDefs sort the rows by symbol, then time: groups follow first appearance.
const defs: ColumnDef<SampleTrade>[] = [
  { id: 'symbol', header: 'Symbol', accessor: (t) => t.symbol },
  { id: 'time', header: 'Time', accessor: (t) => t.time },
];

export default function Example() {
  const rows = useMemo(() => sortRows(sampleTrades(5_000, 11), defs, [{ key: 'symbol', dir: 'asc' }, { key: 'time', dir: 'asc' }]), []);
  const [collapsed, setCollapsed] = useState<readonly string[]>([]);
  const symbols = useMemo(() => [...new Set(rows.map(bySymbol))], [rows]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={() => setCollapsed(symbols)}>Collapse all</Button>
        <Button variant="secondary" size="sm" onClick={() => setCollapsed([])}>Expand all</Button>
      </div>
      <VirtualFinancialTable
        caption="Floorsheet by symbol, NPR"
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        emptyTitle="No trades"
        height={420}
        groupBy={bySymbol}
        collapsedGroups={collapsed}
        onCollapsedGroupsChange={setCollapsed}
        totals
      />
    </div>
  );
}
