import { useEffect, useState } from 'react';
import { VirtualFinancialTable, type VirtualColumn } from '@punji/ui/virtual-table';
import { Button } from '@punji/ui/button';
import { createMoneyFormatter, nepalMoneyConfig } from '@punji/ui/money';
import { sampleTrades, tickTrade, type SampleTrade } from '../../sample.ts';

// 1,000 rate changes a second, applied once per animation frame. Scroll or focus a
// row while it runs: the rows in view and the focused row stay where they are.
const npr = createMoneyFormatter(nepalMoneyConfig());
const rowKey = (t: SampleTrade) => t.id;
const columns: VirtualColumn<SampleTrade>[] = [
  { key: 'id', label: 'Contract', rowHeader: true, pin: 'left', width: 136, render: (t) => t.id },
  { key: 'symbol', label: 'Symbol', width: 96, render: (t) => <b>{t.symbol}</b> },
  { key: 'quantity', label: 'Units', num: true, width: 96, render: (t) => t.quantity.toLocaleString('en-IN') },
  { key: 'rate', label: 'Rate', num: true, width: 120, render: (t) => npr.format(t.rate) },
  { key: 'amount', label: 'Amount', num: true, width: 150, pin: 'right', render: (t) => npr.format(t.amount) },
];

export default function Example() {
  const [rows, setRows] = useState(() => sampleTrades(10_000));
  const [running, setRunning] = useState(false);
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let tick = 0;
    const step = (now: number) => {
      const due = Math.min(200, Math.round(now - last));
      last = now;
      if (due > 0) {
        setRows((prev) => {
          const next = prev.slice();
          for (let i = 0; i < due; i++) {
            tick += 1;
            const at = (tick * 7_919) % next.length;
            next[at] = tickTrade(next[at]!, tick);
          }
          return next;
        });
        setTicks((n) => n + due);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Button size="sm" variant="secondary" onClick={() => setRunning((r) => !r)} aria-pressed={running}>{running ? 'Pause updates' : 'Start 1,000 updates a second'}</Button>
        <span>{ticks.toLocaleString('en-IN')} updates</span>
      </div>
      <VirtualFinancialTable caption="Live rates, 10,000 trades, NPR" columns={columns} rows={rows} rowKey={rowKey} emptyTitle="No trades" height={360} />
    </div>
  );
}
