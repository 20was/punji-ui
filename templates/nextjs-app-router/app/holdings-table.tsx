'use client';

import { FinancialTable } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { PriceChange } from '@punji/ui/price-change';

export type Holding = { symbol: string; name: string; units: bigint; close: bigint; previous: bigint };

const npr = nepalMoneyConfig();

/** The table takes render functions, and functions cannot be props from a Server Component, so it lives here. */
export function HoldingsTable({ holdings }: { holdings: readonly Holding[] }) {
  const rows = holdings.toSorted((a, b) => (b.units * b.close > a.units * a.close ? 1 : -1));
  return (
    <FinancialTable<Holding>
      caption="Holdings"
      rows={rows}
      rowKey={(h) => h.symbol}
      emptyTitle="No holdings yet"
      columns={[
        { key: 'symbol', label: 'Symbol', rowHeader: true, render: (h) => <span title={h.name}>{h.symbol}</span> },
        { key: 'units', label: 'Units', num: true, render: (h) => h.units.toLocaleString('en-IN') },
        { key: 'close', label: 'Close', num: true, render: (h) => <MoneyDisplay value={h.close} preset={npr} display="none" /> },
        { key: 'change', label: 'Change', num: true, render: (h) => <PriceChange current={h.close} previous={h.previous} preset={npr} size="sm" /> },
        { key: 'value', label: 'Value', num: true, render: (h) => <MoneyDisplay value={h.units * h.close} preset={npr} /> },
      ]}
    />
  );
}
