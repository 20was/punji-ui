import { useMemo, useState } from 'react';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { PriceChange } from '@punji/ui/price-change';
import { nepalMoneyConfig } from '@punji/ui/money';
import { holdings, type Holding } from '../../sample.ts';

const preset = nepalMoneyConfig();
const paisa = (rupees: number) => BigInt(Math.round(rupees * 100));
type Key = 'symbol' | 'qty' | 'ltp' | 'change';

const columns: FinancialColumn<Holding>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, rowHeader: true, render: (h) => h.symbol },
  { key: 'qty', label: 'Units', num: true, sortable: true, render: (h) => h.qty.toLocaleString('en-IN') },
  { key: 'ltp', label: 'Last price', num: true, sortable: true, render: (h) => <MoneyDisplay value={paisa(h.ltp)} preset={preset} /> },
  { key: 'change', label: 'Change', num: true, sortable: true, render: (h) => <PriceChange size="sm" preset={preset} current={paisa(h.ltp)} previous={paisa(h.ltp / (1 + h.change / 100))} /> },
];

export default function Example() {
  const [sort, setSort] = useState<{ key: Key; dir: 'asc' | 'desc' }>({ key: 'symbol', dir: 'asc' });
  const rows = useMemo(() => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    return holdings.slice(0, 6).toSorted((a, b) => (a[sort.key] < b[sort.key] ? -sign : a[sort.key] > b[sort.key] ? sign : 0));
  }, [sort]);
  return (
    <FinancialTable
      caption="Holdings"
      columns={columns}
      rows={rows}
      rowKey={(h) => h.symbol}
      sort={sort}
      onSort={(key) => setSort((s) => ({ key: key as Key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}
      emptyTitle="No holdings yet"
    />
  );
}
