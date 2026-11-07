'use client';

/**
 * Apache ECharts adapter (optional): a Punji theme object generated from the tokens, exact money axis and tooltip
 * formatters, and a thin React wrapper that mounts a chart inside `ChartA11yShell`.
 *
 * It imports nothing from `echarts`: you pass the library in (`library={{ init }}` from `echarts/core` after your own
 * `use([...])`, or `() => import('./my-echarts')`), and the types are structural. `echarts` is an optional peer
 * dependency; nothing in the root export or the core bundle loads it.
 *
 * ECharts' own `aria` (its generated description) is switched OFF by the wrapper and the theme: the shell's figure
 * name, live region and data table are the one accessible description, built from your exact bigint values.
 * Apache-2.0: keep ECharts' NOTICE if you redistribute it.
 *
 * @stability experimental
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';

import { ChartA11yShell } from '../chart-a11y/ChartA11yShell.tsx';
import { createMoneyChartFormatter, type ChartMoneyConfig } from '../chart-adapters/adapterMoney.ts';
import { FALLBACK_CHART_TOKENS, mergeOptions, type PunjiChartTokens } from '../chart-adapters/adapterTokens.ts';
import { buildAdapterA11y, useChartTokens, type AdapterA11yLabels, type AdapterA11yPoint } from '../internal/chartAdapterRuntime.tsx';

export { readChartTokens, watchChartTheme } from '../internal/chartAdapterRuntime.tsx';
export { FALLBACK_CHART_TOKENS } from '../chart-adapters/adapterTokens.ts';
export type { PunjiChartTokens } from '../chart-adapters/adapterTokens.ts';
export { createMoneyChartFormatter, minorToChartNumber } from '../chart-adapters/adapterMoney.ts';
export type { ChartMoneyConfig, ChartMoneyFormatter } from '../chart-adapters/adapterMoney.ts';

/**
 * An ECharts theme object built from Punji tokens: series palette, text, axes, grid, tooltip, legend, candlestick
 * gain/loss colours, no background (the page shows through), and ECharts' own `aria` off. Pass it to `echarts.init`
 * or `echarts.registerTheme`.
 * @stability experimental
 */
export function punjiEChartsTheme(tokens: PunjiChartTokens = FALLBACK_CHART_TOKENS): Record<string, unknown> {
  const axis = {
    axisLine: { show: true, lineStyle: { color: tokens.axis } },
    axisTick: { show: true, lineStyle: { color: tokens.axis } },
    axisLabel: { show: true, color: tokens.textMuted },
    splitLine: { show: true, lineStyle: { color: tokens.grid } },
    splitArea: { show: false },
    nameTextStyle: { color: tokens.textMuted },
  };
  return {
    color: [...tokens.series],
    backgroundColor: 'transparent',
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    title: { textStyle: { color: tokens.text }, subtextStyle: { color: tokens.textMuted } },
    legend: { textStyle: { color: tokens.text } },
    tooltip: { backgroundColor: tokens.surface, borderColor: tokens.axis, textStyle: { color: tokens.text }, axisPointer: { lineStyle: { color: tokens.textMuted }, crossStyle: { color: tokens.textMuted } } },
    categoryAxis: axis,
    valueAxis: axis,
    logAxis: axis,
    timeAxis: axis,
    line: { symbol: 'circle', smooth: false, lineStyle: { width: 2 } },
    bar: { itemStyle: { barBorderWidth: 0 } },
    candlestick: { itemStyle: { color: tokens.gain, color0: tokens.loss, borderColor: tokens.gain, borderColor0: tokens.loss } },
    aria: { enabled: false },
  };
}

/**
 * The `axisLabel.formatter` for a money value axis whose data are minor units: `axisLabel: { formatter: moneyAxisFormatter(cfg) }`.
 * Compact by default (lakh and crore, or K/M/B), which is display-rounded; pass `{ compact: false }` for the exact figure.
 * @stability experimental
 */
export function moneyAxisFormatter(money: ChartMoneyConfig, options: { compact?: boolean } = {}): (value: number) => string {
  return createMoneyChartFormatter(money, { compact: options.compact ?? true });
}

/** The slice of an ECharts tooltip params object the formatter reads (one series, or the array for an axis tooltip). */
export interface EChartsTooltipParams {
  seriesName?: string;
  name?: string;
  axisValueLabel?: string;
  marker?: string;
  value?: unknown;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);

/**
 * A tooltip `formatter` for data in minor units. It prints each series' value as exact money and HTML-escapes names (ECharts renders the
 * string as HTML). `valueIndex` picks the entry of an array value (default the last, the y of `[x, y]`); a negative index counts from the end.
 * @stability experimental
 */
export function moneyTooltipFormatter(money: ChartMoneyConfig, options: { valueIndex?: number } = {}): (params: EChartsTooltipParams | readonly EChartsTooltipParams[]) => string {
  const format = createMoneyChartFormatter(money);
  const valueOf = (value: unknown): string => {
    const raw = Array.isArray(value) ? value.at(options.valueIndex ?? -1) : value;
    if (typeof raw === 'bigint') return format(raw);
    if (typeof raw === 'number') return format(raw);
    return typeof raw === 'string' ? escapeHtml(raw) : '';
  };
  return (params) => {
    const list = Array.isArray(params) ? (params as readonly EChartsTooltipParams[]) : [params as EChartsTooltipParams];
    const head = list[0]?.axisValueLabel ?? list[0]?.name;
    const lines = list.map((p) => `${p.marker ?? ''}${p.seriesName ? `${escapeHtml(p.seriesName)}: ` : ''}<b>${valueOf(p.value)}</b>`);
    return [head ? escapeHtml(head) : '', ...lines].filter(Boolean).join('<br/>');
  };
}

/** The slice of an ECharts instance the wrapper calls. Structural: the real `ECharts` fits. */
export interface EChartsInstanceLike {
  setOption(option: object, opts?: object): void;
  resize(): void;
  dispose(): void;
  on(event: string, handler: (params: unknown) => void): void;
  dispatchAction(payload: object): void;
}

/** The part of ECharts the wrapper needs: `{ init }` from `echarts` or from `echarts/core`. */
export interface EChartsLibrary {
  init(host: HTMLElement, theme?: object | string | null, opts?: object): EChartsInstanceLike;
}

/** One position on the chart's category axis, in exact bigints: the hidden table, live region and summary come from these. */
export interface EChartsA11yPoint {
  /** The row head and the spoken lead (the date, the period). */
  label: string;
  /** One value per series, in `seriesNames` order. `null` for none. */
  values: readonly (bigint | null)[];
}

/** What the `ref` of `EChart` exposes. */
export interface EChartHandle {
  /** The ECharts instance, once the library has loaded; null before. */
  instance: () => EChartsInstanceLike | null;
}

export interface EChartLabels extends AdapterA11yLabels {
  /** Role description read with the name. Default "chart". */
  roleDescription?: string;
  /** The keyboard hint. */
  hint?: string;
}

export interface EChartProps {
  /** `{ init }` from echarts, or a function that loads it. */
  library: EChartsLibrary | (() => Promise<EChartsLibrary>);
  /** Your ECharts option. Plot minor units as numbers and format with `moneyAxisFormatter` / `moneyTooltipFormatter`. `aria` is forced off. */
  option: object;
  /** Names the figure, the plot and the hidden table. */
  label: string;
  /** How prices print in the table and the spoken text. */
  money: ChartMoneyConfig;
  /** One entry per category-axis position, with exact bigint values per series. */
  points: readonly EChartsA11yPoint[];
  /** The series names, the table's column heads. */
  seriesNames: readonly string[];
  /** Plot height in px. Default 320. */
  height?: number;
  /** Extra `echarts.init` options, such as `{ renderer: 'svg' }`. Default `{ renderer: 'canvas' }`. */
  initOptions?: object;
  /** Words for the table, the live region and the summary. */
  labels?: EChartLabels;
  /** Hidden-table rows kept (the latest). Default 500. */
  maxTableRows?: number;
  /** Default true. False removes the tab stop and live region. */
  interactive?: boolean;
  /** Called if the library fails to load. The hidden table still renders. */
  onError?: (error: unknown) => void;
  /** Class on the figure. Default "pu-echart". */
  className?: string;
  /** Becomes data-testid on the figure. */
  testId?: string;
  /** Gives access to the ECharts instance, once loaded. */
  ref?: Ref<EChartHandle>;
}

/**
 * An ECharts chart inside ChartA11yShell, themed from the Punji tokens (re-created with the new theme when light,
 * dark or high contrast changes). The canvas is hidden from assistive technology; ECharts' own aria is off.
 * @stability experimental
 */
export function EChart({ library, option, label, money, points, seriesNames, height = 320, initOptions, labels, maxTableRows, interactive = true, onError, className, testId, ref }: EChartProps) {
  const a11y = useMemo(() => {
    const rows: AdapterA11yPoint[] = points.map((p, i) => ({ key: `${i}`, label: p.label, values: p.values }));
    return buildAdapterA11y({ name: label, columns: seriesNames, points: rows, money, maxRows: maxTableRows, labels });
  }, [points, label, seriesNames, money, maxTableRows, labels]);
  const instanceRef = useRef<EChartsInstanceLike | null>(null);
  useImperativeHandle(ref, () => ({ instance: () => instanceRef.current }), []);
  return (
    <ChartA11yShell
      className={className ?? 'pu-echart'}
      label={label}
      roleDescription={labels?.roleDescription ?? 'chart'}
      count={a11y.count}
      speak={a11y.speak}
      hint={labels?.hint}
      summary={a11y.summary || undefined}
      table={a11y.table}
      interactive={interactive}
      testId={testId}
    >
      {({ index, pointerTo, plotProps }) => (
        <div {...plotProps()} className="pu-echart-plot">
          <Canvas {...{ library, option, height, initOptions, onError, instanceRef, index, pointerTo }} />
        </div>
      )}
    </ChartA11yShell>
  );
}

interface CanvasProps {
  library: EChartProps['library'];
  option: object;
  height: number;
  initOptions?: object;
  onError?: (error: unknown) => void;
  instanceRef: { current: EChartsInstanceLike | null };
  index: number | null;
  pointerTo: (index: number | null) => void;
}

const withoutAria = (option: object): object => mergeOptions(option, { aria: { enabled: false } });

function Canvas({ library, option, height, initOptions, onError, instanceRef, index, pointerTo }: CanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tokens = useChartTokens(hostRef);
  const latest = useRef({ library, option, initOptions, onError, pointerTo });
  useEffect(() => {
    latest.current = { library, option, initOptions, onError, pointerTo };
  });
  const [active, setActive] = useState<EChartsInstanceLike | null>(null);

  // (Re)create the instance when the theme changes: an ECharts theme is fixed at init.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let cancelled = false;
    let dispose = () => {};
    let observer: ResizeObserver | undefined;
    void Promise.resolve(typeof latest.current.library === 'function' ? latest.current.library() : latest.current.library)
      .then((lib) => {
        if (cancelled) return;
        const now = latest.current;
        const chart = lib.init(host, punjiEChartsTheme(tokens), { renderer: 'canvas', ...now.initOptions });
        chart.setOption(withoutAria(now.option));
        chart.on('mouseover', (e) => now.pointerTo((e as { dataIndex?: number } | null)?.dataIndex ?? null));
        chart.on('globalout', () => now.pointerTo(null));
        if (typeof ResizeObserver === 'function') {
          observer = new ResizeObserver(() => chart.resize());
          observer.observe(host);
        }
        instanceRef.current = chart;
        dispose = () => chart.dispose();
        setActive(chart);
      })
      .catch((error: unknown) => latest.current.onError?.(error));
    return () => {
      cancelled = true;
      observer?.disconnect();
      dispose();
      instanceRef.current = null;
      setActive(null);
    };
  }, [tokens, instanceRef]);

  useEffect(() => {
    instanceRef.current?.setOption(withoutAria(option));
  }, [option, instanceRef]);

  // The keyboard cursor shows the tooltip at its position.
  useEffect(() => {
    if (!active) return;
    if (index === null) active.dispatchAction({ type: 'hideTip' });
    else active.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
  }, [index, active]);

  return <div ref={hostRef} aria-hidden="true" style={{ height, width: '100%' }} />;
}
