import { Card } from '@punji/ui/card';
import { TableExport } from '@punji/ui/table-export';
import { TradeList, type TradeFill } from '@punji/ui/order-list';
import type { CsvColumn } from '@punji/ui/export';
import { ScreenTitle } from '../shared/kit.tsx';
import { npr, useTerminal } from './store.ts';

const decimal = (paisa: bigint) => {
  const sign = paisa < 0n ? '-' : '';
  const abs = paisa < 0n ? -paisa : paisa;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
};

const COLUMNS: CsvColumn<TradeFill>[] = [
  { header: 'Contract', accessor: (t) => t.id },
  { header: 'Time', accessor: (t) => t.time ?? '' },
  { header: 'Symbol', accessor: (t) => t.symbol },
  { header: 'Side', accessor: (t) => t.side },
  { header: 'Quantity', accessor: (t) => t.quantity.toString(), keepNumericText: true },
  { header: 'Price (NPR)', accessor: (t) => decimal(t.price), keepNumericText: true },
  { header: 'Amount (NPR)', accessor: (t) => decimal(t.price * t.quantity), keepNumericText: true },
  { header: 'Counterparty broker', accessor: (t) => t.counterpartyBroker ?? '' },
];

/** The trade book: every fill today with its exact amount, totals for bought and sold, and a CSV of the book. */
export default function TradesScreen() {
  const { state } = useTerminal();
  return (
    <div className="app-stack">
      <ScreenTitle aside={<TableExport columns={COLUMNS} filename="trades-2026-11-01" visibleRows={state.fills} label="Export trades" testIdPrefix="tt-trades-export" />}>Trades</ScreenTitle>
      <Card title="Trade book" description={`${state.fills.length} fills today, newest first`} headingLevel={3} flush>
        <TradeList trades={state.fills} money={npr} labels={{ empty: 'No fills yet. An order fills when the market trades at your limit or better.' }} testId="tt-trades" />
      </Card>
    </div>
  );
}
