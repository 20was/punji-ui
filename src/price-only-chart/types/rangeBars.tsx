import { rangeBars, type RangeBarOptions } from '../../chart-math/priceOnly.ts';
import { Bricks, decimalsIn } from '../bricks.tsx';
import type { PriceOnlyType } from '../types.ts';

export interface RangeBarsTypeLabels {
  /** Default "Up bar". */
  up: string;
  /** Default "Down bar". */
  down: string;
  /** The opening price, or the word for it. */
  open: string;
  /** The highest price, or the word for it. */
  high: string;
  /** The lowest price, or the word for it. */
  low: string;
  /** The closing price, or the word for it. */
  close: string;
  /** The key's words for an up element. */
  keyUp: string;
  /** The key's words for a down element. */
  keyDown: string;
  /** Default "8 up bars and 5 down bars of range 2.00, from 2025-11-01 to 2025-12-20." */
  summary: (info: { up: number; down: number; range: string; from: string; to: string }) => string;
  /** The rule under the chart. */
  note: (info: { range: string }) => string;
}

const EN: RangeBarsTypeLabels = {
  up: 'Up bar',
  down: 'Down bar',
  open: 'Open',
  high: 'High',
  low: 'Low',
  close: 'Close',
  keyUp: 'Up bar, hollow (closed at the high)',
  keyDown: 'Down bar, solid (closed at the low)',
  summary: ({ up, down, range, from, to }) => `${up} up ${up === 1 ? 'bar' : 'bars'} and ${down} down ${down === 1 ? 'bar' : 'bars'} of range ${range}, from ${from} to ${to}.`,
  note: ({ range }) => `Every bar spans exactly ${range} from low to high; a bar closes when price moves a full range from its other end. The bar still forming is not drawn. Time is not drawn: the table gives the dates each bar covers.`,
};

export interface RangeBarsTypeOptions extends RangeBarOptions {
  /** Words in the reader's language. */
  labels?: Partial<RangeBarsTypeLabels>;
}

/**
 * Range bars for `PriceOnlyChart` (`type={rangeBarsType({ range: '2.50' })}`): bars of one fixed range built by `rangeBars`.
 *
 * @stability beta
 */
export function rangeBarsType(options: RangeBarsTypeOptions): PriceOnlyType {
  const L = { ...EN, ...options.labels };
  return {
    id: 'range-bars',
    label: 'Range bars',
    build: (bars) => {
      const list = rangeBars(bars, options);
      const up = list.filter((b) => b.direction === 'up').length;
      const elements = list.map((b, i) => ({
        key: String(i),
        direction: b.direction,
        directionWord: b.direction === 'up' ? L.up : L.down,
        low: Number(b.low),
        high: Number(b.high),
        fromDate: b.fromDate,
        toDate: b.toDate,
        cells: [b.open, b.high, b.low, b.close],
        rows: [[L.open, b.open], [L.high, b.high], [L.low, b.low], [L.close, b.close]] as const,
        speech: `${L.low} ${b.low}, ${L.high} ${b.high}`,
      }));
      return {
        elements,
        heads: [L.open, L.high, L.low, L.close],
        decimals: decimalsIn(options.range, ...list.flatMap((b) => [b.high, b.low])),
        summary: list.length ? L.summary({ up, down: list.length - up, range: options.range, from: list[0]!.fromDate, to: list[list.length - 1]!.toDate }) : '',
        note: L.note({ range: options.range }),
        keys: [{ key: 'up', className: 'brick up', label: L.keyUp }, { key: 'down', className: 'brick down', label: L.keyDown }],
        roleDescription: 'range bar chart',
        minSlot: 10,
        draw: (g) => <Bricks g={g} els={elements} />,
      };
    },
  };
}
