// Benchmark harness for scripts/bench-table.mjs: 10,000 synthetic trades in
// VirtualFinancialTable (or the plain FinancialTable for comparison), driven
// from Playwright through window.bench. Imports the built package (dist/).
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- CSS distribution is a public API.
import '@punji/ui/styles.css';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { VirtualFinancialTable, type VirtualColumn } from '@punji/ui/virtual-table';
import { sampleTrades, tickTrade, type SampleTrade } from '../../fixtures/trade-data.ts';

type Mode = 'virtual' | 'plain';
interface FrameStats { frames: number; seconds: number; fps: number; meanMs: number; p95Ms: number; maxMs: number; longFrames: number }
interface UpdateStats extends FrameStats { updates: number; updatesPerSecond: number; commitMeanMs: number; commitP95Ms: number }

const rowKey = (t: SampleTrade) => t.id;
const columns: (VirtualColumn<SampleTrade> & FinancialColumn<SampleTrade>)[] = [
  { key: 'id', label: 'Contract', rowHeader: true, pin: 'left', width: 136, render: (t) => t.id },
  { key: 'time', label: 'Time', width: 92, render: (t) => t.time },
  { key: 'symbol', label: 'Symbol', width: 96, render: (t) => t.symbol },
  { key: 'buyer', label: 'Buyer', num: true, width: 84, render: (t) => t.buyer },
  { key: 'seller', label: 'Seller', num: true, width: 84, render: (t) => t.seller },
  { key: 'quantity', label: 'Units', num: true, width: 96, render: (t) => t.quantity },
  { key: 'rate', label: 'Rate', num: true, width: 120, render: (t) => String(t.rate) },
  { key: 'amount', label: 'Amount', num: true, width: 150, render: (t) => String(t.amount) },
];

let root: Root | null = null;
let setRowsOutside: ((update: (rows: SampleTrade[]) => SampleTrade[]) => void) | null = null;

function App({ mode, initial }: { mode: Mode; initial: SampleTrade[] }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    setRowsOutside = setRows;
  }, []);
  return mode === 'virtual'
    ? <VirtualFinancialTable caption="Bench" columns={columns} rows={rows} rowKey={rowKey} emptyTitle="None" height={600} testId="bench" />
    : <div className="kit-tablebox" style={{ maxHeight: 600, overflow: 'auto' }} data-plain-scroll><FinancialTable caption="Bench" columns={columns} rows={rows} rowKey={rowKey} emptyTitle="None" /></div>;
}

const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const percentile = (values: number[], p: number) => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]! : 0;
};
const round = (n: number) => Math.round(n * 100) / 100;
function frameStats(deltas: number[], seconds: number): FrameStats {
  const mean = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
  return { frames: deltas.length, seconds: round(seconds), fps: round(deltas.length / seconds), meanMs: round(mean), p95Ms: round(percentile(deltas, 0.95)), maxMs: round(Math.max(0, ...deltas)), longFrames: deltas.filter((d) => d > 50).length };
}
const scroller = () => document.querySelector<HTMLElement>('.pu-vt-box, [data-plain-scroll]')!;

const bench = {
  /** Mount `count` rows; returns ms to commit (synchronous render) and to the next painted frame. */
  async mount(mode: Mode, count: number) {
    root?.unmount();
    const host = document.getElementById('root')!;
    host.replaceChildren();
    const initial = sampleTrades(count);
    await frame();
    const t0 = performance.now();
    root = createRoot(host);
    flushSync(() => root!.render(<App mode={mode} initial={initial} />));
    const commit = performance.now() - t0;
    await frame();
    await frame();
    return { commitMs: round(commit), paintMs: round(performance.now() - t0), rowsInDom: document.querySelectorAll('tbody tr:not(.pu-vt-spacer)').length };
  },
  /** Scroll by `step` px every frame for `ms`, reversing at the ends; frame times are the FPS proxy. */
  async scroll(ms: number, step: number) {
    const box = scroller();
    const deltas: number[] = [];
    let dir = 1;
    let last = await frame();
    const start = last;
    while (last - start < ms) {
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - step) dir = -1;
      else if (box.scrollTop <= 0) dir = 1;
      box.scrollTop += dir * step;
      const now = await frame();
      deltas.push(now - last);
      last = now;
    }
    return frameStats(deltas, (last - start) / 1000);
  },
  /** Apply `perSecond` row updates per second for `ms`, batched once per frame; each batch commits synchronously so its cost is measured. */
  async updates(ms: number, perSecond: number) {
    const deltas: number[] = [];
    const commits: number[] = [];
    let tick = 0;
    let owed = 0;
    let last = await frame();
    const start = last;
    while (last - start < ms) {
      const now = await frame();
      deltas.push(now - last);
      owed += ((now - last) / 1000) * perSecond;
      const due = Math.floor(owed);
      owed -= due;
      last = now;
      if (due === 0) continue;
      const t0 = performance.now();
      flushSync(() => setRowsOutside!((rows) => {
        const next = rows.slice();
        for (let i = 0; i < due; i++) {
          tick += 1;
          const at = (tick * 7_919) % next.length;
          next[at] = tickTrade(next[at]!, tick);
        }
        return next;
      }));
      commits.push(performance.now() - t0);
    }
    const seconds = (last - start) / 1000;
    const stats: UpdateStats = { ...frameStats(deltas, seconds), updates: tick, updatesPerSecond: round(tick / seconds), commitMeanMs: round(commits.reduce((a, b) => a + b, 0) / Math.max(1, commits.length)), commitP95Ms: round(percentile(commits, 0.95)) };
    return stats;
  },
};

declare global {
  interface Window { bench: typeof bench }
}
window.bench = bench;
document.title = 'ready';
