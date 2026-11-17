import { lineBreak, type LineBreakOptions } from '../../chart-math/priceOnly.ts';
import { Bricks, decimalsIn } from '../bricks.tsx';
import type { PriceOnlyType } from '../types.ts';

export interface LineBreakTypeLabels {
  /** Default "Up line". */
  up: string;
  /** Default "Down line". */
  down: string;
  /** The opening price, or the word for it. */
  open: string;
  /** The closing price, or the word for it. */
  close: string;
  /** The key's words for an up element. */
  keyUp: string;
  /** The key's words for a down element. */
  keyDown: string;
  /** Default "5 up lines and 3 down lines, from 2025-11-01 to 2025-12-20." */
  summary: (info: { up: number; down: number; from: string; to: string }) => string;
  /** The rule under the chart. */
  note: (info: { lines: number }) => string;
}

const EN: LineBreakTypeLabels = {
  up: 'Up line',
  down: 'Down line',
  open: 'Open',
  close: 'Close',
  keyUp: 'Up line, hollow',
  keyDown: 'Down line, solid',
  summary: ({ up, down, from, to }) => `${up} up ${up === 1 ? 'line' : 'lines'} and ${down} down ${down === 1 ? 'line' : 'lines'}, from ${from} to ${to}.`,
  note: ({ lines }) => `A close past the last line adds a line; turning round needs a close past the high or low of the last ${lines} lines. Time is not drawn: the table gives the dates each line covers.`,
};

export interface LineBreakTypeOptions extends LineBreakOptions {
  /** Words in the reader's language. */
  labels?: Partial<LineBreakTypeLabels>;
}

/**
 * Line Break for `PriceOnlyChart` (`type={lineBreakType({ lines: 3 })}`): lines built by `lineBreak` (three-line break by default).
 *
 * @stability beta
 */
export function lineBreakType(options: LineBreakTypeOptions = {}): PriceOnlyType {
  const L = { ...EN, ...options.labels };
  return {
    id: 'line-break',
    label: 'Line Break',
    build: (bars) => {
      const lines = lineBreak(bars, options);
      const up = lines.filter((l) => l.direction === 'up').length;
      const elements = lines.map((l, i) => ({
        key: String(i),
        direction: l.direction,
        directionWord: l.direction === 'up' ? L.up : L.down,
        low: Math.min(Number(l.open), Number(l.close)),
        high: Math.max(Number(l.open), Number(l.close)),
        fromDate: l.fromDate,
        toDate: l.toDate,
        cells: [l.open, l.close],
        rows: [[L.open, l.open], [L.close, l.close]] as const,
        speech: `${L.open} ${l.open}, ${L.close} ${l.close}`,
      }));
      return {
        elements,
        heads: [L.open, L.close],
        decimals: decimalsIn(...lines.flatMap((l) => [l.open, l.close])),
        summary: lines.length ? L.summary({ up, down: lines.length - up, from: lines[0]!.fromDate, to: lines[lines.length - 1]!.toDate }) : '',
        note: L.note({ lines: options.lines ?? 3 }),
        keys: [{ key: 'up', className: 'brick up', label: L.keyUp }, { key: 'down', className: 'brick down', label: L.keyDown }],
        roleDescription: 'line break chart',
        minSlot: 10,
        draw: (g) => <Bricks g={g} els={elements} />,
      };
    },
  };
}
