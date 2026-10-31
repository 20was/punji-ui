import { useMemo, useState } from 'react';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { usePagination } from '@punji/ui/hooks';
import { holdings, type Holding } from '../../sample.ts';

const columns: FinancialColumn<Holding>[] = [
  { key: 'symbol', label: 'Symbol', rowHeader: true, render: (h) => h.symbol },
  { key: 'name', label: 'Company', render: (h) => h.name },
  { key: 'qty', label: 'Units', num: true, render: (h) => h.qty },
];

export default function Example() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => holdings.filter((h) => `${h.symbol} ${h.name}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const pager = usePagination({ total: filtered.length, defaultPageSize: 4 });
  return (
    <FinancialTable
      caption="Holdings"
      columns={columns}
      rows={filtered.slice(pager.startIndex, pager.endIndex)}
      rowKey={(h) => h.symbol}
      emptyTitle="No holdings match"
      search={{ label: 'Search holdings', value: query, onChange: (value) => { setQuery(value); pager.setPage(1); }, placeholder: 'Symbol or company' }}
      pagination={{ pageIndex: pager.pageIndex, pageSize: pager.pageSize, rowCount: filtered.length, onPageChange: (index) => pager.setPage(index + 1) }}
    />
  );
}
