// Regression guard for the live-chart work measured in docs/PERFORMANCE.md
// (scripts/bench-charts.mjs). Wall-clock time is not stable in CI, so these
// count work instead: formatter calls and React commits per live tick. A tick
// that changes one candle, one date or one figure must cost about one row and
// one commit, not the whole data set.
import { act, render } from '@testing-library/react';
import { Profiler } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CandlestickChart, LiveFigure, PerformanceChart, Sparkline, type Candle, type PerformanceSeries } from '../src/index.ts';
import { reduceSeries } from '../src/sparkline/Sparkline.tsx';

const iso = (day: number) => new Date(Date.UTC(2020, 0, 1) + day * 86_400_000).toISOString().slice(0, 10);
const candles = (n: number): Candle[] => Array.from({ length: n }, (_, i) => {
  const open = 500 + Math.sin(i / 7) * 20;
  const close = open + Math.cos(i / 3) * 4;
  return { date: iso(i), open, close, high: Math.max(open, close) + 2, low: Math.min(open, close) - 2, volume: 1000 + i };
});
const tickLast = (cs: Candle[]): Candle[] => {
  const last = cs.at(-1)!;
  // Inside the day's range, so the price scale does not move.
  return [...cs.slice(0, -1), { ...last, close: last.close + 0.5, volume: (last.volume ?? 0) + 10 }];
};

const series = (vs: number[]): PerformanceSeries[] => [{ key: 'p', label: 'Portfolio', values: vs }];

describe('live ticks cost one row, not the data set', () => {
  it('CandlestickChart: a tick on the forming candle formats one table row', () => {
    const formatVolume = vi.fn<(v: number) => string>((v) => String(v));
    const data = candles(400);
    const { rerender, container } = render(<CandlestickChart candles={data} label="Bench" formatVolume={formatVolume} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(400);
    expect(formatVolume.mock.calls.length).toBeGreaterThanOrEqual(400);
    formatVolume.mockClear();
    rerender(<CandlestickChart candles={tickLast(data)} label="Bench" formatVolume={formatVolume} />);
    expect(formatVolume.mock.calls.length).toBeLessThanOrEqual(2);
    expect(container.querySelector('tbody tr:last-child td:nth-child(6)')!.textContent).toBe(String((data.at(-1)!.volume ?? 0) + 10));
  });

  it('CandlestickChart: a candle changed in place is checked again', () => {
    const data = candles(3);
    const { rerender, container } = render(<CandlestickChart candles={data} label="Bench" />);
    expect(container.querySelectorAll('.kit-ct-c')).toHaveLength(3);
    data[1]!.high = data[1]!.low - 1;
    rerender(<CandlestickChart candles={[...data]} label="Bench" />);
    expect(container.querySelectorAll('.kit-ct-c')).toHaveLength(2);
  });

  it('PerformanceChart: a tick on the latest date formats a handful of values, and the table keeps the latest 500 dates', () => {
    const n = 1000;
    const dates = Array.from({ length: n }, (_, i) => iso(i));
    const values = Array.from({ length: n }, (_, i) => 1000 + Math.sin(i / 9) * 50);
    const formatValue = vi.fn<(v: number) => string>((v) => v.toFixed(2));
    const { rerender, container, getByText } = render(<PerformanceChart dates={dates} series={series(values)} label="Bench" normalize={false} formatValue={formatValue} />);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(500);
    getByText('Showing the latest 500 of 1000 dates');
    formatValue.mockClear();
    const next = values.slice();
    next[n - 1] = next[n - 1]! + 1;
    rerender(<PerformanceChart dates={dates} series={series(next)} label="Bench" normalize={false} formatValue={formatValue} />);
    // Axis ticks, the legend's latest value and one table row; never 500 rows.
    expect(formatValue.mock.calls.length).toBeLessThanOrEqual(20);
  });

  it('Sparkline is memoised, so a watchlist row with the same closes skips its line', () => {
    expect((Sparkline as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('reduceSeries keeps the first, the last and each bucket extreme, ascending', () => {
    const values = Array.from({ length: 10_000 }, (_, i) => Math.sin(i / 13) * 100 + (i === 4321 ? 1000 : 0));
    const out = reduceSeries(values, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out[0]).toBe(values[0]);
    expect(out.at(-1)).toBe(values.at(-1));
    expect(out).toContain(1000 + Math.sin(4321 / 13) * 100);
  });
});

describe('Live tweening shares one frame', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('20 moving figures cost one React commit per animation frame', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const frames: ((t: number) => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => (frames.push(cb), frames.length));
    let commits = 0;
    const list = (base: number) => (
      <Profiler id="w" onRender={() => { commits += 1; }}>
        {Array.from({ length: 20 }, (_, i) => <LiveFigure key={i} value={base + i} />)}
      </Profiler>
    );
    const { rerender, container } = render(list(100));
    rerender(list(110));
    expect(frames).toHaveLength(1);
    let now = 0;
    let frameCount = 0;
    commits = 0;
    while (frames.length && frameCount < 100) {
      now += 16;
      frameCount += 1;
      act(() => frames.shift()!(now));
    }
    // One commit per frame for all 20 figures, and the tween ends (450 ms is about 29 frames).
    expect(frameCount).toBeLessThan(40);
    expect(commits).toBeLessThanOrEqual(frameCount);
    expect(container.textContent).toContain('110.00');
    expect(container.textContent).toContain('129.00');
  });
});
