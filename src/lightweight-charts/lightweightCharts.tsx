'use client';

/**
 * TradingView Lightweight Charts adapter (optional): helpers and a thin React wrapper that mounts a Lightweight
 * Charts v5 chart inside `ChartA11yShell`, so the canvas gets a named figure, a keyboard cursor, a live region and
 * a hidden data table. Punji tokens are read from CSS variables and re-applied when the theme changes; prices print
 * from exact bigint minor units; ticks stream through `update()`.
 *
 * It imports nothing from `lightweight-charts`: you pass the library in (`library={lc}`, or a function that
 * loads it lazily, such as a dynamic import), and the types here are structural. `lightweight-charts` is an
 * optional peer dependency; nothing in the root export or the core bundle loads it.
 *
 * LICENCE: Lightweight Charts is Apache-2.0 with an attribution requirement. Your app must show the notice
 * (`LIGHTWEIGHT_CHARTS_NOTICE`) and a link to https://www.tradingview.com/ on a page users can reach. The chart's own
 * `attributionLogo` is that link, and it stays ON here unless you pass `attribution={false}` because you already
 * link to TradingView elsewhere.
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

/** The notice TradingView's licence asks you to show with a link to https://www.tradingview.com/. Put it on a page users can reach (an About or Legal page). */
export const LIGHTWEIGHT_CHARTS_NOTICE = 'TradingView Lightweight Charts™ Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/';

/** A bar's time: a "YYYY-MM-DD" business day, or UTC seconds. */
export type LightweightTime = string | number;

/** A candle in exact minor units (paisa, cents). */
export interface MoneyCandle {
  time: LightweightTime;
  open: bigint;
  high: bigint;
  low: bigint;
  close: bigint;
}

/** A line or area point in exact minor units. */
export interface MoneyLinePoint {
  time: LightweightTime;
  value: bigint;
}

/** A trade or quote: UTC seconds and a price in minor units. */
export interface PriceTick {
  time: number;
  price: bigint;
}

export type LightweightSeriesKind = 'candlestick' | 'line' | 'area';

/** The slice of a Lightweight Charts series the adapter calls. Structural: the real `ISeriesApi` fits. */
export interface LightweightSeriesLike {
  setData(data: readonly object[]): void;
  update(point: object, historicalUpdate?: boolean): void;
  applyOptions(options: object): void;
}

/** What a crosshair callback carries. */
export interface LightweightCrosshairParam {
  time?: unknown;
}

/** The slice of a Lightweight Charts chart the adapter calls. Structural: the real `IChartApi` fits. */
export interface LightweightChartLike {
  addSeries(definition: unknown, options?: object, paneIndex?: number): LightweightSeriesLike;
  applyOptions(options: object): void;
  remove(): void;
  timeScale(): { fitContent(): void };
  subscribeCrosshairMove(handler: (param: LightweightCrosshairParam) => void): void;
  unsubscribeCrosshairMove(handler: (param: LightweightCrosshairParam) => void): void;
  setCrosshairPosition?(price: number, horzScaleItem: unknown, series: LightweightSeriesLike): void;
  clearCrosshairPosition?(): void;
}

/** The part of the `lightweight-charts` module the adapter needs: the module namespace fits. */
export interface LightweightLibrary {
  createChart(container: HTMLElement, options?: object): LightweightChartLike;
  CandlestickSeries: unknown;
  LineSeries: unknown;
  AreaSeries: unknown;
}

/** The text of the time axis row in the hidden table and the spoken text. Default: the business day as given, or `YYYY-MM-DD HH:MM UTC` for seconds. */
export function defaultTimeLabel(time: LightweightTime): string {
  return typeof time === 'number' ? `${new Date(time * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC` : time;
}

/**
 * The chart options for a Punji theme: transparent-free solid surface, text, grid, axis and crosshair colours from the
 * tokens, the Punji font, and the TradingView attribution logo (on unless `attribution` is false).
 */
export function lightweightChartOptions(tokens: PunjiChartTokens, options: { money?: ChartMoneyConfig; attribution?: boolean; autoSize?: boolean } = {}): Record<string, unknown> {
  const { money, attribution = true, autoSize = true } = options;
  return {
    autoSize,
    layout: {
      background: { type: 'solid', color: tokens.surface },
      textColor: tokens.text,
      fontFamily: tokens.fontFamily,
      attributionLogo: attribution,
    },
    grid: { vertLines: { color: tokens.grid }, horzLines: { color: tokens.grid } },
    rightPriceScale: { borderColor: tokens.axis },
    timeScale: { borderColor: tokens.axis },
    crosshair: {
      vertLine: { color: tokens.textMuted, labelBackgroundColor: tokens.textMuted },
      horzLine: { color: tokens.textMuted, labelBackgroundColor: tokens.textMuted },
    },
    ...(money ? { localization: { priceFormatter: createMoneyChartFormatter(money) } } : {}),
  };
}

/** A custom `priceFormat` that prints plotted minor units as exact money. Whole minor units are the finest step. */
export function moneyPriceFormat(money: ChartMoneyConfig, options: { compact?: boolean } = {}): { type: 'custom'; formatter: (price: number) => string; minMove: number } {
  return { type: 'custom', formatter: createMoneyChartFormatter(money, options), minMove: 1 };
}

/** The series options for a theme: gain and loss candles (borderless), an accent line, an accent-filled area. */
export function lightweightSeriesOptions(kind: LightweightSeriesKind, tokens: PunjiChartTokens, money?: ChartMoneyConfig): Record<string, unknown> {
  const priceFormat = money ? { priceFormat: moneyPriceFormat(money) } : {};
  if (kind === 'candlestick') {
    return { upColor: tokens.gain, downColor: tokens.loss, borderVisible: false, wickUpColor: tokens.gain, wickDownColor: tokens.loss, ...priceFormat };
  }
  if (kind === 'line') return { color: tokens.accent, lineWidth: 2, ...priceFormat };
  return { lineColor: tokens.accent, topColor: tokens.accentFill, bottomColor: 'rgba(0, 0, 0, 0)', lineWidth: 2, ...priceFormat };
}

/** Candles as the plain numbers Lightweight Charts plots (minor units). Lossy past 2^53; the table twin stays exact. */
export function toLightweightCandles(candles: readonly MoneyCandle[]): Array<{ time: LightweightTime; open: number; high: number; low: number; close: number }> {
  return candles.map(candleData);
}

/** Line or area points as the plain numbers Lightweight Charts plots (minor units). */
export function toLightweightLine(points: readonly MoneyLinePoint[]): Array<{ time: LightweightTime; value: number }> {
  return points.map(lineData);
}

const candleData = (c: MoneyCandle) => ({ time: c.time, open: minorToChartNumber(c.open), high: minorToChartNumber(c.high), low: minorToChartNumber(c.low), close: minorToChartNumber(c.close) });
const lineData = (p: MoneyLinePoint) => ({ time: p.time, value: minorToChartNumber(p.value) });

/**
 * Folds a tick into the newest candle of an `intervalSeconds` bar: the same bar extends its high, low and close; a
 * later bar opens a new candle at the tick price. Returns null for a tick older than the newest bar (Lightweight
 * Charts rejects an update behind its last point), so a late tick is dropped, never reordered.
 */
export function mergeTickIntoCandle(last: MoneyCandle | undefined, tick: PriceTick, intervalSeconds: number): MoneyCandle | null {
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) throw new RangeError('intervalSeconds must be a positive number');
  const bucket = Math.floor(tick.time / intervalSeconds) * intervalSeconds;
  if (last && typeof last.time === 'number') {
    if (bucket < last.time) return null;
    if (bucket === last.time) {
      return { time: last.time, open: last.open, high: tick.price > last.high ? tick.price : last.high, low: tick.price < last.low ? tick.price : last.low, close: tick.price };
    }
  }
  return { time: bucket, open: tick.price, high: tick.price, low: tick.price, close: tick.price };
}

const timeKey = (time: unknown): string => {
  if (typeof time === 'object' && time !== null) {
    const day = time as { year?: number; month?: number; day?: number };
    return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
  }
  return String(time);
};

type AnyPoint = MoneyCandle | MoneyLinePoint;
const isCandle = (p: AnyPoint): p is MoneyCandle => 'open' in p;
const closeOf = (p: AnyPoint): bigint => (isCandle(p) ? p.close : p.value);
const dataOf = (kind: LightweightSeriesKind, p: AnyPoint): object => (kind === 'candlestick' ? candleData(p as MoneyCandle) : lineData(p as MoneyLinePoint));

/** What the `ref` of `LightweightChart` exposes. */
export interface LightweightChartHandle {
  /** Updates the newest point or appends a newer one (the streaming path). A point older than the newest is ignored. */
  update: (point: MoneyCandle | MoneyLinePoint) => void;
  /** Folds a tick into the newest candle (candlestick) or appends/replaces a point (line, area). Returns false for a stale tick. */
  tick: (tick: PriceTick, intervalSeconds: number) => boolean;
  /** The Lightweight Charts chart, once the library has loaded; null before. */
  chart: () => LightweightChartLike | null;
}

export interface LightweightChartLabels extends AdapterA11yLabels {
  /** Role description read with the name. Default "candlestick chart" or "line chart". */
  roleDescription?: string;
  /** Column heads for a candle. Default Open, High, Low, Close. */
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  /** Column head for a line or area point. Default "Value". */
  value?: string;
  /** The keyboard hint. */
  hint?: string;
}

interface LightweightChartBase {
  /** The `lightweight-charts` module (its namespace import), or a function that loads it (a dynamic import). */
  library: LightweightLibrary | (() => Promise<LightweightLibrary>);
  /** Names the figure, the plot and the hidden table. */
  label: string;
  /** How prices print: at least the currency. */
  money: ChartMoneyConfig;
  /** Plot height in px. Default 320. */
  height?: number;
  /** Show TradingView's attribution logo, which satisfies the licence's link requirement. Default true. Turn it off only if your app already links to https://www.tradingview.com/ with the notice. */
  attribution?: boolean;
  /** Chart options merged over the Punji theme (deep). `layout.attributionLogo` is controlled by `attribution`. */
  chartOptions?: object;
  /** Series options merged over the Punji theme (deep). */
  seriesOptions?: object;
  /** Words for the table, the live region and the summary. */
  labels?: LightweightChartLabels;
  /** Text for a bar's time. Default `defaultTimeLabel`. */
  formatTime?: (time: LightweightTime) => string;
  /** Hidden-table rows kept (the latest). The cursor still walks every point. Default 500. */
  maxTableRows?: number;
  /** How long streaming updates wait before the hidden table and live region refresh, in ms. Default 1000. */
  a11yRefreshMs?: number;
  /** Default true. False removes the tab stop and live region. */
  interactive?: boolean;
  /** Called once the chart and series exist (to add indicators, markers, more series). */
  onReady?: (chart: LightweightChartLike, series: LightweightSeriesLike) => void;
  /** Called if the library fails to load. The hidden table still renders. */
  onError?: (error: unknown) => void;
  /** Class on the figure. Default "pu-lwc". */
  className?: string;
  /** Becomes data-testid on the figure. */
  testId?: string;
  /** The streaming handle: `update`, `tick` and the chart itself. */
  ref?: Ref<LightweightChartHandle>;
}

export type LightweightChartProps = LightweightChartBase &
  (
    | {
        /** The series type. Default 'candlestick'. */
        kind?: 'candlestick';
        /** Candles with bigint minor-unit prices, oldest first. A new array replaces the series data. */
        data: readonly MoneyCandle[];
      }
    | {
        /** The series type: a 'line' or a filled 'area'. */
        kind: 'line' | 'area';
        /** Points with a bigint minor-unit value, oldest first. A new array replaces the series data. */
        data: readonly MoneyLinePoint[];
      }
  );

/**
 * A Lightweight Charts chart inside ChartA11yShell. The canvas is hidden from assistive technology; the figure, keyboard
 * cursor, live region and data table speak the exact bigint values you pass in.
 * @stability experimental
 */
export function LightweightChart(props: LightweightChartProps) {
  const { library, label, money, height = 320, attribution = true, chartOptions, seriesOptions, labels, formatTime = defaultTimeLabel, maxTableRows, a11yRefreshMs = 1000, interactive = true, onReady, onError, className, testId, ref } = props;
  const kind: LightweightSeriesKind = props.kind ?? 'candlestick';
  const data = props.data as readonly AnyPoint[];
  const mirror = useRef<readonly AnyPoint[]>(data);
  const [snapshot, setSnapshot] = useState<readonly AnyPoint[]>(data);
  const chartRef = useRef<LightweightChartLike | null>(null);
  const seriesRef = useRef<LightweightSeriesLike | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mirror.current = data;
    setSnapshot(data);
  }, [data]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useImperativeHandle(ref, () => {
    const push = (point: AnyPoint): boolean => {
      const list = mirror.current;
      const last = list[list.length - 1];
      const key = timeKey(point.time);
      let next: AnyPoint[];
      if (last && timeKey(last.time) === key) next = [...list.slice(0, -1), point];
      else if (!last || (typeof point.time === 'number' && typeof last.time === 'number' ? point.time > last.time : String(point.time) > String(last.time))) next = [...list, point];
      else return false;
      mirror.current = next;
      seriesRef.current?.update(dataOf(kind, point));
      timer.current ??= setTimeout(() => {
        timer.current = undefined;
        setSnapshot(mirror.current);
      }, a11yRefreshMs);
      return true;
    };
    return {
      update: (point) => void push(point),
      tick: (tick, intervalSeconds) => {
        if (kind !== 'candlestick') return push({ time: tick.time, value: tick.price });
        const last = mirror.current[mirror.current.length - 1];
        const candle = mergeTickIntoCandle(last && isCandle(last) ? last : undefined, tick, intervalSeconds);
        return candle ? push(candle) : false;
      },
      chart: () => chartRef.current,
    };
  }, [kind, a11yRefreshMs]);

  const columns = kind === 'candlestick' ? [labels?.open ?? 'Open', labels?.high ?? 'High', labels?.low ?? 'Low', labels?.close ?? 'Close'] : [labels?.value ?? 'Value'];
  const a11y = useMemo(() => {
    const points: AdapterA11yPoint[] = snapshot.map((p) => ({ key: timeKey(p.time), label: formatTime(p.time), values: isCandle(p) ? [p.open, p.high, p.low, p.close] : [p.value] }));
    return buildAdapterA11y({ name: label, columns, points, money, maxRows: maxTableRows, labels });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns derives from kind and labels
  }, [snapshot, label, kind, money, maxTableRows, labels, formatTime]);

  return (
    <ChartA11yShell
      className={className ?? 'pu-lwc'}
      label={label}
      roleDescription={labels?.roleDescription ?? (kind === 'candlestick' ? 'candlestick chart' : 'line chart')}
      count={a11y.count}
      speak={a11y.speak}
      hint={labels?.hint}
      summary={a11y.summary || undefined}
      table={a11y.table}
      interactive={interactive}
      testId={testId}
    >
      {({ index, pointerTo, plotProps }) => (
        <Plot
          {...{ library, kind, data, snapshot, money, height, attribution, chartOptions, seriesOptions, onReady, onError, chartRef, seriesRef, index, pointerTo }}
          plotProps={plotProps}
        />
      )}
    </ChartA11yShell>
  );
}

interface PlotProps {
  library: LightweightChartBase['library'];
  kind: LightweightSeriesKind;
  data: readonly AnyPoint[];
  snapshot: readonly AnyPoint[];
  money: ChartMoneyConfig;
  height: number;
  attribution: boolean;
  chartOptions?: object;
  seriesOptions?: object;
  onReady?: LightweightChartBase['onReady'];
  onError?: LightweightChartBase['onError'];
  chartRef: { current: LightweightChartLike | null };
  seriesRef: { current: LightweightSeriesLike | null };
  index: number | null;
  pointerTo: (index: number | null) => void;
  plotProps: (onPointer?: (event: PointerEvent<HTMLDivElement>) => void) => HTMLAttributes<HTMLDivElement>;
}

function Plot({ library, kind, data, snapshot, money, height, attribution, chartOptions, seriesOptions, onReady, onError, chartRef, seriesRef, index, pointerTo, plotProps }: PlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tokens = useChartTokens(hostRef);
  const latest = useRef({ library, tokens, money, attribution, chartOptions, seriesOptions, data, onReady, onError, pointerTo });
  useEffect(() => {
    latest.current = { library, tokens, money, attribution, chartOptions, seriesOptions, data, onReady, onError, pointerTo };
  });
  const byTime = useRef(new Map<string, number>());
  useEffect(() => {
    byTime.current = new Map(snapshot.map((p, i) => [timeKey(p.time), i]));
  }, [snapshot]);

  // Create the chart once the library is in (lazily, on the client), and remove it on unmount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let cancelled = false;
    let stop = () => {};
    void Promise.resolve(typeof latest.current.library === 'function' ? latest.current.library() : latest.current.library)
      .then((lib) => {
        if (cancelled) return;
        const now = latest.current;
        const chart = lib.createChart(host, themeChartOptions(now.tokens, now.money, now.attribution, now.chartOptions));
        const definition = kind === 'candlestick' ? lib.CandlestickSeries : kind === 'line' ? lib.LineSeries : lib.AreaSeries;
        const series = chart.addSeries(definition, themeSeriesOptions(kind, now.tokens, now.money, now.seriesOptions));
        series.setData(now.data.map((p) => dataOf(kind, p)));
        chart.timeScale().fitContent();
        const onMove = (param: LightweightCrosshairParam) => latest.current.pointerTo(param.time === undefined ? null : (byTime.current.get(timeKey(param.time)) ?? null));
        chart.subscribeCrosshairMove(onMove);
        chartRef.current = chart;
        seriesRef.current = series;
        stop = () => {
          chart.unsubscribeCrosshairMove(onMove);
          chart.remove();
        };
        now.onReady?.(chart, series);
      })
      .catch((error: unknown) => latest.current.onError?.(error));
    return () => {
      cancelled = true;
      stop();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [kind, chartRef, seriesRef]);

  // A new data array replaces the series data. (Streaming goes through the handle's update, not here.)
  useEffect(() => {
    seriesRef.current?.setData(data.map((p) => dataOf(kind, p)));
  }, [data, kind, seriesRef]);

  // Re-apply the theme when the tokens (light, dark, high contrast) or the options change.
  useEffect(() => {
    chartRef.current?.applyOptions(themeChartOptions(tokens, money, attribution, chartOptions));
    seriesRef.current?.applyOptions(themeSeriesOptions(kind, tokens, money, seriesOptions));
  }, [tokens, money, attribution, chartOptions, seriesOptions, kind, chartRef, seriesRef]);

  // The keyboard cursor drives the chart's crosshair.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const point = index === null ? undefined : snapshot[index];
    if (point) chart.setCrosshairPosition?.(minorToChartNumber(closeOf(point)), point.time, series);
    else chart.clearCrosshairPosition?.();
  }, [index, snapshot, chartRef, seriesRef]);

  return (
    <div {...plotProps()} className="pu-lwc-plot">
      <div ref={hostRef} aria-hidden="true" style={{ height, width: '100%' }} />
    </div>
  );
}

function themeChartOptions(tokens: PunjiChartTokens, money: ChartMoneyConfig, attribution: boolean, over?: object): object {
  const merged = mergeOptions(lightweightChartOptions(tokens, { money, attribution }), over);
  return mergeOptions(merged, { layout: { attributionLogo: attribution } });
}

function themeSeriesOptions(kind: LightweightSeriesKind, tokens: PunjiChartTokens, money: ChartMoneyConfig, over?: object): object {
  return mergeOptions(lightweightSeriesOptions(kind, tokens, money), over);
}
