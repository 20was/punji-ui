import { kagiLines, type KagiOptions } from '../../chart-math/priceOnly.ts';
import { decimalsIn } from '../bricks.tsx';
import type { PriceOnlyElement, PriceOnlyGeometry, PriceOnlyType } from '../types.ts';

export interface KagiTypeLabels {
  /** Default "Up line". */
  up: string;
  /** Default "Down line". */
  down: string;
  start: string;
  end: string;
  /** The table head of the thickness column. Default "Thickness". */
  thickness: string;
  /** Default "Yang, thick". */
  yang: string;
  /** Default "Yin, thin". */
  yin: string;
  /** A line that changes thickness. Default "Yin, thin, then yang, thick, from 105.00". */
  changes: (first: string, second: string, at: string) => string;
  /** Default "9 lines, 4 yang and 5 yin, from 2025-11-01 to 2025-12-20." */
  summary: (info: { lines: number; yang: number; yin: number; from: string; to: string }) => string;
  /** The rule under the chart. `reversal` is the amount or "4%". */
  note: (info: { reversal: string }) => string;
}

const EN: KagiTypeLabels = {
  up: 'Up line',
  down: 'Down line',
  start: 'Start',
  end: 'End',
  thickness: 'Thickness',
  yang: 'Yang, thick',
  yin: 'Yin, thin',
  changes: (first, second, at) => `${first}, then ${second.charAt(0).toLowerCase()}${second.slice(1)}, from ${at}`,
  summary: ({ lines, yang, yin, from, to }) => `${lines} ${lines === 1 ? 'line' : 'lines'}, ${yang} yang (thick) and ${yin} yin (thin) at their ends, from ${from} to ${to}.`,
  note: ({ reversal }) => `Lines follow closes and turn when price reverses by ${reversal}. A line turns thick (yang) when it passes the previous shoulder and thin (yin) when it passes the previous waist. Time is not drawn: the table gives the dates each line covers.`,
};

export interface KagiTypeOptions extends KagiOptions {
  labels?: Partial<KagiTypeLabels>;
}

function KagiView({ g, els, spans }: { g: PriceOnlyGeometry; els: readonly PriceOnlyElement[]; spans: readonly (readonly { from: number; to: number; yang: boolean }[])[] }) {
  const out = [];
  for (let i = g.offset; i < g.offset + g.visible; i += 1) {
    const x = g.cx(i);
    const e = els[i]!;
    const first = spans[i]![0]!;
    if (i > g.offset) out.push(<line key={`h${i}`} className="pu-po-kagi-join" x1={g.cx(i - 1)} x2={x} y1={g.y(first.from)} y2={g.y(first.from)} />);
    spans[i]!.forEach((s, k) => out.push(<line key={`${i}-${k}`} className={`pu-po-kagi ${s.yang ? 'yang' : 'yin'}${g.active === i ? ' active' : ''}`} x1={x} x2={x} y1={g.y(s.from)} y2={g.y(s.to)} data-direction={e.direction} />));
  }
  return <g>{out}</g>;
}

/**
 * Kagi for `PriceOnlyChart` (`type={kagiType({ reversal: '5' })}` or `{ reversal: { percent: '4' } }`): lines built by `kagiLines`. Thick (yang)
 * and thin (yin) differ by line width, and the table says which in words.
 *
 * @stability beta
 */
export function kagiType(options: KagiTypeOptions): PriceOnlyType {
  const L = { ...EN, ...options.labels };
  const word = (s: 'yang' | 'yin') => (s === 'yang' ? L.yang : L.yin);
  return {
    id: 'kagi',
    label: 'Kagi',
    build: (bars) => {
      const lines = kagiLines(bars, options);
      const spans = lines.map((l) => l.parts.map((p) => ({ from: Number(p.start), to: Number(p.end), yang: p.style === 'yang' })));
      const elements = lines.map((l, i) => {
        const thick = l.parts.length === 1 ? word(l.parts[0]!.style) : L.changes(word(l.parts[0]!.style), word(l.parts[1]!.style), l.parts[1]!.start);
        return {
          key: String(i),
          direction: l.direction,
          directionWord: l.direction === 'up' ? L.up : L.down,
          low: Math.min(Number(l.start), Number(l.end)),
          high: Math.max(Number(l.start), Number(l.end)),
          fromDate: l.fromDate,
          toDate: l.toDate,
          cells: [l.start, l.end, thick],
          rows: [[L.start, l.start], [L.end, l.end], [L.thickness, thick]] as const,
          speech: `${L.start} ${l.start}, ${L.end} ${l.end}, ${thick}`,
        };
      });
      const yang = lines.filter((l) => l.style === 'yang').length;
      const reversal = typeof options.reversal === 'string' ? options.reversal : `${options.reversal.percent}%`;
      return {
        elements,
        heads: [L.start, L.end, L.thickness],
        decimals: decimalsIn(...lines.flatMap((l) => [l.start, l.end])),
        summary: lines.length ? L.summary({ lines: lines.length, yang, yin: lines.length - yang, from: lines[0]!.fromDate, to: lines[lines.length - 1]!.toDate }) : '',
        note: L.note({ reversal }),
        keys: [{ key: 'yang', className: 'kagi yang', label: L.yang }, { key: 'yin', className: 'kagi yin', label: L.yin }],
        roleDescription: 'Kagi chart',
        minSlot: 12,
        draw: (g) => <KagiView g={g} els={elements} spans={spans} />,
      };
    },
  };
}
