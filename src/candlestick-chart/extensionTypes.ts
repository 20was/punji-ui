/**
 * The opt-in extensions of CandlestickChart. Each lives in its own module (and subpath), so a chart that does not
 * import it does not ship it: `heikinAshiTransform` (`@punji/ui/heikin-ashi`), `priceScales` (`@punji/ui/price-scales`:
 * log, percent and indexed axes and compare lines), `eventsLayer` (`@punji/ui/candlestick-events`) and `levelsLayer`
 * (`@punji/ui/candlestick-levels`). Write your own by returning these shapes.
 */
import type { KeyboardEvent, ReactNode } from 'react';

import type { PriceScaleMode } from '../chart-math/chartMath.ts';
import type { Candle, CandlestickChartLabels } from './CandlestickChart.tsx';
import type { ChartIndicator } from './indicatorTypes.ts';

/** How the price axis is laid out: the price, its logarithm, percent change from the first close, or indexed to 100 at the first close. */
export type CandlestickScale = PriceScaleMode;

/** Another instrument drawn over the price, for comparison (needs `scales={priceScales}`). */
export interface CompareSeries {
  /** Its name in the legend, the readout and the table. */
  label: string;
  /** Closes by date ("YYYY-MM-DD"). A date the chart has no session for is ignored; a session it has no close for is a gap in the line. */
  points: readonly { date: string; close: number | null }[];
}

/** A compared line, in the scale's units. */
export interface CompareLine {
  label: string;
  /** SVG dash pattern, so lines differ by more than colour. */
  dash: string;
  /** One value per valid session. */
  all: readonly (number | null)[];
  /** One value per drawn position. */
  values: readonly (number | null)[];
}

/** Replaces the drawn candles (Heikin Ashi). Used with `mode="heikin-ashi"`. */
export interface CandlestickTransform {
  /** Stable id. */
  id: string;
  /** Carried so the chart can find the engine: set by the module that built it, not by you. */
  engine?: TradingEngine;
  /** The word in the table heads and the readout ("Heikin Ashi"). */
  label: string;
  /** One transformed candle per source candle (same dates). */
  apply: (candles: readonly Candle[]) => Candle[];
  /** How a transformed price is printed for these sessions: exact decimals, never the currency's rounding. */
  format: (candles: readonly Candle[]) => (price: number) => string;
}

/** The log, percent and indexed axes and compare lines. */
export interface PriceScalesEngine {
  /** Carried so the chart can find the engine: set by the module that built it, not by you. */
  engine?: TradingEngine;
  /** The scale the prices allow (log needs prices above zero, percent and indexed a first close above zero) and the notes to print under the chart. A compared chart on a linear or log axis becomes percent. */
  resolve: (a: { scale: CandlestickScale; base: number; allPositive: boolean; compared: boolean; labels: CandlestickChartLabels | undefined }) => { scale: CandlestickScale; notes: readonly string[] };
  /** A price on the axis (increasing in the price). */
  transform: (scale: CandlestickScale, base: number) => (price: number) => number;
  /** Ticks for the domain `lo`..`hi` in the axis' units: positions, the covering domain and their text. */
  ticks: (scale: CandlestickScale, lo: number, hi: number, count: number, formatPrice: (price: number) => string) => { tickT: number[]; loT: number; hiT: number; text: string[] };
  /** A value in the axis' units as text ("+2.00%", "98.06"). */
  text: (scale: CandlestickScale, value: number) => string;
  /** The name of the scale for the summary and table heads. */
  name: (scale: CandlestickScale, labels: CandlestickChartLabels | undefined) => string;
  /** The compared lines over the sessions, level with the price on their first shared date. `ends` is the last session of each drawn position. */
  compare: (series: readonly CompareSeries[], sessions: readonly { date: string; close: number }[], ends: readonly number[], scale: CandlestickScale) => CompareLine[];
}

/** What a layer is given to place itself on the chart. */
export interface LayerContext {
  label: string;
  /** Every valid session, oldest first. */
  sessions: readonly { date: string; close: number }[];
  /** The drawn positions: the first and last session of each (more than one when sessions are grouped). */
  items: readonly { from: number; to: number }[];
  formatPrice: (price: number) => string;
  formatDate: (date: string) => string;
  /** The word for "none". */
  none: string;
  labels: CandlestickChartLabels | undefined;
  /** The y of a price in SVG px, or null when it is outside the price range shown. */
  yOf: (price: number) => number | null;
  /** The plot's left and right edges. */
  x0: number;
  x1: number;
  /** The y range of the price plot. */
  priceTop: number;
  priceBottom: number;
  /** The x of drawn position k. */
  cx: (k: number) => number;
  /** The y where this layer's own `height` begins (below the price, volume and panes). */
  top: number;
}

/** What a layer adds. */
export interface LayerModel {
  /** Room it needs between the panes and the date axis, in px. Default 0. */
  height?: number;
  /** Its drawing, inside the chart's SVG. `active` is the active position or null. */
  view?: (active: number | null) => ReactNode;
  /** Positions Shift plus the arrow keys jump between. */
  jump?: readonly number[];
  /** Words added to the live region at position k. */
  speak?: (k: number) => readonly string[];
  /** Rows added to the readout at position k: [name, value]. */
  rows?: (k: number) => readonly (readonly [string, string])[];
  /** A sentence added to the spoken summary. */
  summary?: string;
  /** Extra hidden tables. */
  table?: ReactNode;
  /** Notes printed under the chart. */
  notes?: ReactNode;
  /** Words added to the keyboard hint. */
  hint?: string;
}

export interface CandlestickLayer {
  /** Stable id. */
  id: string;
  /** Carried so the chart can find the engine: set by the module that built it, not by you. */
  engine?: TradingEngine;
  /** Places the layer: reads the chart's geometry and returns its drawing, words, tables and notes. */
  build: (ctx: LayerContext) => LayerModel;
}

/** One entry of the legend over the chart. */
export interface LegendEntry {
  label: string;
  tone: string;
  dash: string;
}

/** A drawn position as the engine sees it. */
export interface TradingItem {
  /** The (possibly transformed, possibly grouped) candle. */
  candle: Candle;
  /** The real close of the last session in the position. */
  realClose: number;
  from: number;
  to: number;
}

/** What the chart hands the engine to build its model. */
export interface TradingArgs {
  label: string;
  valid: readonly { c: Candle }[];
  items: readonly TradingItem[];
  /** The candles as drawn, one per valid session (transformed when a transform applies). */
  drawn: readonly Candle[];
  scaleProp: CandlestickScale;
  scales: PriceScalesEngine | undefined;
  transform: CandlestickTransform | undefined;
  compare: readonly CompareSeries[];
  indicators: readonly ChartIndicator[];
  labels: CandlestickChartLabels | undefined;
  formatPrice: (price: number) => string;
  none: string;
  /** Colour tokens already used by moving averages. */
  toneOffset: number;
}

/** What the chart hands the engine once the geometry is known. */
export interface TradingPlaceArgs {
  layers: readonly CandlestickLayer[];
  formatDate: (date: string) => string;
  cx: (k: number) => number;
  /** The y of a value in the axis' units. */
  yOf: (t: number) => number;
  loT: number;
  hiT: number;
  top: number;
  plotH: number;
  x0: number;
  x1: number;
  body: number;
  /** The y where the price and volume end. */
  volBottom: number;
}

/** What the engine gives back for drawing and words. */
export interface TradingPlaced {
  /** Where the panes end (the crosshair's bottom). */
  paneBottom: number;
  /** Where everything but the date axis ends. */
  bottom: number;
  /** Drawn under the candles (bands). */
  below: ReactNode;
  /** Drawn over the candles (compared and indicator lines). */
  lines: ReactNode;
  /** Drawn last (layers, panes). */
  over: (active: number | null) => ReactNode;
  speak: (k: number) => string[];
  rows: (k: number) => (readonly [string, string])[];
  summary: string[];
  hint: string[];
  /** Shift plus the arrow keys jump between the layers' positions. Returns true when it handled the key. */
  onKey: (event: KeyboardEvent<HTMLElement>, index: number | null, count: number, moveTo: (index: number) => void) => boolean;
  notes: ReactNode;
  table: ReactNode;
}

/** What the engine computes before the geometry is known. */
export interface TradingModel {
  scale: CandlestickScale;
  /** A price on the axis. */
  T: (price: number) => number;
  /** How a (possibly transformed) price is printed. */
  fmt: (price: number) => string;
  /** The close as the axis prints it (percent, indexed or the price). */
  priceText: (close: number) => string;
  scaleName: string;
  /** Values in the axis' units the price domain must include (overlays, compared lines). */
  points: readonly number[];
  /** Ticks from the scales engine, or null for the plain linear ones. */
  ticks: (lo: number, hi: number, count: number) => { tickT: number[]; loT: number; hiT: number; text: string[] } | null;
  legend: (movingAverages: LegendEntry[], mainLabel: string) => LegendEntry[];
  /** Table columns beyond the six every table has. */
  columns: readonly { head: string; get: (v: number) => string }[];
  place: (b: TradingPlaceArgs) => TradingPlaced;
}

export interface TradingEngine {
  model: (a: TradingArgs) => TradingModel;
}
