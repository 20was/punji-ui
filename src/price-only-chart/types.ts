/**
 * The shapes a price-only chart type hands to `PriceOnlyChart`. A type (`renkoType`, `kagiType`, `pointFigureType`,
 * `lineBreakType`, `rangeBarsType`, each from its own subpath) builds its elements from the bars with the pure builders of
 * `@punji/ui/chart-price-only`, says what each one means in words, and draws them. The chart owns everything shared:
 * the figure, the one focus stop, the keyboard cursor, the axis, the readout, the live region and the hidden table.
 * A chart that imports one type ships only that type's builder and drawing.
 */
import type { ReactNode } from 'react';

import type { PriceBar } from '../chart-math/priceOnly.ts';

/** One drawn element (a brick, a line, a column, a bar) as the chart sees it. */
export interface PriceOnlyElement {
  /** Stable key. */
  key: string;
  /** Which way it points. */
  direction: 'up' | 'down';
  /** The words for its direction in the readout, the live region and the table ("Up brick", "X column, rising"). Never only a colour. */
  directionWord: string;
  /** Its lowest price on the axis (display only: the words come from the exact strings). */
  low: number;
  /** Its highest price on the axis. */
  high: number;
  /** The date of the first source bar it covers ("YYYY-MM-DD"). */
  fromDate: string;
  /** The date of the last source bar it covers ("YYYY-MM-DD"). */
  toDate: string;
  /** Table cells after the direction and the dates, one per `heads` entry. */
  cells: readonly string[];
  /** Name and value pairs for the readout under the pointer or cursor. */
  rows: readonly (readonly [string, string])[];
  /** What the live region adds after the position and dates ("from 100.00 to 105.00"). */
  speech: string;
}

/** Where a type may draw. Positions are element indexes; only `offset` to `offset + visible - 1` are on screen. */
export interface PriceOnlyGeometry {
  /** The plot's left and right edges in SVG px. */
  x0: number;
  /** The plot's right edge in SVG px. */
  x1: number;
  /** The width of one element's slot. */
  slot: number;
  /** The first element drawn, and how many. */
  offset: number;
  /** How many elements are drawn. */
  visible: number;
  /** The x of the centre of element `i`. */
  cx: (i: number) => number;
  /** The y of a price. */
  y: (price: number) => number;
  /** The y range of the plot. */
  top: number;
  /** The y of the bottom of the plot. */
  bottom: number;
  /** The active element or null. */
  active: number | null;
}

/** One entry of the key under the chart: a small sample drawn with the type's own classes, and its words. */
export interface PriceOnlyKey {
  /** Stable key. */
  key: string;
  /** Class of the sample `<i>`. */
  className: string;
  /** Its words. */
  label: string;
}

/** What a type builds from the bars. */
export interface PriceOnlyBuilt {
  /** One entry per drawn element, oldest first. */
  elements: readonly PriceOnlyElement[];
  /** Table heads after "Direction" and "Source dates". */
  heads: readonly string[];
  /** The most decimals any price has: the axis prints this many. */
  decimals: number;
  /** One sentence for the spoken summary ("12 up bricks and 7 down bricks of 5.00."). */
  summary: string;
  /** The rule in one line, printed under the chart ("Box 5.00. A reversal needs two boxes."). */
  note: string;
  /** The key to the shapes. */
  keys: readonly PriceOnlyKey[];
  /** Read after the chart's name ("Renko chart"). */
  roleDescription: string;
  /** The least width, in px, of one element's slot. Fewer fit: the chart shows the latest and says so. */
  minSlot: number;
  /** Draws the visible elements inside the chart's SVG. */
  draw: (g: PriceOnlyGeometry) => ReactNode;
}

/** A price-only chart type: the descriptor passed as `type`. */
export interface PriceOnlyType {
  /** Stable id ("renko"). */
  id: string;
  /** Its name in messages ("Renko"). */
  label: string;
  /** Builds the elements. Throws a `RangeError` on a bad price or option; the chart prints the message instead of a plot. */
  build: (bars: readonly PriceBar[]) => PriceOnlyBuilt;
}

/** Whole bars from an element's dates: "2025-11-04" alone, or "2025-11-04 to 2025-11-07". */
export const datesText = (from: string, to: string, word = 'to') => (from === to ? from : `${from} ${word} ${to}`);

/** Words the types share. */
export interface DirectionWords {
  up: string;
  down: string;
}
