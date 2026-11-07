import type { PriceOnlyElement, PriceOnlyGeometry } from './types.ts';

/** The most decimals among decimal strings. */
export const decimalsIn = (...values: readonly string[]) => values.reduce((m, v) => Math.max(m, v.split('.')[1]?.length ?? 0), 0);

/**
 * Boxes from `low` to `high`, one per element (Renko bricks, Line Break lines, Range bars). Up is hollow with a
 * triangle pointing up and down is solid with a triangle pointing down, so direction survives without colour.
 */
export function Bricks({ g, els }: { g: PriceOnlyGeometry; els: readonly PriceOnlyElement[] }) {
  const w = Math.max(3, Math.min(g.slot * 0.8, 26));
  const out = [];
  for (let i = g.offset; i < g.offset + g.visible; i += 1) {
    const e = els[i]!;
    const top = g.y(e.high);
    const h = Math.max(2, g.y(e.low) - top);
    const x = g.cx(i);
    out.push(
      <g key={e.key} className={`pu-po-brick ${e.direction}${g.active === i ? ' active' : ''}`}>
        <rect x={x - w / 2} y={top} width={w} height={h} rx={1} />
        {h >= 14 && w >= 12 && (
          <text x={x} y={top + h / 2} textAnchor="middle" dominantBaseline="central">{e.direction === 'up' ? '▲' : '▼'}</text>
        )}
      </g>,
    );
  }
  return <g>{out}</g>;
}
