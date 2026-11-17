import * as klinecharts from 'klinecharts';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FALLBACK_CHART_TOKENS } from '../src/chart-adapters/adapterTokens.ts';
import {
  defaultBarTimeLabel,
  KLINECHARTS_NOTICE,
  KLineChart,
  klineStyles,
  mergeTickIntoBar,
  toKLineBars,
  type KLineChartHandle,
  type KLineChartLike,
  type KLineCrosshairLike,
  type KLineDataLoaderLike,
  type KLineLibrary,
  type KLineMoneyBar,
} from '../src/klinecharts/klinecharts.tsx';
import { formatMoney } from '../src/money/money.ts';

// The real library must satisfy the structural types the adapter declares (checked by tsc).
export const realKLine: KLineLibrary = klinecharts;

const NPR = { currency: 'NPR', locale: 'en-IN', display: 'code' } as const;
const BIG = 9007199254740993n; // 2^53 + 1
const DAY = 86_400_000;

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
});

function fakeKLine() {
  let move: ((data?: unknown) => void) | undefined;
  let loader: KLineDataLoaderLike | undefined;
  const loaded: unknown[] = [];
  const chart = {
    setSymbol: vi.fn<KLineChartLike['setSymbol']>(),
    setPeriod: vi.fn<KLineChartLike['setPeriod']>(),
    setDataLoader: vi.fn<KLineChartLike['setDataLoader']>((l) => void (loader = l)),
    setStyles: vi.fn<KLineChartLike['setStyles']>(),
    overrideYAxis: vi.fn<KLineChartLike['overrideYAxis']>(),
    resetData: vi.fn<KLineChartLike['resetData']>(),
    resize: vi.fn<KLineChartLike['resize']>(),
    subscribeAction: vi.fn<KLineChartLike['subscribeAction']>((_, cb) => void (move = cb)),
    unsubscribeAction: vi.fn<KLineChartLike['unsubscribeAction']>(),
  } satisfies KLineChartLike;
  const lib = {
    init: vi.fn<KLineLibrary['init']>(() => chart),
    dispose: vi.fn<KLineLibrary['dispose']>(),
    registerYAxis: vi.fn<KLineLibrary['registerYAxis']>(),
  } satisfies KLineLibrary;
  return {
    lib,
    chart,
    load: () => {
      let got: { data: unknown; more: unknown } | undefined;
      void loader!.getBars({ type: 'init', timestamp: null, callback: (data, more) => void (got = { data, more }) });
      loaded.push(got);
      return got;
    },
    subscribe: (callback: (bar: unknown) => void) => loader!.subscribeBar!({ callback }),
    move: (timestamp: number | undefined) => move?.({ timestamp } satisfies KLineCrosshairLike),
  };
}

const bars: KLineMoneyBar[] = [
  { timestamp: 1 * DAY, open: BIG, high: BIG + 5n, low: BIG - 5n, close: BIG + 1n, volume: 120n },
  { timestamp: 2 * DAY, open: BIG + 1n, high: BIG + 9n, low: BIG, close: BIG - 1n },
  { timestamp: 3 * DAY, open: 100n, high: 130n, low: 90n, close: 120n },
];

describe('theme and money', () => {
  it('builds KLineChart styles from the tokens: gain and loss candles, axes, grid, crosshair, font', () => {
    const tokens = { ...FALLBACK_CHART_TOKENS, gain: '#0a0', loss: '#a00', grid: '#eee', axis: '#999', textMuted: '#555', fontFamily: 'Geist' };
    const s = klineStyles(tokens) as { grid: { horizontal: { color: string } }; candle: { type: string; bar: Record<string, string> }; yAxis: { tickText: { color: string; family: string } }; crosshair: { vertical: { text: { backgroundColor: string } } } };
    expect(s.candle.type).toBe('candle_solid');
    expect(s.candle.bar).toMatchObject({ upColor: '#0a0', downColor: '#a00', upWickColor: '#0a0', downBorderColor: '#a00', noChangeColor: '#555' });
    expect(s.grid.horizontal.color).toBe('#eee');
    expect(s.yAxis.tickText).toMatchObject({ color: '#555', family: 'Geist' });
    expect(s.crosshair.vertical.text.backgroundColor).toBe('#555');
    expect(klineStyles(tokens, { candleType: 'ohlc' })).toMatchObject({ candle: { type: 'ohlc' } });
  });

  it('prints the tooltip rows as exact money', () => {
    const s = klineStyles(FALLBACK_CHART_TOKENS, { formatPrice: (p) => formatMoney(BigInt(p), NPR), tooltip: { open: 'Open', high: 'High', low: 'Low', close: 'Close', volume: 'Volume' } }) as { candle: { tooltip: { legend: { template: (d: { current: object | null }) => Array<{ title: string; value: string }> } } } };
    const rows = s.candle.tooltip.legend.template({ current: { open: 10000, high: 13000, low: 9000, close: 12050, volume: 7 } });
    expect(rows).toEqual([
      { title: 'Open: ', value: formatMoney(10000n, NPR) },
      { title: 'High: ', value: formatMoney(13000n, NPR) },
      { title: 'Low: ', value: formatMoney(9000n, NPR) },
      { title: 'Close: ', value: formatMoney(12050n, NPR) },
      { title: 'Volume: ', value: '7' },
    ]);
    expect(s.candle.tooltip.legend.template({ current: null })).toEqual([]);
  });

  it('plots minor units as numbers, keeping the exact bigint for the table', () => {
    expect(toKLineBars([{ timestamp: DAY, open: 100n, high: 130n, low: 90n, close: 120n, volume: 5n }])).toEqual([{ timestamp: DAY, open: 100, high: 130, low: 90, close: 120, volume: 5 }]);
    expect(defaultBarTimeLabel(DAY)).toBe('1970-01-02 00:00 UTC');
    expect(KLINECHARTS_NOTICE).toContain('lihu');
  });
});

describe('streaming ticks', () => {
  it('opens a bar, extends high, low and close in the same bar, and opens the next', () => {
    const first = mergeTickIntoBar(undefined, { timestamp: 61_000, price: 100n }, 60_000)!;
    expect(first).toEqual({ timestamp: 60_000, open: 100n, high: 100n, low: 100n, close: 100n });
    const up = mergeTickIntoBar(first, { timestamp: 70_000, price: 120n }, 60_000)!;
    const down = mergeTickIntoBar(up, { timestamp: 79_000, price: 80n }, 60_000)!;
    expect(down).toMatchObject({ timestamp: 60_000, open: 100n, high: 120n, low: 80n, close: 80n });
    expect(mergeTickIntoBar(down, { timestamp: 121_000, price: 90n }, 60_000)).toEqual({ timestamp: 120_000, open: 90n, high: 90n, low: 90n, close: 90n });
    expect(mergeTickIntoBar(down, { timestamp: 1_000, price: 1n }, 60_000)).toBeNull();
    expect(() => mergeTickIntoBar(undefined, { timestamp: 1, price: 1n }, 0)).toThrow(RangeError);
  });

  it('keeps ticks exact past 2^53', () => {
    const b = mergeTickIntoBar({ timestamp: 60_000, open: BIG, high: BIG, low: BIG, close: BIG }, { timestamp: 61_000, price: BIG + 1n }, 60_000)!;
    expect(b.high).toBe(BIG + 1n);
    expect(b.low).toBe(BIG);
  });
});

describe('KLineChart in ChartA11yShell', () => {
  it('wraps the canvas in a named figure with one focus stop, a hint, a live region and an exact data table', async () => {
    const f = fakeKLine();
    render(<KLineChart library={f.lib} label="NEPSE index" money={NPR} data={bars} />);
    const plot = screen.getByRole('group', { name: 'NEPSE index' });
    expect(plot.tabIndex).toBe(0);
    expect(plot.getAttribute('aria-roledescription')).toBe('candlestick chart');
    expect(screen.getByRole('figure', { name: 'NEPSE index' }).querySelector('[aria-hidden="true"]')).not.toBeNull();
    const table = screen.getByRole('table', { name: 'NEPSE index' });
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
    // The table prints the original bigint, not the plotted number.
    expect(table.textContent).toContain(formatMoney(BIG + 1n, NPR));
    expect(table.textContent).toContain(formatMoney(BIG - 1n, NPR));
    await waitFor(() => expect(f.lib.init).toHaveBeenCalledTimes(1));
    expect(f.lib.init.mock.calls[0]![1]).toMatchObject({ styles: { candle: { bar: { upColor: FALLBACK_CHART_TOKENS.gain } } } });
    expect(f.chart.setSymbol).toHaveBeenCalledWith({ ticker: 'NEPSE index', pricePrecision: 0, volumePrecision: 0 });
    expect(f.chart.setPeriod).toHaveBeenCalledWith({ type: 'day', span: 1 });
    expect(f.load()).toEqual({ data: toKLineBars(bars), more: false });
  });

  it('prints axis and crosshair prices as exact money through a Y axis registered once per config', async () => {
    const f = fakeKLine();
    render(<KLineChart library={f.lib} label="A" money={NPR} data={bars} />);
    await waitFor(() => expect(f.lib.registerYAxis).toHaveBeenCalled());
    const axis = f.lib.registerYAxis.mock.calls[0]![0];
    expect(axis.displayValueToText!(1234567, 0)).toBe(formatMoney(1234567n, NPR));
    expect(f.chart.overrideYAxis).toHaveBeenCalledWith({ name: axis.name, paneId: 'candle_pane' });
    cleanup();
    // Registered once for this currency and locale on a given library: a second chart does not register it again.
    render(<KLineChart library={f.lib} label="B" money={NPR} data={bars} />);
    await waitFor(() => expect(f.lib.init).toHaveBeenCalledTimes(2));
    expect(f.lib.registerYAxis).toHaveBeenCalledTimes(1);
  });

  it('draws no logo or attribution of its own', async () => {
    const f = fakeKLine();
    const { container } = render(<KLineChart library={f.lib} label="A" money={NPR} data={bars} />);
    await waitFor(() => expect(f.lib.init).toHaveBeenCalled());
    expect(container.textContent).not.toMatch(/tradingview|klinecharts\.com/i);
  });

  it('speaks the keyboard cursor exactly', async () => {
    const f = fakeKLine();
    render(<KLineChart library={f.lib} label="NEPSE index" money={NPR} data={bars} />);
    await waitFor(() => expect(f.lib.init).toHaveBeenCalled());
    const plot = screen.getByRole('group', { name: 'NEPSE index' });
    act(() => plot.focus());
    const live = screen.getByRole('status');
    expect(live.textContent).toContain('1970-01-04 00:00 UTC');
    fireEvent.keyDown(plot, { key: 'Home' });
    expect(live.textContent).toContain('1970-01-02 00:00 UTC: Open');
    expect(live.textContent).toContain('Close');
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(live.textContent).toBe('');
  });

  it('maps the pointer crosshair back to a bar', async () => {
    const f = fakeKLine();
    render(<KLineChart library={f.lib} label="NEPSE index" money={NPR} data={bars} />);
    await waitFor(() => expect(f.chart.subscribeAction).toHaveBeenCalledWith('onCrosshairChange', expect.any(Function)));
    act(() => f.move(2 * DAY));
    expect(screen.getByRole('status').textContent).toContain('1970-01-03');
    act(() => f.move(undefined));
  });

  it('streams ticks through the subscribed callback, refreshes the table later, and ignores a stale tick', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const f = fakeKLine();
      const ref = createRef<KLineChartHandle>();
      const intraday: KLineMoneyBar[] = [{ timestamp: 60_000, open: 100n, high: 100n, low: 100n, close: 100n }];
      render(<KLineChart ref={ref} library={f.lib} label="Live" money={NPR} data={intraday} a11yRefreshMs={50} period={{ type: 'minute', span: 1 }} />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(f.lib.init).toHaveBeenCalled();
      expect(f.chart.setPeriod).toHaveBeenCalledWith({ type: 'minute', span: 1 });
      const received: unknown[] = [];
      f.subscribe((bar) => received.push(bar));
      act(() => void ref.current!.tick({ timestamp: 70_000, price: 150n }, 60_000));
      act(() => void ref.current!.tick({ timestamp: 75_000, price: 70n }, 60_000));
      act(() => void ref.current!.tick({ timestamp: 121_000, price: 90n }, 60_000));
      expect(received).toEqual([
        { timestamp: 60_000, open: 100, high: 150, low: 100, close: 150 },
        { timestamp: 60_000, open: 100, high: 150, low: 70, close: 70 },
        { timestamp: 120_000, open: 90, high: 90, low: 90, close: 90 },
      ]);
      expect(ref.current!.tick({ timestamp: 1_000, price: 1n }, 60_000)).toBe(false);
      expect(received).toHaveLength(3);
      expect(ref.current!.chart()).toBe(f.chart);
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(1);
      act(() => {
        vi.advanceTimersByTime(60);
      });
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-applies the theme when data-theme changes, reloads on new data, and disposes on unmount', async () => {
    const f = fakeKLine();
    const { rerender, unmount } = render(<KLineChart library={() => Promise.resolve(f.lib)} label="K" money={NPR} data={bars.slice(0, 1)} />);
    await waitFor(() => expect(f.lib.init).toHaveBeenCalled());
    f.chart.setStyles.mockClear();
    document.documentElement.style.setProperty('--pu-color-gain', '#c8f23d');
    document.documentElement.setAttribute('data-theme', 'dark');
    await waitFor(() => expect(f.chart.setStyles).toHaveBeenCalledWith(expect.objectContaining({ candle: expect.objectContaining({ bar: expect.objectContaining({ upColor: '#c8f23d' }) }) })));
    rerender(<KLineChart library={() => Promise.resolve(f.lib)} label="K" money={NPR} data={bars} />);
    await waitFor(() => expect(f.chart.resetData).toHaveBeenCalled());
    expect(f.load()!.data).toEqual(toKLineBars(bars));
    unmount();
    expect(f.lib.dispose).toHaveBeenCalled();
    expect(f.chart.unsubscribeAction).toHaveBeenCalled();
  });

  it('reports a library that fails to load, and a chart that cannot be created, and still renders the table', async () => {
    const onError = vi.fn<(error: unknown) => void>();
    render(<KLineChart library={() => Promise.reject(new Error('offline'))} onError={onError} label="X" money={NPR} data={bars} />);
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByRole('table', { name: 'X' })).toBeTruthy();
    cleanup();
    const failing = fakeKLine();
    failing.lib.init.mockReturnValueOnce(null);
    const second = vi.fn<(error: unknown) => void>();
    render(<KLineChart library={failing.lib} onError={second} label="Y" money={NPR} data={bars} />);
    await waitFor(() => expect(second).toHaveBeenCalled());
  });

  it('calls onReady with the chart, and cuts a long table to the latest rows', async () => {
    const f = fakeKLine();
    const onReady = vi.fn<(chart: KLineChartLike) => void>();
    const many: KLineMoneyBar[] = Array.from({ length: 30 }, (_, i) => ({ timestamp: DAY * (i + 1), open: 1n, high: 2n, low: 1n, close: 2n }));
    render(<KLineChart library={f.lib} label="Many" money={NPR} data={many} maxTableRows={10} onReady={onReady} />);
    await waitFor(() => expect(onReady).toHaveBeenCalledWith(f.chart));
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(10);
    expect(screen.getByText('Showing the latest 10 of 30 rows')).toBeTruthy();
  });

  it('removes the tab stop and live region when not interactive', () => {
    render(<KLineChart library={fakeKLine().lib} label="Quiet" money={NPR} data={bars} interactive={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('[tabindex="0"]')).toBeNull();
  });
});
