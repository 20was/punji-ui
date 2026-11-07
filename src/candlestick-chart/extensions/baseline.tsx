import { clamp } from '../../internal/chartFrame.tsx';
import type { CandlestickLayer } from '../extensionTypes.ts';
import { candlestickTrading } from '../trading.tsx';

/**
 * The fill of `mode="baseline"` for `CandlestickChart` (`layers={[baselineLayer()]}`): the area between the close and a
 * dividing price, soft gain colour above it and soft loss colour below it, with the dashed dividing line and its price
 * printed. Without this layer `mode="baseline"` draws the close as a line. The side is also in the table and the
 * readout (up and down words), so the fill is never the only cue.
 *
 * @stability beta
 */
export function baselineLayer(options: { price?: number } = {}): CandlestickLayer {
  return {
    engine: candlestickTrading,
    id: 'baseline',
    build: (ctx) => {
      const first = ctx.sessions[0]!.close;
      const price = typeof options.price === 'number' && Number.isFinite(options.price) ? options.price : first;
      const yb = ctx.yOf(price);
      const yBase = clamp(yb ?? (price > first ? ctx.priceTop : ctx.priceBottom), ctx.priceTop, ctx.priceBottom);
      const pts = ctx.items.map((it, k) => ({ x: ctx.cx(k), y: ctx.yOf(ctx.sessions[it.to]!.close) ?? yBase }));
      const all: { x: number; y: number }[] = [];
      pts.forEach((p, i) => {
        all.push(p);
        const q = pts[i + 1];
        if (q && (p.y - yBase) * (q.y - yBase) < 0) all.push({ x: p.x + ((yBase - p.y) / (q.y - p.y)) * (q.x - p.x), y: yBase });
      });
      const area = (f: (y: number) => number) => (all.length < 2 ? '' : `M${all[0]!.x.toFixed(1)},${yBase.toFixed(1)} ${all.map((p) => `L${p.x.toFixed(1)},${f(p.y).toFixed(1)}`).join(' ')} L${all[all.length - 1]!.x.toFixed(1)},${yBase.toFixed(1)} Z`);
      return {
        view: () => (
          <g>
            <path className="pu-ct-fill gain" d={area((y) => Math.min(y, yBase))} />
            <path className="pu-ct-fill loss" d={area((y) => Math.max(y, yBase))} />
            <line className="pu-ct-baseline" x1={ctx.x0} x2={ctx.x1} y1={yBase} y2={yBase} />
            <text className="pu-ct-baseline-label" x={ctx.x0 + 4} y={yBase - 5}>{ctx.formatPrice(price)}</text>
          </g>
        ),
      };
    },
  };
}
