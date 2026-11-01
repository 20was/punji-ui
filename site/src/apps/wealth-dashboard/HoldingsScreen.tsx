import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { HoldingsTable } from '@punji/ui/holdings-table';
import { sortHoldings, transactionLedger, type HoldingSort, type PortfolioLedgerRow } from '@punji/ui/portfolio';
import { TableExport } from '@punji/ui/table-export';
import { TransactionHistory } from '@punji/ui/transaction-history';
import type { CsvColumn } from '@punji/ui/export';
import { ScreenTitle } from '../shared/kit.tsx';
import { npr, useWealth } from './store.ts';

const decimal = (paisa: bigint | null | undefined) => {
  if (paisa === null || paisa === undefined) return '';
  const abs = paisa < 0n ? -paisa : paisa;
  return `${paisa < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
};

const LEDGER_COLUMNS: CsvColumn<PortfolioLedgerRow>[] = [
  { header: 'Date', accessor: 'date' },
  { header: 'Type', accessor: 'type' },
  { header: 'Symbol', accessor: 'symbol' },
  { header: 'Quantity', accessor: (r) => r.quantity?.toString() ?? '', keepNumericText: true },
  { header: 'Price (NPR)', accessor: (r) => decimal(r.price), keepNumericText: true },
  { header: 'Fees (NPR)', accessor: (r) => decimal(r.fees), keepNumericText: true },
  { header: 'Cash flow (NPR)', accessor: (r) => decimal(r.cashFlow), keepNumericText: true },
  { header: 'Realised P&L (NPR)', accessor: (r) => decimal(r.realisedPnL), keepNumericText: true },
  { header: 'Note', accessor: (r) => r.note ?? '' },
];

/** Holdings marked to the live prices with a CSV of them, then the full transaction history with its own CSV. */
export default function HoldingsScreen() {
  const { state, derived } = useWealth();
  const [sort, setSort] = useState<HoldingSort>({ key: 'value', dir: 'desc' });
  const ledger = transactionLedger(state.transactions);
  return (
    <div className="app-stack">
      <ScreenTitle>Holdings</ScreenTitle>
      <Card title="Shares" description="Live prices; average cost includes fees; bonus shares cost nothing" headingLevel={3} flush>
        <HoldingsTable
          caption="Holdings"
          holdings={sortHoldings(derived.summary.holdings, sort)}
          totals={derived.summary.totals}
          sort={sort}
          onSortChange={setSort}
          columns={['symbol', 'value', 'quantity', 'cost', 'ltp', 'pnl', 'day', 'weight']}
          density="compact"
          bare
          exportFilename="holdings-2026-11-01.csv"
          testId="wd-holdings"
        />
      </Card>
      <Card
        title="Transactions"
        description={`${state.transactions.length} records since 2023`}
        headingLevel={3}
        action={<TableExport columns={LEDGER_COLUMNS} filename="transactions-2026-11-01" visibleRows={ledger} label="Export transactions" testIdPrefix="wd-tx-export" />}
        flush
      >
        <TransactionHistory transactions={state.transactions} caption="Transaction history" money={npr} pageSize={10} order="newest" maxDate="2026-11-01" testId="wd-tx" />
      </Card>
    </div>
  );
}
