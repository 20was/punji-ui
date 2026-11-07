import { exactText, spreadLabels } from '../../chart-math/chartMath.ts';
import type { CandlestickLayer } from '../extensionTypes.ts';
import { candlestickTrading } from '../trading.tsx';

export type PriceLevelKind = 'support' | 'resistance' | 'cost-basis' | 'custom';

/** A horizontal reference line at a price. */
export interface PriceLevel {
  /** The price the line sits at, in the same units as the candles. */
  price: number;
  /** Printed on the line ("Support", "Your cost"). The price is added. */
  label: string;
  /** Sets the dash and the word in the table. Default 'custom'. */
  kind?: PriceLevelKind;
}

export interface LevelsLayerLabels {
  /** Names of the level kinds. Default Support, Resistance, Cost basis, Level. */
  kinds?: Partial<Record<PriceLevelKind, string>>;
  /** Table heads. Default Level, Kind, Price, From last close. */
  level?: string;
  kind?: string;
  price?: string;
  fromClose?: string;
  /** Caption suffix of the levels table. Default "Levels". */
  caption?: string;
  /** Under the chart. Default "N levels outside the price range shown are listed in the table." */
  outside?: (count: number) => string;
  /** Sentence in the spoken summary. */
  summary?: (levels: readonly PriceLevel[], formatPrice: (price: number) => string) => string;
}

const KINDS: Record<PriceLevelKind, string> = { support: 'Support', resistance: 'Resistance', 'cost-basis': 'Cost basis', custom: 'Level' };
const DASH: Record<PriceLevelKind, string> = { support: '6 3', resistance: '2 3', 'cost-basis': '8 3 2 3', custom: '4 4' };
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const signed = (v: number) => `${v > 0 ? '+' : ''}${exactText(v, 2, 2)}%`;

/**
 * Reference levels for `CandlestickChart` (`layers={[levelsLayer(levels)]}`): support, resistance and cost-basis
 * lines. The dash and the printed name tell the kind, labels are spread apart so none overlaps another, and a level
 * outside the price range shown is not drawn but stays in the hidden table (with its distance from the last close).
 *
 * @stability beta
 */
export function levelsLayer(levels: readonly PriceLevel[], options: { labels?: LevelsLayerLabels } = {}): CandlestickLayer {
  const L = options.labels;
  const kinds = { ...KINDS, ...L?.kinds };
  return {
    engine: candlestickTrading,
    id: 'levels',
    build: (ctx) => {
      const drawn = levels.flatMap((l) => {
        const y = finite(l.price) ? ctx.yOf(l.price) : null;
        return y === null ? [] : [{ l, y }];
      });
      const outside = levels.length - drawn.length;
      const labelY = spreadLabels(drawn.map((d) => d.y), 16, ctx.priceTop + 8, ctx.priceBottom - 8);
      const last = ctx.sessions[ctx.sessions.length - 1]!.close;
      return {
        summary: levels.length > 0 ? (L?.summary?.(levels, ctx.formatPrice) ?? `${levels.length} reference ${levels.length === 1 ? 'level' : 'levels'}: ${levels.map((l) => `${l.label} ${ctx.formatPrice(l.price)}`).join(', ')}.`) : undefined,
        notes: outside > 0 ? <p className="kit-ct-note">{(L?.outside ?? ((n: number) => `${n} ${n === 1 ? 'level' : 'levels'} outside the price range shown ${n === 1 ? 'is' : 'are'} listed in the table.`))(outside)}</p> : null,
        view: () => drawn.map(({ l, y }, n) => (
          <g key={n} className="pu-ct-level" data-kind={l.kind ?? 'custom'}>
            <line x1={ctx.x0} x2={ctx.x1} y1={y} y2={y} strokeDasharray={DASH[l.kind ?? 'custom']} />
            <text x={ctx.x1 - 6} y={labelY[n]!} textAnchor="end" dominantBaseline="middle">{`${l.label} ${ctx.formatPrice(l.price)}`}</text>
          </g>
        )),
        table: levels.length > 0 ? (
          <table>
            <caption>{`${ctx.label}: ${L?.caption ?? 'Levels'}`}</caption>
            <thead>
              <tr>
                <th scope="col">{L?.level ?? 'Level'}</th>
                <th scope="col">{L?.kind ?? 'Kind'}</th>
                <th scope="col">{L?.price ?? 'Price'}</th>
                <th scope="col">{L?.fromClose ?? 'From last close'}</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((l, n) => (
                <tr key={n}>
                  <th scope="row">{l.label}</th>
                  <td>{kinds[l.kind ?? 'custom']}</td>
                  <td>{finite(l.price) ? ctx.formatPrice(l.price) : ctx.none}</td>
                  <td>{finite(l.price) && last !== 0 ? signed(((l.price - last) / Math.abs(last)) * 100) : ctx.none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null,
      };
    },
  };
}
