'use client';

/**
 * KLineChart adapter (optional, experimental): helpers and a thin React wrapper that mounts a KLineChart v10 chart
 * inside `ChartA11yShell`, so the canvas gets a named figure, a keyboard cursor, a live region and a hidden data table.
 * Punji tokens are read from CSS variables and re-applied when the theme changes; prices print from exact bigint minor
 * units on the axis, the crosshair and the tooltip; ticks stream through `update()`.
 *
 * It imports nothing from `klinecharts`: you pass the library in (`library={klinecharts}`, or a function that loads it
 * lazily, such as a dynamic import), and the types here are structural. `klinecharts` is an optional peer dependency;
 * nothing in the root export or the core bundle loads it.
 *
 * LICENCE: KLineChart is Apache-2.0 (Copyright lihu). The licence asks that a redistributed copy keep its LICENSE and
 * NOTICE files, which npm installs with the package; it has no on-screen attribution or link requirement. Its NOTICE
 * also credits TradingView, Inc. for the Lightweight Charts code it builds on. Nothing is drawn on the chart by
 * default. `KLINECHARTS_NOTICE` carries the NOTICE text if you list third-party notices in your app.
 *
 * @stability experimental
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type HTMLAttributes, type PointerEvent, type Ref } from 'react';

import { ChartA11yShell } from '../chart-a11y/ChartA11yShell.tsx';
import { createMoneyChartFormatter, minorToChartNumber, type ChartMoneyConfig } from '../chart-adapters/adapterMoney.ts';
import { mergeOptions, type PunjiChartTokens } from '../chart-adapters/adapterTokens.ts';
import { buildAdapterA11y, useChartTokens, type AdapterA11yLabels, type AdapterA11yPoint } from '../internal/chartAdapterRuntime.tsx';

export { readChartTokens, watchChartTheme } from '../internal/chartAdapterRuntime.tsx';
export { FALLBACK_CHART_TOKENS } from '../chart-adapters/adapterTokens.ts';
export type { PunjiChartTokens } from '../chart-adapters/adapterTokens.ts';
export { createMoneyChartFormatter } from '../chart-adapters/adapterMoney.ts';
export type { ChartMoneyConfig, ChartMoneyFormatter } from '../chart-adapters/adapterMoney.ts';

/** KLineChart's NOTICE file, for an app that lists third-party notices. Showing it on screen is not required. */
export const KLINECHARTS_NOTICE = 'KLineChart Copyright (c) 2019 lihu. TradingView Lightweight Charts Copyright (с) 2019 TradingView, Inc. https://www.tradingview.com';

/** A bar in exact minor units. `timestamp` is milliseconds since the epoch (UTC), as KLineChart wants it. */
export interface KLineMoneyBar {
  timestamp: number;
  open: bigint;
  high: bigint;
  low: bigint;
  close: bigint;
  /** Traded quantity, as a whole number. */
  volume?: bigint | number;
}

/** A trade or quote: epoch milliseconds and a price in minor units. */
export interface KLinePriceTick {
  timestamp: number;
  price: bigint;
}

/** What KLineChart plots: plain numbers (minor units). */
export type KLinePlotBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type KLinePeriodType = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export interface KLinePeriod {
  type: KLinePeriodType;
  span: number;
}

/** The candle drawing KLineChart offers. Default 'candle_solid'. */
export type KLineCandleType = 'candle_solid' | 'candle_stroke' | 'candle_up_stroke' | 'candle_down_stroke' | 'ohlc' | 'area';

export type KLineSymbolLike = {
  ticker: string;
  pricePrecision: number;
  volumePrecision: number;
};

export interface KLineGetBarsParams {
  type: 'init' | 'forward' | 'backward' | 'update';
  timestamp: number | null;
  callback: (data: KLinePlotBar[], more?: boolean | { backward?: boolean; forward?: boolean }) => void;
}

export interface KLineDataLoaderLike {
  getBars: (params: KLineGetBarsParams) => void | Promise<void>;
  subscribeBar?: (params: { callback: (bar: KLinePlotBar) => void }) => void;
  unsubscribeBar?: (params: object) => void;
}

/** What a crosshair action carries. */
export interface KLineCrosshairLike {
  timestamp?: number;
}

/** The slice of a KLineChart chart the adapter calls. Structural: the real `Chart` fits. */
export interface KLineChartLike {
  setSymbol(symbol: KLineSymbolLike): void;
  setPeriod(period: KLinePeriod): void;
  setDataLoader(loader: KLineDataLoaderLike): void;
  setStyles(styles: object): void;
  overrideYAxis(axis: { name?: string; paneId?: string }): void;
  resetData(): void;
  resize(): void;
  subscribeAction(type: 'onCrosshairChange', callback: (data?: unknown) => void): void;
  unsubscribeAction(type: 'onCrosshairChange', callback?: (data?: unknown) => void): void;
}

/** The part of the `klinecharts` module the adapter needs: the module namespace fits. */
export interface KLineLibrary {
  init(container: HTMLElement, options?: object): KLineChartLike | null;
  dispose(target: HTMLElement): void;
  registerYAxis(axis: { name: string; displayValueToText?: (value: number, precision: number) => string }): void;
}

/** The text of the time axis row in the hidden table and the spoken text. Default `YYYY-MM-DD HH:MM UTC`. */
export function defaultBarTimeLabel(timestamp: number): string {
  return `${new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** Bars as the plain numbers KLineChart plots (minor units). Lossy past 2^53; the table twin stays exact. */
export function toKLineBars(bars: readonly KLineMoneyBar[]): KLinePlotBar[] {
  return bars.map(plotBar);
}

const plotBar = (b: KLineMoneyBar): KLinePlotBar => ({
  timestamp: b.timestamp,
  open: minorToChartNumber(b.open),
  high: minorToChartNumber(b.high),
  low: minorToChartNumber(b.low),
  close: minorToChartNumber(b.close),
  ...(b.volume === undefined ? {} : { volume: Number(b.volume) }),
});

/**
 * Folds a tick into the newest bar of an `intervalMs` bar: the same bar extends its high, low and close; a later bar opens a
 * new one at the tick price. Returns null for a tick older than the newest bar, so a late tick is dropped, never reordered.
 */
export function mergeTickIntoBar(last: KLineMoneyBar | undefined, tick: KLinePriceTick, intervalMs: number): KLineMoneyBar | null {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new RangeError('intervalMs must be a positive number');
  const bucket = Math.floor(tick.timestamp / intervalMs) * intervalMs;
  if (last) {
    if (bucket < last.timestamp) return null;
    if (bucket === last.timestamp) {
      return { timestamp: last.timestamp, open: last.open, high: tick.price > last.high ? tick.price : last.high, low: tick.price < last.low ? tick.price : last.low, close: tick.price, volume: last.volume };
    }
  }
  return { timestamp: bucket, open: tick.price, high: tick.price, low: tick.price, close: tick.price };
}

export interface KLineStyleOptions {
  /** Candle drawing. Default 'candle_solid'. */
  candleType?: KLineCandleType;
  /** Words for the tooltip rows. Default Open, High, Low, Close. */
  tooltip?: { open: string; high: string; low: string; close: string; volume?: string };
  /** Prints a price for the tooltip. Pass `createMoneyChartFormatter(money)`. */
  formatPrice?: (price: number) => string;
}

/**
 * The KLineChart `styles` for a Punji theme: gain and loss candles, grid, axes, separators and crosshair from the tokens,
 * the Punji font, and (with `formatPrice`) a tooltip that prints exact money. Nothing here draws a logo.
 */
export function klineStyles(tokens: PunjiChartTokens, options: KLineStyleOptions = {}): Record<string, unknown> {
  const { candleType = 'candle_solid', tooltip, formatPrice } = options;
  const line = { color: tokens.grid };
  const axis = {
    axisLine: { color: tokens.axis },
    tickLine: { color: tokens.axis },
    tickText: { color: tokens.textMuted, family: tokens.fontFamily },
  };
  const label = { color: tokens.surface, backgroundColor: tokens.textMuted, borderColor: tokens.textMuted, family: tokens.fontFamily };
  const rows = tooltip && formatPrice
    ? (data: { current: { open: number; high: number; low: number; close: number; volume?: number } | null }) => {
        const c = data.current;
        if (!c) return [];
        const out = [
          { title: `${tooltip.open}: `, value: formatPrice(c.open) },
          { title: `${tooltip.high}: `, value: formatPrice(c.high) },
          { title: `${tooltip.low}: `, value: formatPrice(c.low) },
          { title: `${tooltip.close}: `, value: formatPrice(c.close) },
        ];
        if (tooltip.volume !== undefined && c.volume !== undefined) out.push({ title: `${tooltip.volume}: `, value: String(c.volume) });
        return out;
      }
    : undefined;
  return {
    grid: { horizontal: line, vertical: line },
    candle: {
      type: candleType,
      bar: {
        upColor: tokens.gain,
        downColor: tokens.loss,
        noChangeColor: tokens.textMuted,
        upBorderColor: tokens.gain,
        downBorderColor: tokens.loss,
        noChangeBorderColor: tokens.textMuted,
        upWickColor: tokens.gain,
        downWickColor: tokens.loss,
        noChangeWickColor: tokens.textMuted,
      },
      area: { lineColor: tokens.accent, backgroundColor: [{ offset: 0, color: tokens.accentFill }, { offset: 1, color: 'rgba(0, 0, 0, 0)' }] },
      priceMark: {
        high: { color: tokens.textMuted, textFamily: tokens.fontFamily },
        low: { color: tokens.textMuted, textFamily: tokens.fontFamily },
        last: { upColor: tokens.gain, downColor: tokens.loss, noChangeColor: tokens.textMuted, text: { family: tokens.fontFamily, color: tokens.surface } },
      },
      tooltip: {
        title: { color: tokens.text, family: tokens.fontFamily },
        legend: { color: tokens.text, family: tokens.fontFamily, ...(rows ? { template: rows } : {}) },
      },
    },
    indicator: { tooltip: { title: { color: tokens.text, family: tokens.fontFamily }, legend: { color: tokens.text, family: tokens.fontFamily } } },
    xAxis: axis,
    yAxis: axis,
    separator: { color: tokens.axis },
    crosshair: { horizontal: { line: { color: tokens.textMuted }, text: label }, vertical: { line: { color: tokens.textMuted }, text: label } },
  };
}

// Y axes are registered with the library itself, once per money config for each library object.
const registered = new WeakMap<object, Set<string>>();
const axisNameOf = (money: ChartMoneyConfig): string => `punji-money-${JSON.stringify([money.currency, money.locale, money.display, money.grouping])}`;

/** What the `ref` of `KLineChart` exposes. */
export interface KLineChartHandle {
  /** Updates the newest bar or appends a newer one (the streaming path). A bar older than the newest is ignored. */
  update: (bar: KLineMoneyBar) => void;
  /** Folds a tick into the newest bar. Returns false for a stale tick. */
  tick: (tick: KLinePriceTick, intervalMs: number) => boolean;
  /** The KLineChart chart, once the library has loaded; null before. */
  chart: () => KLineChartLike | null;
}

export interface KLineChartLabels extends AdapterA11yLabels {
  /** Role description read with the name. Default "candlestick chart". */
  roleDescription?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  /** The keyboard hint. */
  hint?: string;
}

export interface KLineChartProps {
  /** The `klinecharts` module (its namespace import), or a function that loads it (a dynamic import). */
  library: KLineLibrary | (() => Promise<KLineLibrary>);
  /** Names the figure, the plot and the hidden table; also the symbol's ticker inside the chart. */
  label: string;
  /** How prices print: at least the currency. */
  money: ChartMoneyConfig;
  /** Bars with bigint minor-unit prices, oldest first. A new array replaces the chart's data. */
  data: readonly KLineMoneyBar[];
  /** The bar size. Default one day. */
  period?: KLinePeriod;
  /** Plot height in px. Default 360. */
  height?: number;
  /** Candle drawing. Default 'candle_solid'. */
  candleType?: KLineCandleType;
  /** IANA time zone for the axis. Default: the browser's. */
  timezone?: string;
  /** `init` options merged over the Punji theme (deep). */
  chartOptions?: object;
  /** Words for the table, the live region and the summary. */
  labels?: KLineChartLabels;
  /** Text for a bar's time in the table and speech. Default `defaultBarTimeLabel`. */
  formatTime?: (timestamp: number) => string;
  /** Hidden-table rows kept (the latest). The cursor still walks every bar. Default 500. */
  maxTableRows?: number;
  /** How long streaming updates wait before the hidden table and live region refresh, in ms. Default 1000. */
  a11yRefreshMs?: number;
  /** Default true. False removes the tab stop and live region. */
  interactive?: boolean;
  /** Called once the chart exists (to add indicators, overlays, panes). */
  onReady?: (chart: KLineChartLike) => void;
  /** Called if the library fails to load. The hidden table still renders. */
  onError?: (error: unknown) => void;
  /** Class on the figure. Default "pu-klc". */
  className?: string;
  /** Becomes data-testid on the figure. */
  testId?: string;
  /** The streaming handle: `update`, `tick` and the chart itself. */
  ref?: Ref<KLineChartHandle>;
}

const DAY: KLinePeriod = { type: 'day', span: 1 };

/**
 * A KLineChart chart inside ChartA11yShell. The canvas is hidden from assistive technology; the figure, keyboard cursor,
 * live region and data table speak the exact bigint values you pass in. KLineChart has no public call to move its own
 * crosshair, so the keyboard cursor does not draw on the canvas: it reads each bar aloud and in the table.
 * @stability experimental
 */
export function KLineChart(props: KLineChartProps) {
  const { library, label, money, data, period = DAY, height = 360, candleType = 'candle_solid', timezone, chartOptions, labels, formatTime = defaultBarTimeLabel, maxTableRows, a11yRefreshMs = 1000, interactive = true, onReady, onError, className, testId, ref } = props;
  const mirror = useRef<readonly KLineMoneyBar[]>(data);
  const [snapshot, setSnapshot] = useState<readonly KLineMoneyBar[]>(data);
  const chartRef = useRef<KLineChartLike | null>(null);
  const pushRef = useRef<((bar: KLinePlotBar) => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mirror.current = data;
    setSnapshot(data);
  }, [data]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useImperativeHandle(ref, () => {
    const push = (bar: KLineMoneyBar): boolean => {
      const list = mirror.current;
      const last = list[list.length - 1];
      let next: KLineMoneyBar[];
      if (last && last.timestamp === bar.timestamp) next = [...list.slice(0, -1), bar];
      else if (!last || bar.timestamp > last.timestamp) next = [...list, bar];
      else return false;
      mirror.current = next;
      pushRef.current?.(plotBar(bar));
      timer.current ??= setTimeout(() => {
        timer.current = undefined;
        setSnapshot(mirror.current);
      }, a11yRefreshMs);
      return true;
    };
    return {
      update: (bar) => void push(bar),
      tick: (tick, intervalMs) => {
        const bar = mergeTickIntoBar(mirror.current[mirror.current.length - 1], tick, intervalMs);
        return bar ? push(bar) : false;
      },
      chart: () => chartRef.current,
    };
  }, [a11yRefreshMs]);

  const columns = [labels?.open ?? 'Open', labels?.high ?? 'High', labels?.low ?? 'Low', labels?.close ?? 'Close'];
  const a11y = useMemo(() => {
    const points: AdapterA11yPoint[] = snapshot.map((b) => ({ key: String(b.timestamp), label: formatTime(b.timestamp), values: [b.open, b.high, b.low, b.close] }));
    return buildAdapterA11y({ name: label, columns, points, money, maxRows: maxTableRows, labels });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns derives from labels
  }, [snapshot, label, money, maxTableRows, labels, formatTime]);

  return (
    <ChartA11yShell
      className={className ?? 'pu-klc'}
      label={label}
      roleDescription={labels?.roleDescription ?? 'candlestick chart'}
      count={a11y.count}
      speak={a11y.speak}
      hint={labels?.hint}
      summary={a11y.summary || undefined}
      table={a11y.table}
      interactive={interactive}
      testId={testId}
    >
      {({ pointerTo, plotProps }) => (
        <Plot {...{ library, label, money, data, period, height, candleType, timezone, chartOptions, labels, snapshot, onReady, onError, chartRef, pushRef, pointerTo }} plotProps={plotProps} />
      )}
    </ChartA11yShell>
  );
}

interface PlotProps {
  library: KLineChartProps['library'];
  label: string;
  money: ChartMoneyConfig;
  data: readonly KLineMoneyBar[];
  snapshot: readonly KLineMoneyBar[];
  period: KLinePeriod;
  height: number;
  candleType: KLineCandleType;
  timezone?: string;
  chartOptions?: object;
  labels?: KLineChartLabels;
  onReady?: KLineChartProps['onReady'];
  onError?: KLineChartProps['onError'];
  chartRef: { current: KLineChartLike | null };
  pushRef: { current: ((bar: KLinePlotBar) => void) | null };
  pointerTo: (index: number | null) => void;
  plotProps: (onPointer?: (event: PointerEvent<HTMLDivElement>) => void) => HTMLAttributes<HTMLDivElement>;
}

function Plot({ library, label, money, data, snapshot, period, height, candleType, timezone, chartOptions, labels, onReady, onError, chartRef, pushRef, pointerTo, plotProps }: PlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tokens = useChartTokens(hostRef);
  const latest = useRef({ library, tokens, money, label, data, period, candleType, timezone, chartOptions, labels, onReady, onError, pointerTo });
  useEffect(() => {
    latest.current = { library, tokens, money, label, data, period, candleType, timezone, chartOptions, labels, onReady, onError, pointerTo };
  });
  const byTime = useRef(new Map<number, number>());
  useEffect(() => {
    byTime.current = new Map(snapshot.map((b, i) => [b.timestamp, i]));
  }, [snapshot]);

  // Create the chart once the library is in (lazily, on the client), and dispose it on unmount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let cancelled = false;
    let stop = () => {};
    void Promise.resolve(typeof latest.current.library === 'function' ? latest.current.library() : latest.current.library)
      .then((lib) => {
        if (cancelled) return;
        const now = latest.current;
        const axisName = axisNameOf(now.money);
        const known = registered.get(lib) ?? new Set<string>();
        registered.set(lib, known);
        if (!known.has(axisName)) {
          const fmt = createMoneyChartFormatter(now.money);
          lib.registerYAxis({ name: axisName, displayValueToText: (value) => fmt(value) });
          known.add(axisName);
        }
        const options = mergeOptions({ styles: themeStyles(now.tokens, now.money, now.candleType, now.labels), ...(now.timezone ? { timezone: now.timezone } : {}) }, now.chartOptions);
        const chart = lib.init(host, options);
        if (!chart) throw new Error('klinecharts could not create a chart');
        chart.overrideYAxis({ name: axisName, paneId: 'candle_pane' });
        const loader: KLineDataLoaderLike = {
          getBars: ({ type, callback }) => callback(type === 'init' ? latest.current.data.map(plotBar) : [], false),
          subscribeBar: ({ callback }) => {
            pushRef.current = callback;
          },
          unsubscribeBar: () => {
            pushRef.current = null;
          },
        };
        chart.setDataLoader(loader);
        chart.setSymbol({ ticker: now.label, pricePrecision: 0, volumePrecision: 0 });
        chart.setPeriod(now.period);
        const onMove = (payload?: unknown) => {
          const at = (payload as KLineCrosshairLike | undefined)?.timestamp;
          latest.current.pointerTo(at === undefined ? null : (byTime.current.get(at) ?? null));
        };
        chart.subscribeAction('onCrosshairChange', onMove);
        const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => chart.resize()) : null;
        resize?.observe(host);
        chartRef.current = chart;
        stop = () => {
          resize?.disconnect();
          chart.unsubscribeAction('onCrosshairChange', onMove);
          lib.dispose(host);
        };
        now.onReady?.(chart);
      })
      .catch((error: unknown) => latest.current.onError?.(error));
    return () => {
      cancelled = true;
      stop();
      chartRef.current = null;
      pushRef.current = null;
    };
  }, [chartRef, pushRef]);

  // A new data array reloads the chart's bars. (Streaming goes through the handle's update, not here.)
  const loadedData = useRef(data);
  useEffect(() => {
    if (loadedData.current === data) return;
    loadedData.current = data;
    chartRef.current?.resetData();
  }, [data, chartRef]);

  // Re-apply the theme when the tokens (light, dark, high contrast) or the options change.
  useEffect(() => {
    chartRef.current?.setStyles(themeStyles(tokens, money, candleType, labels));
  }, [tokens, money, candleType, labels, chartRef]);

  return (
    <div {...plotProps()} className="pu-klc-plot">
      <div ref={hostRef} aria-hidden="true" className="pu-klc-host" style={{ height, width: '100%' }} />
    </div>
  );
}

function themeStyles(tokens: PunjiChartTokens, money: ChartMoneyConfig, candleType: KLineCandleType, labels?: KLineChartLabels): object {
  return klineStyles(tokens, {
    candleType,
    formatPrice: createMoneyChartFormatter(money),
    tooltip: { open: labels?.open ?? 'Open', high: labels?.high ?? 'High', low: labels?.low ?? 'Low', close: labels?.close ?? 'Close' },
  });
}
