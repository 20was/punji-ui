import { pointAndFigure, type PointFigureOptions } from '../../chart-math/priceOnly.ts';
import { decimalsIn } from '../bricks.tsx';
import type { PriceOnlyElement, PriceOnlyGeometry, PriceOnlyType } from '../types.ts';

export interface PointFigureTypeLabels {
  /** Default "X column, rising". */
  x: string;
  /** Default "O column, falling". */
  o: string;
  /** How many boxes, or the word for it. */
  boxes: string;
  /** The lowest box, or the word for it. */
  lowest: string;
  /** The highest box, or the word for it. */
  highest: string;
  /** Default "X column, rising" and "O column, falling" in the key. */
  keyX: string;
  /** The key's words for an O column. */
  keyO: string;
  /** Default "5 columns, 3 X and 2 O, from 2025-11-01 to 2025-12-20." */
  summary: (info: { columns: number; x: number; o: number; from: string; to: string }) => string;
  /** The rule under the chart. */
  note: (info: { boxSize: string; reversal: number }) => string;
}

const EN: PointFigureTypeLabels = {
  x: 'X column, rising',
  o: 'O column, falling',
  boxes: 'Boxes',
  lowest: 'Lowest box',
  highest: 'Highest box',
  keyX: 'X column, rising',
  keyO: 'O column, falling',
  summary: ({ columns, x, o, from, to }) => `${columns} ${columns === 1 ? 'column' : 'columns'}, ${x} X and ${o} O, from ${from} to ${to}.`,
  note: ({ boxSize, reversal }) => `Each box is ${boxSize}. A column turns round when price reverses by ${reversal} ${reversal === 1 ? 'box' : 'boxes'}. Boxes are named by their lower edge. Time is not drawn: the table gives the dates each column covers.`,
};

export interface PointFigureTypeOptions extends PointFigureOptions {
  /** Words in the reader's language. */
  labels?: Partial<PointFigureTypeLabels>;
}

const MAX_MARKS = 600;

function ColumnsView({ g, els, box }: { g: PriceOnlyGeometry; els: readonly PriceOnlyElement[]; box: number }) {
  const px = Math.abs(g.y(0) - g.y(box));
  const r = Math.max(1.5, Math.min(px, g.slot) * 0.38);
  const out = [];
  for (let i = g.offset; i < g.offset + g.visible; i += 1) {
    const e = els[i]!;
    const x = g.cx(i);
    const isX = e.direction === 'up';
    const boxes = Math.round((e.high - e.low) / box);
    const cls = `pu-po-col ${isX ? 'x' : 'o'}${g.active === i ? ' active' : ''}`;
    if (px < 5 || boxes > MAX_MARKS) {
      // Too small for marks: a thick line for X, a dashed one for O, still different without colour.
      out.push(<line key={e.key} className={`${cls} thin`} x1={x} x2={x} y1={g.y(e.high)} y2={g.y(e.low)} />);
      continue;
    }
    const marks = [];
    for (let b = 0; b < boxes; b += 1) {
      const cy = g.y(e.low + (b + 0.5) * box);
      marks.push(
        isX ? (
          <path key={b} d={`M${x - r},${cy - r}L${x + r},${cy + r}M${x - r},${cy + r}L${x + r},${cy - r}`} />
        ) : (
          <circle key={b} cx={x} cy={cy} r={r} />
        ),
      );
    }
    out.push(<g key={e.key} className={cls}>{marks}</g>);
  }
  return <g>{out}</g>;
}

/**
 * Point and Figure for `PriceOnlyChart` (`type={pointFigureType({ box: '5', reversal: 3 })}`): X and O columns built by `pointAndFigure`.
 * X (two crossing strokes) and O (a ring) differ in shape, and the table says rising or falling in words.
 *
 * @stability beta
 */
export function pointFigureType(options: PointFigureTypeOptions): PriceOnlyType {
  const L = { ...EN, ...options.labels };
  return {
    id: 'point-figure',
    label: 'Point and Figure',
    build: (bars) => {
      const { boxSize, reversal, columns } = pointAndFigure(bars, options);
      const box = Number(boxSize);
      const elements = columns.map((c, i) => ({
        key: String(i),
        direction: c.direction === 'x' ? ('up' as const) : ('down' as const),
        directionWord: c.direction === 'x' ? L.x : L.o,
        low: Number(c.low),
        high: Number(c.high) + box,
        fromDate: c.fromDate,
        toDate: c.toDate,
        cells: [String(c.boxes), c.low, c.high],
        rows: [[L.boxes, String(c.boxes)], [L.lowest, c.low], [L.highest, c.high]] as const,
        speech: `${c.boxes} ${c.boxes === 1 ? 'box' : 'boxes'}, ${L.lowest} ${c.low}, ${L.highest} ${c.high}`,
      }));
      const x = columns.filter((c) => c.direction === 'x').length;
      return {
        elements,
        heads: [L.boxes, L.lowest, L.highest],
        decimals: decimalsIn(boxSize, ...columns.flatMap((c) => [c.low, c.high])),
        summary: columns.length ? L.summary({ columns: columns.length, x, o: columns.length - x, from: columns[0]!.fromDate, to: columns[columns.length - 1]!.toDate }) : '',
        note: L.note({ boxSize, reversal }),
        keys: [{ key: 'x', className: 'col x', label: L.keyX }, { key: 'o', className: 'col o', label: L.keyO }],
        roleDescription: 'point and figure chart',
        minSlot: 14,
        draw: (g) => <ColumnsView g={g} els={elements} box={box} />,
      };
    },
  };
}
