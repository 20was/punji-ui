/**
 * The shape of an indicator the CandlestickChart can draw. An indicator is a plain descriptor built by its own
 * module (`rsiIndicator`, `macdIndicator`, `bollingerIndicator`, `vwapIndicator`), so a chart that draws none does not
 * ship the maths of any. Write your own by returning this shape.
 */
import type { ReactNode } from 'react';

/** One session an indicator is computed from. */
export interface IndicatorInput {
  /** The session's date as "YYYY-MM-DD". */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Shares traded; null when the candle has none. */
  volume: number | null;
}

/** One line (or histogram) an indicator draws and lists as a table column. */
export interface IndicatorLine {
  /** Stable key within the indicator ("rsi", "signal"). */
  key: string;
  /** Its name in the legend, the table head and the readout ("RSI 14"). */
  label: string;
  /** One value per input candle; null where there is none (warm-up, a gap). */
  values: readonly (number | null)[];
  /** 'line' (default) or 'histogram' (bars from zero). */
  style?: 'line' | 'histogram';
  /** SVG dash pattern, so lines differ by more than colour. */
  dash?: string;
}

/** What `compute` returns. */
export interface IndicatorResult {
  lines: readonly IndicatorLine[];
  /** A fixed value range for the pane (RSI is 0 to 100). Default: the data's own, rounded to nice ticks. */
  domain?: readonly [number, number];
  /** Reference lines in the pane ("70" overbought). */
  levels?: readonly { value: number; label: string }[];
  /** Two line keys to shade between (Bollinger's bands). */
  band?: { upper: string; lower: string };
  /** Decimals printed for the values. Default 2. */
  decimals?: number;
}

/** What a pane view is given to draw into the chart's SVG. */
export interface IndicatorViewProps {
  /** The indicator's id. */
  id: string;
  /** The pane's title. */
  label: string;
  /** What the indicator computed. */
  result: IndicatorResult;
  /** One colour token per line of `result`. */
  tones: readonly string[];
  /** The pane's top edge in SVG px. */
  top: number;
  /** The pane's height in SVG px. */
  height: number;
  /** The drawn positions: `to` is the index of the last session in each (the values of `result` are per session). */
  items: readonly { to: number }[];
  /** The x of position k, the width of a bar, the plot's left and right edges and where axis text starts. */
  cx: (k: number) => number;
  /** The width of a histogram bar in px. */
  body: number;
  /** The plot's left edge. */
  x0: number;
  /** The plot's right edge. */
  x1: number;
  /** Where axis text starts, right of the plot. */
  axisX: number;
  /** The active position, or null. */
  active: number | null;
}

export interface ChartIndicator {
  /** Stable id ("rsi-14"). Unique within a chart. */
  id: string;
  /** The pane's title and the legend name ("RSI 14"). */
  label: string;
  /** 'pane': its own pane below the price (and volume). 'price': drawn over the price, on the price scale. */
  placement: 'price' | 'pane';
  /** Draws a 'pane' indicator: use `IndicatorPaneView`. It lives with the indicator, not the chart, so a chart without a pane indicator does not ship it. Without one a pane indicator is still in the table, the summary and the readout but not drawn. */
  view?: (props: IndicatorViewProps) => ReactNode;
  /** The values over every valid session, oldest first. */
  compute: (candles: readonly IndicatorInput[]) => IndicatorResult;
  /** Words for a position, added to the live region and the readout ("overbought"). `at` is each line's value there. */
  describe?: (at: Readonly<Record<string, number | null>>, candle: IndicatorInput) => string;
}
