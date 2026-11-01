import { useMemo, useState } from 'react';
import { VirtualFinancialTable, type VirtualColumn } from '@punji/ui/virtual-table';
import { Checkbox } from '@punji/ui/checkbox';
import { useLocalStorage } from '@punji/ui/hooks';
import { createMoneyFormatter, nepalMoneyConfig } from '@punji/ui/money';
import { sampleTrades, type SampleTrade } from '../../sample.ts';

// Drag a head's right edge, or focus its handle and use the arrow keys (Shift for
// bigger steps, Home and End for the bounds). Widths persist in localStorage.
const npr = createMoneyFormatter(nepalMoneyConfig());
const rowKey = (t: SampleTrade) => t.id;
type Widths = Record<string, number>;
const isWidths = (value: unknown): value is Widths =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every((w) => typeof w === 'number' && Number.isFinite(w));

export default function Example() {
  const rows = useMemo(() => sampleTrades(2_000, 7), []);
  const [pinLeft, setPinLeft] = useState(true);
  const [pinRight, setPinRight] = useState(true);
  const widths = useLocalStorage<Widths>('punji-docs-floorsheet-widths', { defaultValue: {}, validate: isWidths });
  const columns: VirtualColumn<SampleTrade>[] = [
    { key: 'id', label: 'Contract', rowHeader: true, pin: pinLeft ? 'left' : undefined, width: 136, minWidth: 110, render: (t) => t.id },
    { key: 'name', label: 'Company', width: 240, maxWidth: 360, render: (t) => t.name },
    { key: 'time', label: 'Time', width: 92, render: (t) => t.time },
    { key: 'buyer', label: 'Buyer', num: true, width: 84, render: (t) => t.buyer },
    { key: 'seller', label: 'Seller', num: true, width: 84, render: (t) => t.seller },
    { key: 'quantity', label: 'Units', num: true, width: 96, render: (t) => t.quantity.toLocaleString('en-IN') },
    { key: 'rate', label: 'Rate', num: true, width: 120, render: (t) => npr.format(t.rate) },
    { key: 'amount', label: 'Amount', num: true, width: 150, pin: pinRight ? 'right' : undefined, resizable: false, render: (t) => npr.format(t.amount) },
  ];
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <Checkbox checked={pinLeft} onChange={setPinLeft}>Pin contract left</Checkbox>
        <Checkbox checked={pinRight} onChange={setPinRight}>Pin amount right</Checkbox>
      </div>
      <VirtualFinancialTable
        caption="Floorsheet with pinned and resizable columns, NPR"
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        emptyTitle="No trades"
        height={360}
        columnWidths={widths.value}
        onColumnResize={(key, width) => widths.set((prev) => ({ ...prev, [key]: width }))}
      />
    </div>
  );
}
