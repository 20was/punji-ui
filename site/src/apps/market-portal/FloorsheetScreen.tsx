import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { SelectField } from '@punji/ui/fields';
import { ListFilter } from '@punji/ui/list-filter';
import { MetricRow, MetricTile } from '@punji/ui/metric-tile';
import { MoneyDisplay } from '@punji/ui/money-display';
import { formatPrice } from '@punji/ui/nepal/market-format';
import { minorUnitsToDecimal } from '@punji/ui/nepal/money';
import { TableExport } from '@punji/ui/table-export';
import { VirtualFinancialTable, compareByRules, type SortRule, type VirtualColumn } from '@punji/ui/virtual-table';
import { ScreenTitle } from '../shared/kit.tsx';
import { BROKERS, portalTime, type FloorTrade } from './market.ts';
import { npr, usePortal } from './store.ts';

const rowKey = (t: FloorTrade) => t.id;
const rs = (paisa: bigint) => formatPrice(Number(paisa) / 100);
const READ: Record<string, (t: FloorTrade) => string | number | bigint> = {
  id: (t) => t.id, time: (t) => t.tick, symbol: (t) => t.symbol, buyer: (t) => t.buyer, seller: (t) => t.seller, quantity: (t) => t.quantity, rate: (t) => t.rate, amount: (t) => t.amount,
};
const COLUMNS: VirtualColumn<FloorTrade>[] = [
  { key: 'id', label: 'Contract', rowHeader: true, pin: 'left', width: 150, sortable: true, render: (t) => t.id },
  { key: 'time', label: 'Time', width: 92, sortable: true, render: (t) => portalTime(t.tick) },
  { key: 'symbol', label: 'Symbol', width: 96, sortable: true, render: (t) => <b>{t.symbol}</b> },
  { key: 'buyer', label: 'Buyer', num: true, width: 84, sortable: true, render: (t) => t.buyer },
  { key: 'seller', label: 'Seller', num: true, width: 84, sortable: true, render: (t) => t.seller },
  { key: 'quantity', label: 'Units', num: true, width: 96, sortable: true, render: (t) => t.quantity.toLocaleString('en-IN') },
  { key: 'rate', label: 'Rate', num: true, width: 104, sortable: true, render: (t) => rs(t.rate) },
  { key: 'amount', label: 'Amount', num: true, width: 140, sortable: true, render: (t) => rs(t.amount) },
];
const decimal = (v: unknown) => minorUnitsToDecimal(v as bigint);
const CSV = [
  { header: 'Contract', accessor: 'id' as const },
  { header: 'Time', accessor: (t: FloorTrade) => portalTime(t.tick) },
  { header: 'Symbol', accessor: 'symbol' as const },
  { header: 'Buyer broker', accessor: 'buyer' as const },
  { header: 'Seller broker', accessor: 'seller' as const },
  { header: 'Units', accessor: 'quantity' as const },
  { header: 'Rate (NPR)', accessor: 'rate' as const, format: decimal, keepNumericText: true },
  { header: 'Amount (NPR)', accessor: 'amount' as const, format: decimal, keepNumericText: true },
];
const BROKER_OPTIONS = [{ value: '', label: 'Any broker' }, ...Array.from({ length: BROKERS }, (_, i) => ({ value: String(i + 1), label: `Broker ${i + 1}` }))];

/** Today's floorsheet: every contract with its buying and selling broker, live, filterable and exportable. */
export default function FloorsheetScreen() {
  const { state, dispatch } = usePortal();
  const [symbol, setSymbol] = useState('');
  const [buyer, setBuyer] = useState('');
  const [seller, setSeller] = useState('');
  const [sort, setSort] = useState<SortRule[]>([{ key: 'id', dir: 'desc' }]);
  const all = state.market.trades;
  const rows = useMemo(() => {
    const q = symbol.trim().toUpperCase();
    const b = buyer ? Number(buyer) : 0;
    const s = seller ? Number(seller) : 0;
    const shown = q || b || s ? all.filter((t) => (!q || t.symbol.startsWith(q)) && (!b || t.buyer === b) && (!s || t.seller === s)) : all;
    return shown.toSorted(compareByRules(sort, READ));
  }, [all, symbol, buyer, seller, sort]);
  const totals = useMemo(() => rows.reduce((acc, t) => ({ quantity: acc.quantity + t.quantity, amount: acc.amount + t.amount }), { quantity: 0, amount: 0n }), [rows]);
  const filtered = Boolean(symbol || buyer || seller);
  const clear = () => {
    setSymbol('');
    setBuyer('');
    setSeller('');
  };

  return (
    <div className="app-stack">
      <ScreenTitle aside={<span className="app-small app-muted">As of {portalTime(state.market.tick)}</span>}>Floorsheet</ScreenTitle>
      <MetricRow label="Shown contracts" count={3} dense>
        <MetricTile label="Contracts" value={rows.length.toLocaleString('en-IN')} note={filtered ? `of ${all.length.toLocaleString('en-IN')} today` : 'Today, all brokers'} compact />
        <MetricTile label="Units" value={totals.quantity.toLocaleString('en-IN')} note="Sum of the rows shown" compact />
        <MetricTile label="Amount" value={<MoneyDisplay value={totals.amount} preset={npr} compact />} note="Units × rate, exact" compact />
      </MetricRow>
      <div className="mp-filters" role="group" aria-label="Floorsheet filters">
        <ListFilter value={symbol} onChange={setSymbol} label="Symbol" clear="Clear symbol" placeholder="Symbol, e.g. NABIL" size="md" testId="mp-floor-symbol" />
        <div className="mp-field">
          <SelectField label="Buyer broker" value={buyer} onChange={setBuyer} options={BROKER_OPTIONS} size="md" testId="mp-floor-buyer" />
        </div>
        <div className="mp-field">
          <SelectField label="Seller broker" value={seller} onChange={setSeller} options={BROKER_OPTIONS} size="md" testId="mp-floor-seller" />
        </div>
        {filtered && (
          <Button size="sm" variant="ghost" onClick={clear} testId="mp-floor-clear">
            Clear filters
          </Button>
        )}
      </div>
      <VirtualFinancialTable
        caption={`Floorsheet, ${rows.length.toLocaleString('en-IN')} contracts, amounts in NPR`}
        columns={COLUMNS}
        rows={rows}
        rowKey={rowKey}
        state={state.feedDown ? 'error' : 'ready'}
        errorTitle="The floorsheet feed stopped."
        errorAction={
          <Button size="sm" onClick={() => dispatch({ type: 'feed', down: false })}>
            Reconnect
          </Button>
        }
        emptyTitle="No contracts match"
        emptyBody={buyer && seller && buyer === seller ? 'A broker crossing with itself is rare: choose different brokers or clear one.' : 'Try another symbol or broker, or clear the filters.'}
        height={520}
        sort={sort}
        onSortChange={setSort}
        toolbar={<TableExport columns={CSV} filename={(scope) => `floorsheet-2026-11-01-${scope}`} visibleRows={rows} allRows={all} testIdPrefix="mp-floor-export" />}
        testId="mp-floorsheet"
      />
      <p className="app-small app-muted">New contracts arrive at the top while the market is open; a row you are reading stays where it is. Each scrip&apos;s volume and turnover elsewhere in the portal are these contracts summed.</p>
    </div>
  );
}
