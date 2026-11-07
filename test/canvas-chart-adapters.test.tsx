import * as echartsLib from 'echarts';
import * as lc from 'lightweight-charts';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { chartTokensFrom, FALLBACK_CHART_TOKENS, mergeOptions } from '../src/chart-adapters/adapterTokens.ts';
import { chartNumberToMinor, createMoneyChartFormatter, isPlottableExactly, minorToChartNumber } from '../src/chart-adapters/adapterMoney.ts';
import { EChart, moneyAxisFormatter, moneyTooltipFormatter, punjiEChartsTheme, type EChartHandle, type EChartsInstanceLike, type EChartsLibrary } from '../src/echarts/echarts.tsx';
import {
  LIGHTWEIGHT_CHARTS_NOTICE,
  LightweightChart,
  lightweightChartOptions,
  lightweightSeriesOptions,
  mergeTickIntoCandle,
  moneyPriceFormat,
  readChartTokens,
  toLightweightCandles,
  toLightweightLine,
  type LightweightChartHandle,
  type LightweightChartLike,
  type LightweightLibrary,
  type LightweightSeriesLike,
  type MoneyCandle,
} from '../src/lightweight-charts/lightweightCharts.tsx';
import { formatMoney } from '../src/money/money.ts';

// The real libraries must satisfy the structural types the adapters declare (checked by tsc).
export const realLightweight: LightweightLibrary = lc;
export const realEcharts: EChartsLibrary = echartsLib;

const NPR = { currency: 'NPR', locale: 'en-IN', display: 'code' } as const;
const BIG = 9007199254740993n; // 2^53 + 1: Number() cannot tell it from 2^53.

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
});

describe('token mapping', () => {
  it('reads each Punji variable, trims it, and falls back for a missing one', () => {
    const vars: Record<string, string> = { '--pu-color-gain': ' #c8f23d ', '--pu-color-loss': '#ff8a78', '--pu-color-series-3': '#123456' };
    const tokens = chartTokensFrom((name) => vars[name]);
    expect(tokens.gain).toBe('#c8f23d');
    expect(tokens.loss).toBe('#ff8a78');
    expect(tokens.series[2]).toBe('#123456');
    expect(tokens.text).toBe(FALLBACK_CHART_TOKENS.text);
    expect(tokens.series).toHaveLength(12);
  });

  it('resolves variables as the browser sees them at an element, and follows a scope', () => {
    document.documentElement.style.setProperty('--pu-color-gain', '#111111');
    const scope = document.createElement('div');
    scope.style.setProperty('--pu-color-gain', '#222222');
    document.body.append(scope);
    expect(readChartTokens(document.documentElement).gain).toBe('#111111');
    expect(readChartTokens(scope).gain).toBe('#222222');
    expect(readChartTokens(null)).toBe(FALLBACK_CHART_TOKENS);
    scope.remove();
  });

  it('builds Lightweight Charts options and series options from the tokens', () => {
    const tokens = { ...FALLBACK_CHART_TOKENS, gain: '#0a0', loss: '#a00', surface: '#fff', grid: '#eee' };
    const options = lightweightChartOptions(tokens, { money: NPR }) as { layout: Record<string, unknown>; grid: { horzLines: { color: string } } };
    expect(options.layout).toMatchObject({ textColor: tokens.text, attributionLogo: true, background: { type: 'solid', color: '#fff' } });
    expect(options.grid.horzLines.color).toBe('#eee');
    expect(lightweightSeriesOptions('candlestick', tokens)).toMatchObject({ upColor: '#0a0', downColor: '#a00', wickUpColor: '#0a0', wickDownColor: '#a00' });
    expect(lightweightSeriesOptions('line', tokens)).toMatchObject({ color: tokens.accent });
    expect(lightweightSeriesOptions('area', tokens)).toMatchObject({ lineColor: tokens.accent, topColor: tokens.accentFill });
    expect(lightweightChartOptions(tokens, { attribution: false }).layout).toMatchObject({ attributionLogo: false });
  });

  it('builds an ECharts theme from the tokens, with its own aria off', () => {
    const tokens = { ...FALLBACK_CHART_TOKENS, gain: '#0a0', loss: '#a00', text: '#010101', grid: '#ddd' };
    const theme = punjiEChartsTheme(tokens) as { color: string[]; textStyle: { color: string }; valueAxis: { splitLine: { lineStyle: { color: string } } }; candlestick: { itemStyle: object }; aria: object };
    expect(theme.color).toEqual([...tokens.series]);
    expect(theme.textStyle.color).toBe('#010101');
    expect(theme.valueAxis.splitLine.lineStyle.color).toBe('#ddd');
    expect(theme.candlestick.itemStyle).toMatchObject({ color: '#0a0', color0: '#a00' });
    expect(theme.aria).toEqual({ enabled: false });
  });

  it('merges plain objects deeply without changing the inputs', () => {
    const base = { layout: { a: 1, b: 2 }, list: [1] };
    const merged = mergeOptions(base, { layout: { b: 3 }, list: [2] });
    expect(merged).toEqual({ layout: { a: 1, b: 3 }, list: [2] });
    expect(base.layout.b).toBe(2);
  });
});

describe('exact money', () => {
  it('prints bigint minor units past 2^53 exactly, as formatMoney does', () => {
    const format = createMoneyChartFormatter(NPR);
    expect(format(BIG)).toBe(formatMoney(BIG, NPR));
    expect(format(BIG)).toContain('9,00,71,99,25,47,409.93');
    expect(format(BIG)).not.toBe(format(BIG - 1n));
    expect(format(-BIG)).toBe(formatMoney(-BIG, NPR));
  });

  it('prints a plotted number as the same text as its bigint, up to 2^53', () => {
    const format = createMoneyChartFormatter({ currency: 'USD' });
    for (const minor of [0n, 1n, 99n, 123456n, -4550n, BigInt(Number.MAX_SAFE_INTEGER)]) {
      expect(format(minorToChartNumber(minor))).toBe(format(minor));
    }
    expect(format(1234.4)).toBe(format(1234n));
    expect(format(Number.NaN)).toBe('');
    expect(isPlottableExactly(BigInt(Number.MAX_SAFE_INTEGER))).toBe(true);
    expect(isPlottableExactly(BIG)).toBe(false);
    expect(() => chartNumberToMinor(Infinity)).toThrow(RangeError);
  });

  it('compacts for an axis in lakh and crore, and the price format is a custom whole-minor-unit format', () => {
    const axis = moneyAxisFormatter(NPR);
    expect(axis(25000000)).toMatch(/2\.5\s?(lakh|L)/i);
    expect(moneyAxisFormatter(NPR, { compact: false })(25000000)).toBe(formatMoney(25000000n, NPR));
    const format = moneyPriceFormat(NPR);
    expect(format).toMatchObject({ type: 'custom', minMove: 1 });
    expect(format.formatter(123456)).toBe(formatMoney(123456n, NPR));
  });

  it('plots minor units as numbers and keeps the candle prices apart in the table data', () => {
    const candle: MoneyCandle = { time: '2026-01-02', open: 100n, high: 130n, low: 90n, close: 120n };
    expect(toLightweightCandles([candle])).toEqual([{ time: '2026-01-02', open: 100, high: 130, low: 90, close: 120 }]);
    expect(toLightweightLine([{ time: 5, value: 250n }])).toEqual([{ time: 5, value: 250 }]);
  });

  it('formats the ECharts tooltip from exact money and escapes names', () => {
    const tip = moneyTooltipFormatter(NPR);
    const html = tip([{ axisValueLabel: '<b>Q1</b>', seriesName: 'A & B', marker: '<i></i>', value: ['Q1', 12345] }]);
    expect(html).toContain(formatMoney(12345n, NPR));
    expect(html).toContain('&lt;b&gt;Q1&lt;/b&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).not.toContain('<b>Q1');
    expect(moneyTooltipFormatter(NPR, { valueIndex: 0 })({ value: [500, 1] })).toContain(formatMoney(500n, NPR));
    expect(tip({ value: BIG })).toContain(formatMoney(BIG, NPR));
  });
});

describe('streaming ticks', () => {
  it('opens a candle, extends high, low and close in the same bar, and opens the next bar', () => {
    const first = mergeTickIntoCandle(undefined, { time: 1000, price: 100n }, 60)!;
    expect(first).toEqual({ time: 960, open: 100n, high: 100n, low: 100n, close: 100n });
    const up = mergeTickIntoCandle(first, { time: 1010, price: 120n }, 60)!;
    const down = mergeTickIntoCandle(up, { time: 1019, price: 80n }, 60)!;
    expect(down).toEqual({ time: 960, open: 100n, high: 120n, low: 80n, close: 80n });
    expect(mergeTickIntoCandle(down, { time: 1021, price: 90n }, 60)).toEqual({ time: 1020, open: 90n, high: 90n, low: 90n, close: 90n });
    expect(mergeTickIntoCandle(down, { time: 100, price: 1n }, 60)).toBeNull();
    expect(() => mergeTickIntoCandle(undefined, { time: 1, price: 1n }, 0)).toThrow(RangeError);
  });

  it('keeps ticks exact past 2^53', () => {
    const c = mergeTickIntoCandle({ time: 60, open: BIG, high: BIG, low: BIG, close: BIG }, { time: 61, price: BIG + 1n }, 60)!;
    expect(c.high).toBe(BIG + 1n);
    expect(c.low).toBe(BIG);
  });
});

function fakeLightweight() {
  const series = { setData: vi.fn<(data: readonly object[]) => void>(), update: vi.fn<(point: object) => void>(), applyOptions: vi.fn<(options: object) => void>() } satisfies LightweightSeriesLike;
  let move: ((param: { time?: unknown }) => void) | undefined;
  const chart = {
    addSeries: vi.fn<(definition: unknown, options?: object) => LightweightSeriesLike>(() => series),
    applyOptions: vi.fn<(options: object) => void>(),
    remove: vi.fn<() => void>(),
    timeScale: () => ({ fitContent: vi.fn<() => void>() }),
    subscribeCrosshairMove: vi.fn<(h: (param: { time?: unknown }) => void) => void>((h) => void (move = h)),
    unsubscribeCrosshairMove: vi.fn<(h: (param: { time?: unknown }) => void) => void>(),
    setCrosshairPosition: vi.fn<(price: number, time: unknown, series: LightweightSeriesLike) => void>(),
    clearCrosshairPosition: vi.fn<() => void>(),
  } satisfies LightweightChartLike;
  const lib: LightweightLibrary = { createChart: vi.fn<(host: HTMLElement, options?: object) => LightweightChartLike>(() => chart), CandlestickSeries: 'CS', LineSeries: 'LS', AreaSeries: 'AS' };
  return { lib, chart, series, move: (t: unknown) => move?.({ time: t }) };
}

const candles: MoneyCandle[] = [
  { time: '2026-01-01', open: BIG, high: BIG + 5n, low: BIG - 5n, close: BIG + 1n },
  { time: '2026-01-02', open: BIG + 1n, high: BIG + 9n, low: BIG, close: BIG - 1n },
  { time: '2026-01-03', open: 100n, high: 130n, low: 90n, close: 120n },
];

describe('LightweightChart in ChartA11yShell', () => {
  it('wraps the canvas in a named figure with one focus stop, a hint, a live region and an exact data table', async () => {
    const f = fakeLightweight();
    render(<LightweightChart library={f.lib} label="NEPSE index" money={NPR} data={candles} />);
    const figure = screen.getByRole('figure', { name: 'NEPSE index' });
    const plot = screen.getByRole('group', { name: 'NEPSE index' });
    expect(plot.tabIndex).toBe(0);
    expect(plot.getAttribute('aria-roledescription')).toBe('candlestick chart');
    expect(plot.getAttribute('aria-describedby')).toBeTruthy();
    expect(figure.querySelector('[aria-hidden="true"]')).not.toBeNull();
    const table = screen.getByRole('table', { name: 'NEPSE index' });
    expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
    // The table prints the original bigint, not the plotted number.
    expect(table.textContent).toContain(formatMoney(BIG + 1n, NPR));
    expect(table.textContent).toContain(formatMoney(BIG - 1n, NPR));
    await waitFor(() => expect(f.lib.createChart).toHaveBeenCalledTimes(1));
    expect(f.chart.addSeries).toHaveBeenCalledWith('CS', expect.objectContaining({ upColor: FALLBACK_CHART_TOKENS.gain }));
    expect(f.series.setData).toHaveBeenCalledWith(toLightweightCandles(candles));
  });

  it('turns the attribution logo on by default and lets the app turn it off', async () => {
    const on = fakeLightweight();
    render(<LightweightChart library={on.lib} label="A" money={NPR} data={candles} />);
    await waitFor(() => expect(on.lib.createChart).toHaveBeenCalled());
    expect(vi.mocked(on.lib.createChart).mock.calls[0]![1]).toMatchObject({ layout: { attributionLogo: true } });
    expect(LIGHTWEIGHT_CHARTS_NOTICE).toContain('https://www.tradingview.com/');
    cleanup();
    const off = fakeLightweight();
    render(<LightweightChart library={off.lib} label="B" money={NPR} data={candles} attribution={false} chartOptions={{ layout: { attributionLogo: true, textColor: '#abc' } }} />);
    await waitFor(() => expect(off.lib.createChart).toHaveBeenCalled());
    // `attribution` is the one control; other layout options still merge over the theme.
    expect(vi.mocked(off.lib.createChart).mock.calls[0]![1]).toMatchObject({ layout: { attributionLogo: false, textColor: '#abc' } });
  });

  it('speaks the keyboard cursor exactly and drives the chart crosshair', async () => {
    const f = fakeLightweight();
    render(<LightweightChart library={f.lib} label="NEPSE index" money={NPR} data={candles} />);
    await waitFor(() => expect(f.lib.createChart).toHaveBeenCalled());
    const plot = screen.getByRole('group', { name: 'NEPSE index' });
    act(() => plot.focus());
    const live = screen.getByRole('status');
    expect(live.textContent).toContain('2026-01-03');
    fireEvent.keyDown(plot, { key: 'Home' });
    expect(live.textContent).toContain('2026-01-01: Open');
    expect(live.textContent).toContain('Close');
    await waitFor(() => expect(f.chart.setCrosshairPosition).toHaveBeenCalledWith(Number(BIG + 1n), '2026-01-01', f.series));
    fireEvent.keyDown(plot, { key: 'Escape' });
    expect(live.textContent).toBe('');
    await waitFor(() => expect(f.chart.clearCrosshairPosition).toHaveBeenCalled());
  });

  it('maps the pointer crosshair back to a position', async () => {
    const f = fakeLightweight();
    render(<LightweightChart library={f.lib} label="NEPSE index" money={NPR} data={candles} />);
    await waitFor(() => expect(f.chart.subscribeCrosshairMove).toHaveBeenCalled());
    act(() => f.move('2026-01-02'));
    expect(screen.getByRole('status').textContent).toContain('2026-01-02');
    act(() => f.move({ year: 2026, month: 1, day: 1 }));
    expect(screen.getByRole('status').textContent).toContain('2026-01-01');
  });

  it('streams ticks through update(), refreshes the table later, and ignores a stale tick', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const f = fakeLightweight();
      const ref = createRef<LightweightChartHandle>();
      const intraday: MoneyCandle[] = [{ time: 960, open: 100n, high: 100n, low: 100n, close: 100n }];
      render(<LightweightChart ref={ref} library={f.lib} label="Live" money={NPR} data={intraday} a11yRefreshMs={50} />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(f.lib.createChart).toHaveBeenCalled();
      act(() => void ref.current!.tick({ time: 1000, price: 150n }, 60));
      expect(f.series.update).toHaveBeenLastCalledWith({ time: 960, open: 100, high: 150, low: 100, close: 150 });
      act(() => void ref.current!.tick({ time: 1015, price: 70n }, 60));
      expect(f.series.update).toHaveBeenLastCalledWith({ time: 960, open: 100, high: 150, low: 70, close: 70 });
      act(() => void ref.current!.tick({ time: 1021, price: 90n }, 60));
      expect(f.series.update).toHaveBeenLastCalledWith({ time: 1020, open: 90, high: 90, low: 90, close: 90 });
      expect(ref.current!.tick({ time: 100, price: 1n }, 60)).toBe(false);
      expect(f.series.update).toHaveBeenCalledTimes(3);
      expect(ref.current!.chart()).toBe(f.chart);
      // The hidden table lags the stream by a11yRefreshMs.
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(1);
      act(() => {
        vi.advanceTimersByTime(60);
      });
      expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-applies the theme when data-theme changes, replaces data, and removes the chart on unmount', async () => {
    const f = fakeLightweight();
    const { rerender, unmount } = render(<LightweightChart library={() => Promise.resolve(f.lib)} kind="line" label="Line" money={NPR} data={[{ time: 1, value: 5n }]} />);
    await waitFor(() => expect(f.lib.createChart).toHaveBeenCalled());
    expect(f.chart.addSeries).toHaveBeenCalledWith('LS', expect.anything());
    f.series.applyOptions.mockClear();
    document.documentElement.style.setProperty('--pu-color-chart', '#c8f23d');
    document.documentElement.setAttribute('data-theme', 'dark');
    await waitFor(() => expect(f.series.applyOptions).toHaveBeenCalledWith(expect.objectContaining({ color: '#c8f23d' })));
    expect(f.chart.applyOptions).toHaveBeenLastCalledWith(expect.objectContaining({ layout: expect.objectContaining({ attributionLogo: true }) }));
    rerender(<LightweightChart library={() => Promise.resolve(f.lib)} kind="line" label="Line" money={NPR} data={[{ time: 1, value: 5n }, { time: 2, value: 6n }]} />);
    await waitFor(() => expect(f.series.setData).toHaveBeenLastCalledWith([{ time: 1, value: 5 }, { time: 2, value: 6 }]));
    unmount();
    expect(f.chart.remove).toHaveBeenCalled();
    expect(f.chart.unsubscribeCrosshairMove).toHaveBeenCalled();
  });

  it('reports a library that fails to load and still renders the table', async () => {
    const onError = vi.fn<(error: unknown) => void>();
    render(<LightweightChart library={() => Promise.reject(new Error('offline'))} onError={onError} label="X" money={NPR} data={candles} />);
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByRole('table', { name: 'X' })).toBeTruthy();
  });

  it('cuts a long table to the latest rows and says so', () => {
    const many: MoneyCandle[] = Array.from({ length: 30 }, (_, i) => ({ time: 86400 * (i + 1), open: 1n, high: 2n, low: 1n, close: 2n }));
    render(<LightweightChart library={fakeLightweight().lib} label="Many" money={NPR} data={many} maxTableRows={10} />);
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(10);
    expect(screen.getByText('Showing the latest 10 of 30 rows')).toBeTruthy();
  });
});

function fakeEcharts() {
  const handlers: Record<string, (p: unknown) => void> = {};
  const instance = {
    setOption: vi.fn<(option: object) => void>(),
    resize: vi.fn<() => void>(),
    dispose: vi.fn<() => void>(),
    on: vi.fn<(event: string, h: (p: unknown) => void) => void>((event, h) => void (handlers[event] = h)),
    dispatchAction: vi.fn<(payload: object) => void>(),
  } satisfies EChartsInstanceLike;
  const lib: EChartsLibrary = { init: vi.fn<(host: HTMLElement, theme?: object | string | null, opts?: object) => EChartsInstanceLike>(() => instance) };
  return { lib, instance, handlers };
}

const points = [
  { label: 'Q1', values: [BIG, 5n] },
  { label: 'Q2', values: [BIG + 1n, null] },
];

describe('EChart in ChartA11yShell', () => {
  it('inits with the Punji theme, forces ECharts aria off, and builds the exact table', async () => {
    const f = fakeEcharts();
    const option = { aria: { enabled: true }, series: [{ type: 'line', data: [1, 2] }] };
    render(<EChart library={f.lib} option={option} label="Revenue" money={NPR} points={points} seriesNames={['Gross', 'Net']} />);
    expect(screen.getByRole('figure', { name: 'Revenue' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Revenue' }).tabIndex).toBe(0);
    const table = screen.getByRole('table', { name: 'Revenue' });
    expect(table.textContent).toContain(formatMoney(BIG + 1n, NPR));
    expect(table.textContent).toContain('none');
    await waitFor(() => expect(f.lib.init).toHaveBeenCalled());
    const [, theme, opts] = vi.mocked(f.lib.init).mock.calls.at(-1)!;
    expect(theme).toMatchObject({ aria: { enabled: false }, color: expect.any(Array) });
    expect(opts).toMatchObject({ renderer: 'canvas' });
    expect(f.instance.setOption).toHaveBeenLastCalledWith(expect.objectContaining({ aria: { enabled: false }, series: option.series }));
  });

  it('shows the tooltip for the keyboard cursor, speaks the position, and maps a hover back', async () => {
    const f = fakeEcharts();
    render(<EChart library={f.lib} option={{}} label="Revenue" money={NPR} points={points} seriesNames={['Gross', 'Net']} />);
    await waitFor(() => expect(f.instance.on).toHaveBeenCalled());
    const plot = screen.getByRole('group', { name: 'Revenue' });
    fireEvent.keyDown(plot, { key: 'Home' });
    expect(screen.getByRole('status').textContent).toContain('Q1: Gross');
    await waitFor(() => expect(f.instance.dispatchAction).toHaveBeenCalledWith({ type: 'showTip', seriesIndex: 0, dataIndex: 0 }));
    fireEvent.keyDown(plot, { key: 'Escape' });
    await waitFor(() => expect(f.instance.dispatchAction).toHaveBeenLastCalledWith({ type: 'hideTip' }));
    act(() => f.handlers.mouseover!({ dataIndex: 1 }));
    expect(screen.getByRole('status').textContent).toContain('Q2');
  });

  it('re-creates the chart with the new theme when the Punji theme changes, and disposes on unmount', async () => {
    const f = fakeEcharts();
    const ref = createRef<EChartHandle>();
    const { unmount } = render(<EChart ref={ref} library={() => Promise.resolve(f.lib)} option={{}} label="Revenue" money={NPR} points={points} seriesNames={['Gross', 'Net']} />);
    await waitFor(() => expect(f.lib.init).toHaveBeenCalled());
    const before = vi.mocked(f.lib.init).mock.calls.length;
    document.documentElement.style.setProperty('--pu-color-text', '#fefefe');
    document.documentElement.setAttribute('data-theme', 'dark');
    await waitFor(() => expect(vi.mocked(f.lib.init).mock.calls.length).toBeGreaterThan(before));
    const theme = vi.mocked(f.lib.init).mock.calls.at(-1)![1] as { textStyle: { color: string } };
    expect(theme.textStyle.color).toBe('#fefefe');
    expect(f.instance.dispose).toHaveBeenCalled();
    expect(ref.current!.instance()).toBe(f.instance);
    unmount();
    expect(f.instance.dispose.mock.calls.length).toBeGreaterThan(1);
  });
});
