/**
 * Shared by the optional canvas chart adapters (`@punji/ui/lightweight-charts`, `/echarts`). Internal: not a public
 * subpath. No React, no browser global, no third-party import: it maps Punji's CSS variables to the plain colours a
 * canvas library needs (a canvas cannot read `var(--pu-...)`).
 */

/** The Punji colours a canvas chart draws with. Each is a CSS colour string already resolved from the active theme. */
export interface PunjiChartTokens {
  /** Axis labels, titles. */
  text: string;
  /** Secondary text and crosshair labels. */
  textMuted: string;
  /** Grid lines. */
  grid: string;
  /** Axis lines and borders. */
  axis: string;
  /** The chart's background. */
  surface: string;
  /** Up, gain. */
  gain: string;
  /** Down, loss. */
  loss: string;
  /** The single-series line colour. */
  accent: string;
  /** The soft fill under an area. */
  accentFill: string;
  /** The categorical series palette, in Punji's order (accent first). */
  series: readonly string[];
  /** The body font stack. */
  fontFamily: string;
}

/** The CSS variable each scalar token reads. */
export const CHART_TOKEN_VARS = {
  text: '--pu-color-text',
  textMuted: '--pu-color-text-muted',
  grid: '--pu-color-border-default',
  axis: '--pu-color-border-control',
  surface: '--pu-color-surface',
  gain: '--pu-color-gain',
  loss: '--pu-color-loss',
  accent: '--pu-color-chart',
  accentFill: '--pu-color-chart-fill',
  fontFamily: '--pu-font-body',
} as const;

/** The series palette variables, in order. */
export const CHART_SERIES_VARS: readonly string[] = [
  '--pu-color-chart',
  '--pu-color-series-nepse',
  ...Array.from({ length: 10 }, (_, i) => `--pu-color-series-${i + 3}`),
];

/** The light theme's values: used on the server, before the first read, and for any token the page does not define. */
export const FALLBACK_CHART_TOKENS: PunjiChartTokens = Object.freeze({
  text: '#121314',
  textMuted: '#4f5358',
  grid: 'rgba(18, 19, 20, 0.1)',
  axis: '#7a7e78',
  surface: '#f7f8f3',
  gain: '#284800',
  loss: '#a3321f',
  accent: '#5e8c00',
  accentFill: 'rgba(200, 242, 61, 0.3)',
  series: Object.freeze(['#5e8c00', '#3552c8', '#b07300', '#7e4fd6', '#0b7f75', '#b8326f', '#0a6fae', '#c2570c', '#2f8a4c', '#8a5a2b', '#a336b8', '#77700f']),
  fontFamily: "'Geist', 'Mukta', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});

/**
 * Builds the tokens from a variable reader (`getComputedStyle(el).getPropertyValue` in a browser). An empty or missing
 * variable keeps the fallback. Pure, so the mapping is testable without a DOM.
 */
export function chartTokensFrom(read: (variable: string) => string | undefined, fallback: PunjiChartTokens = FALLBACK_CHART_TOKENS): PunjiChartTokens {
  const get = (variable: string, or: string) => read(variable)?.trim() || or;
  const series = CHART_SERIES_VARS.map((variable, i) => get(variable, fallback.series[i] ?? fallback.accent));
  return {
    text: get(CHART_TOKEN_VARS.text, fallback.text),
    textMuted: get(CHART_TOKEN_VARS.textMuted, fallback.textMuted),
    grid: get(CHART_TOKEN_VARS.grid, fallback.grid),
    axis: get(CHART_TOKEN_VARS.axis, fallback.axis),
    surface: get(CHART_TOKEN_VARS.surface, fallback.surface),
    gain: get(CHART_TOKEN_VARS.gain, fallback.gain),
    loss: get(CHART_TOKEN_VARS.loss, fallback.loss),
    accent: get(CHART_TOKEN_VARS.accent, fallback.accent),
    accentFill: get(CHART_TOKEN_VARS.accentFill, fallback.accentFill),
    series,
    fontFamily: get(CHART_TOKEN_VARS.fontFamily, fallback.fontFamily),
  };
}

/** True when two token sets draw identically. */
export function sameChartTokens(a: PunjiChartTokens, b: PunjiChartTokens): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

function isPlain(value: unknown): value is object {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Merges plain objects deeply (arrays and other values in `over` replace). Neither input is changed. */
export function mergeOptions<T extends object>(base: T, over: object | undefined): T {
  if (!over) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(over)) {
    const prev = out[key];
    out[key] = isPlain(prev) && isPlain(value) ? mergeOptions(prev, value) : value;
  }
  return out as T;
}
