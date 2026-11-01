// Benchmark harness for scripts/bench-charts.mjs: the live charts and the
// Live/LiveFigure tween under high-frequency ticks, and the candle charts at
// 1k to 100k points. Imports the built package (dist/). Built with the
// react-dom profiling build (aliased in the script), so <Profiler> counts
// every commit in production mode. Driven from Playwright through window.bench.
import { Profiler, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
// oxlint-disable-next-line import/no-unassigned-import -- CSS distribution is a public API.
import '@punji/ui/styles.css';
import { CandlestickChart, type Candle } from '@punji/ui/candlestick-chart';
import { PerformanceChart, type PerformanceSeries } from '@punji/ui/performance-chart';
import { DepthChart } from '@punji/ui/depth-chart';
import { Sparkline } from '@punji/ui/sparkline';
import { Live, LiveFigure } from '@punji/ui/live-figure';

export type Scenario = 'candlestick' | 'performance' | 'depth' | 'sparkline' | 'live' | 'live-figure';

/** mulberry32: seeded, so every run draws the same data. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = generator(2082);
const iso = (day: number) => new Date(Date.UTC(2000, 0, 1) + day * 86_400_000).toISOString().slice(0, 10);

function candles(count: number): Candle[] {
  const out: Candle[] = [];
  let close = 500;
  for (let i = 0; i < count; i++) {
    const open = close;
    close = Math.max(10, open + (rnd() - 0.5) * 20);
    out.push({ date: iso(i), open, close, high: Math.max(open, close) + rnd() * 6, low: Math.min(open, close) - rnd() * 6, volume: Math.round(rnd() * 50_000) });
  }
  return out;
}
const tickCandle = (c: Candle, t: number): Candle => {
  const close = c.close + Math.sin(t) * 2;
  return { ...c, close, high: Math.max(c.high, close), low: Math.min(c.low, close), volume: (c.volume ?? 0) + 10 };
};
function walk(count: number, start: number): number[] {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < count; i++) out.push((v = Math.max(1, v + (rnd() - 0.48) * start * 0.01)));
  return out;
}
function levels(count: number, mid: number, side: 'bid' | 'ask') {
  return Array.from({ length: count }, (_, i) => ({ price: Math.round((side === 'bid' ? mid - 0.5 - i * 0.5 : mid + 0.5 + i * 0.5) * 100) / 100, quantity: Math.round(100 + rnd() * 2000), orders: 1 + Math.floor(rnd() * 9) }));
}

/** Counters the run reads: React commits (Profiler), render-function calls in Live, ticks applied. */
const counters = { commits: 0, commitMs: 0, liveRenders: 0 };
let tick: ((t: number) => void) | null = null;

function CandleScene({ size }: { size: number }) {
  const [data, setData] = useState(() => candles(size));
  useEffect(() => {
    tick = (t) => setData((d) => [...d.slice(0, -1), tickCandle(d.at(-1)!, t)]);
  }, []);
  return <CandlestickChart candles={data} label="Bench" averages={[{ type: 'sma', window: 20 }, { type: 'ema', window: 50 }]} />;
}
function PerformanceScene({ size }: { size: number }) {
  const [state, setState] = useState(() => {
    const dates = Array.from({ length: size }, (_, i) => iso(i));
    const series: PerformanceSeries[] = [{ key: 'p', label: 'Portfolio', values: walk(size, 1_200_000) }, { key: 'n', label: 'NEPSE', values: walk(size, 2700) }];
    return { dates, series };
  });
  useEffect(() => {
    tick = (t) => setState((s) => {
      const p = s.series[0]!;
      const values = p.values.slice();
      values[values.length - 1] = (values.at(-1) as number) + Math.sin(t) * 500;
      return { dates: s.dates, series: [{ ...p, values }, s.series[1]!] };
    });
  }, []);
  return <PerformanceChart dates={state.dates} series={state.series} label="Bench" />;
}
function DepthScene({ size }: { size: number }) {
  const [book, setBook] = useState(() => ({ bids: levels(size, 550, 'bid'), asks: levels(size, 550, 'ask') }));
  useEffect(() => {
    tick = (t) => setBook((b) => {
      const side = t % 2 ? 'bids' : 'asks';
      const next = b[side].slice();
      const at = (t * 7) % next.length;
      next[at] = { ...next[at]!, quantity: Math.round(100 + ((t * 7919) % 2000)) };
      return { ...b, [side]: next };
    });
  }, []);
  return <DepthChart bids={book.bids} asks={book.asks} label="Bench" />;
}
/** A watchlist: `rows` sparklines of `size` closes; each tick moves one row's line on by a close. */
function SparklineScene({ size, rows }: { size: number; rows: number }) {
  const [lines, setLines] = useState(() => Array.from({ length: rows }, () => walk(size, 500)));
  useEffect(() => {
    tick = (t) => setLines((ls) => {
      const next = ls.slice();
      const at = t % next.length;
      const line = next[at]!;
      next[at] = [...line.slice(1), line.at(-1)! + Math.sin(t) * 3];
      return next;
    });
  }, []);
  return <div>{lines.map((v, i) => <Sparkline key={i} values={v} label={`Row ${i}`} />)}</div>;
}
/** A watchlist of `rows` live prices; each tick moves one row (round robin), so at 1,000/s every figure is always moving. */
function LiveScene({ rows, figure }: { rows: number; figure: boolean }) {
  const [prices, setPrices] = useState(() => Array.from({ length: rows }, (_, i) => 100 + i));
  useEffect(() => {
    tick = (t) => setPrices((ps) => {
      const next = ps.slice();
      const at = t % next.length;
      next[at] = Math.round((next[at]! + Math.sin(t) * 2) * 100) / 100;
      return next;
    });
  }, []);
  return (
    <ul style={{ columns: 4, listStyle: 'none', margin: 0, padding: 0 }}>
      {prices.map((p, i) => (
        <li key={i}>
          {figure ? <LiveFigure value={p} kind="rs" /> : <Live value={p}>{(n) => { counters.liveRenders++; return n === null || n === undefined ? '-' : n.toFixed(2); }}</Live>}
        </li>
      ))}
    </ul>
  );
}

function Scene({ scenario, size, rows }: { scenario: Scenario; size: number; rows: number }): ReactNode {
  switch (scenario) {
    case 'candlestick': return <CandleScene size={size} />;
    case 'performance': return <PerformanceScene size={size} />;
    case 'depth': return <DepthScene size={size} />;
    case 'sparkline': return <SparklineScene size={size} rows={rows} />;
    case 'live': return <LiveScene rows={rows} figure={false} />;
    case 'live-figure': return <LiveScene rows={rows} figure />;
  }
}

let root: Root | null = null;
const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const round = (n: number) => Math.round(n * 100) / 100;
const percentile = (values: number[], p: number) => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]! : 0;
};
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const onRender = (_id: string, _phase: string, actual: number) => {
  counters.commits++;
  counters.commitMs += actual;
};

const bench = {
  /** Mount a scenario; returns ms to commit (synchronous) and to the next painted frame, and the DOM size. */
  async mount(scenario: Scenario, size: number, rows: number) {
    root?.unmount();
    tick = null;
    const host = document.getElementById('root')!;
    host.replaceChildren();
    await frame();
    const t0 = performance.now();
    root = createRoot(host);
    flushSync(() => root!.render(<Profiler id="bench" onRender={onRender}><Scene scenario={scenario} size={size} rows={rows} /></Profiler>));
    const commit = performance.now() - t0;
    await frame();
    await frame();
    return { commitMs: round(commit), paintMs: round(performance.now() - t0), nodes: host.querySelectorAll('*').length };
  },
  /**
   * `perSecond` ticks a second for `ms`, each its own task (as messages from a
   * socket arrive), never batched by the harness: React decides how many
   * commits they cost. Reports frame pacing, long tasks, commits per tick and
   * the React commit time.
   */
  async ticks(ms: number, perSecond: number) {
    const longTasks: number[] = [];
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longTasks.push(e.duration);
    });
    po.observe({ type: 'longtask', buffered: false });
    await frame();
    counters.commits = 0;
    counters.commitMs = 0;
    counters.liveRenders = 0;
    const interval = 1000 / perSecond;
    const channel = new MessageChannel();
    let sent = 0;
    let running = true;
    const start = performance.now();
    const pump = () => {
      if (!running) return;
      const due = Math.floor((performance.now() - start) / interval);
      if (sent < due) {
        sent++;
        tick?.(sent);
      }
      // Behind schedule: the next tick is its own task right away; ahead: wait for it.
      if (sent < Math.floor((performance.now() - start) / interval)) channel.port2.postMessage(0);
      else setTimeout(pump, Math.max(0, start + (sent + 1) * interval - performance.now()));
    };
    channel.port1.addEventListener('message', pump);
    channel.port1.start();
    pump();
    const deltas: number[] = [];
    let last = await frame();
    while (last - start < ms) {
      const now = await frame();
      deltas.push(now - last);
      last = now;
    }
    running = false;
    channel.port1.close();
    // Let the last commit and any tween settle so commit counts are whole.
    await new Promise((r) => setTimeout(r, 100));
    po.disconnect();
    const seconds = (last - start) / 1000;
    return {
      ticks: sent,
      ticksPerSecond: round(sent / seconds),
      fps: round(deltas.length / seconds),
      frameMeanMs: round(mean(deltas)),
      frameP95Ms: round(percentile(deltas, 0.95)),
      frameMaxMs: round(Math.max(0, ...deltas)),
      longTasks: longTasks.length,
      longTaskMs: round(longTasks.reduce((a, b) => a + b, 0)),
      commits: counters.commits,
      commitsPerTick: round(counters.commits / Math.max(1, sent)),
      commitsPerSecond: round(counters.commits / seconds),
      commitMeanMs: round(counters.commitMs / Math.max(1, counters.commits)),
      liveRendersPerTick: round(counters.liveRenders / Math.max(1, sent)),
    };
  },
  /** `count` single ticks, each committed synchronously (flushSync) and timed: the cost of one update at this data size. */
  async tickCost(count: number) {
    const times: number[] = [];
    for (let i = 1; i <= count; i++) {
      await frame();
      const t0 = performance.now();
      flushSync(() => tick!(i));
      times.push(performance.now() - t0);
    }
    return { tickMeanMs: round(mean(times)), tickP95Ms: round(percentile(times, 0.95)) };
  },
};

declare global {
  interface Window { bench: typeof bench }
}
window.bench = bench;
document.title = 'ready';
