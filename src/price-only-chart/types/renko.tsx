import { renkoBricks, type RenkoOptions } from '../../chart-math/priceOnly.ts';
import { Bricks, decimalsIn } from '../bricks.tsx';
import type { PriceOnlyType } from '../types.ts';

export interface RenkoTypeLabels {
  /** Default "Up brick". */
  up: string;
  /** Default "Down brick". */
  down: string;
  /** The opening price, or the word for it. */
  open: string;
  /** The closing price, or the word for it. */
  close: string;
  /** The key under the chart. Default "Up brick, hollow" and "Down brick, solid". */
  keyUp: string;
  /** The key's words for a down element. */
  keyDown: string;
  /** Default "12 up bricks and 7 down bricks of 5.00, from 2025-11-01 to 2025-12-20." */
  summary: (info: { up: number; down: number; boxSize: string; from: string; to: string }) => string;
  /** The rule under the chart. Receives the ATR period when the box is an ATR. */
  note: (info: { boxSize: string; atr?: number }) => string;
}

const EN: RenkoTypeLabels = {
  up: 'Up brick',
  down: 'Down brick',
  open: 'Open',
  close: 'Close',
  keyUp: 'Up brick, hollow',
  keyDown: 'Down brick, solid',
  summary: ({ up, down, boxSize, from, to }) => `${up} up ${up === 1 ? 'brick' : 'bricks'} and ${down} down ${down === 1 ? 'brick' : 'bricks'} of ${boxSize}, from ${from} to ${to}.`,
  note: ({ boxSize, atr }) => `Each brick is ${boxSize}${atr ? ` (ATR of ${atr} bars)` : ''}. A new brick needs price one box beyond the last brick; turning round needs one box beyond its open edge. Time is not drawn: the table gives the dates each brick covers.`,
};

export interface RenkoTypeOptions extends RenkoOptions {
  /** Words in the reader's language. */
  labels?: Partial<RenkoTypeLabels>;
}

/**
 * Renko for `PriceOnlyChart` (`type={renkoType({ box: '5' })}`): bricks of one box size built by `renkoBricks` (box fixed or ATR,
 * close or high and low as the source). Hoist the descriptor or `useMemo` it, so the bricks are not rebuilt on every render.
 *
 * @stability beta
 */
export function renkoType(options: RenkoTypeOptions): PriceOnlyType {
  const L = { ...EN, ...options.labels };
  return {
    id: 'renko',
    label: 'Renko',
    build: (bars) => {
      const { boxSize, bricks } = renkoBricks(bars, options);
      const up = bricks.filter((b) => b.direction === 'up').length;
      const elements = bricks.map((b, i) => ({
        key: String(i),
        direction: b.direction,
        directionWord: b.direction === 'up' ? L.up : L.down,
        low: Math.min(Number(b.open), Number(b.close)),
        high: Math.max(Number(b.open), Number(b.close)),
        fromDate: b.fromDate,
        toDate: b.toDate,
        cells: [b.open, b.close],
        rows: [[L.open, b.open], [L.close, b.close]] as const,
        speech: `${L.open} ${b.open}, ${L.close} ${b.close}`,
      }));
      const atr = typeof options.box === 'object' ? options.box.atr : undefined;
      return {
        elements,
        heads: [L.open, L.close],
        decimals: decimalsIn(boxSize),
        summary: bricks.length ? L.summary({ up, down: bricks.length - up, boxSize, from: bricks[0]!.fromDate, to: bricks[bricks.length - 1]!.toDate }) : '',
        note: L.note({ boxSize, atr }),
        keys: [{ key: 'up', className: 'brick up', label: L.keyUp }, { key: 'down', className: 'brick down', label: L.keyDown }],
        roleDescription: 'Renko chart',
        minSlot: 10,
        draw: (g) => <Bricks g={g} els={elements} />,
      };
    },
  };
}
