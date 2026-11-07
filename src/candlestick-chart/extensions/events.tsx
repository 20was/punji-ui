import { clamp } from '../../internal/chartFrame.tsx';
import type { CandlestickLayer } from '../extensionTypes.ts';
import { candlestickTrading } from '../trading.tsx';

export type PriceEventKind = 'dividend' | 'split' | 'earnings' | 'custom';

/** Something that happened on a date: drawn on the time axis, listed in a table, reachable with Shift plus the arrow keys. */
export interface PriceEvent {
  /** "YYYY-MM-DD". Placed on the session of that date, or the last session before it; outside the sessions shown it is listed in the table only. */
  date: string;
  /** Sets the marker's shape and letter: a circle for a dividend, a diamond for a split, a square for earnings, a triangle for your own. */
  kind: PriceEventKind;
  /** Short name ("Bonus 10%", "Q2 results"). */
  label: string;
  /** More words for the readout and the table ("Book closure 14 Nov"). */
  detail?: string;
}

export interface EventsLayerLabels {
  /** Names of the event kinds. Default Dividend, Split, Earnings, Event. */
  kinds?: Partial<Record<PriceEventKind, string>>;
  /** Table heads. Default Kind, Event, Detail. */
  kind?: string;
  event?: string;
  detail?: string;
  /** Caption suffix of the events table. Default "Events". */
  caption?: string;
  /** Under the chart. Default "N events outside the sessions shown are listed in the table." */
  outside?: (count: number) => string;
  /** Added to the keyboard hint. Default "Shift and the arrow keys jump between events." */
  hint?: string;
  /** Sentence in the spoken summary. Default "N events." */
  summary?: (count: number) => string;
}

const KINDS: Record<PriceEventKind, string> = { dividend: 'Dividend', split: 'Split', earnings: 'Earnings', custom: 'Event' };
const R = 7;
const H = 20;

/** The mark's letter: the first letter of the kind's word, upper case; a dot for your own events. */
const glyphOf = (word: string, kind: PriceEventKind) => (kind === 'custom' ? '•' : (word.trim()[0] ?? '•').toUpperCase());

/**
 * Event markers for `CandlestickChart` (`layers={[eventsLayer(events)]}`): dividends, splits, earnings and your own,
 * on the time axis. The shape (circle, diamond, square, triangle) and the letter tell the kind, so colour is not
 * needed. Each is a row of a hidden table and is spoken when the cursor lands on its session; Shift plus Left or Right
 * jumps between them. An event whose date is outside the sessions shown is only listed.
 *
 * @stability beta
 */
export function eventsLayer(events: readonly PriceEvent[], options: { labels?: EventsLayerLabels } = {}): CandlestickLayer {
  const L = options.labels;
  const kinds = { ...KINDS, ...L?.kinds };
  return {
    engine: candlestickTrading,
    id: 'events',
    build: (ctx) => {
      const { sessions, items, none } = ctx;
      const first = sessions[0]!.date;
      const last = sessions[sessions.length - 1]!.date;
      const placed = events.map((e, n) => {
        let at = -1;
        if (e.date >= first && e.date <= last) {
          let a = 0;
          let b = sessions.length - 1;
          while (a <= b) {
            const m = (a + b) >> 1;
            if (sessions[m]!.date <= e.date) {
              at = m;
              a = m + 1;
            } else b = m - 1;
          }
        }
        return { e, n, item: at < 0 ? -1 : items.findIndex((it) => it.from <= at && at <= it.to) };
      });
      const inRange = placed.filter((p) => p.item >= 0);
      const outside = placed.length - inRange.length;
      const height = inRange.length > 0 ? H : 0;
      const at = (k: number) => inRange.filter((p) => p.item === k).map((p) => p.e);
      const count = placed.length;
      return {
        height,
        jump: [...new Set(inRange.map((p) => p.item))].toSorted((p, q) => p - q),
        hint: inRange.length > 0 ? (L?.hint ?? 'Shift and the arrow keys jump between events.') : undefined,
        summary: count > 0 ? (L?.summary?.(count) ?? `${count} ${count === 1 ? 'event' : 'events'}.`) : undefined,
        speak: (k) => at(k).map((e) => `${kinds[e.kind]}: ${e.label}${e.detail ? `, ${e.detail}` : ''}`),
        rows: (k) => at(k).map((e) => [kinds[e.kind], e.label] as const),
        notes: outside > 0 ? <p className="kit-ct-note">{(L?.outside ?? ((n: number) => `${n} ${n === 1 ? 'event' : 'events'} outside the sessions shown ${n === 1 ? 'is' : 'are'} listed in the table.`))(outside)}</p> : null,
        view: (active) => inRange.map((p, j) => {
          const same = inRange.filter((q) => q.item === p.item);
          const x = clamp(ctx.cx(p.item) + (same.indexOf(p) - (same.length - 1) / 2) * 19, ctx.x0 + 8, ctx.x1 - 8);
          const y = ctx.top + 10;
          const kind = p.e.kind;
          return (
            <g key={`${p.n}-${j}`} className={`pu-ct-ev ${kind}${active === p.item ? ' active' : ''}`} data-kind={kind}>
              {kind === 'dividend' && <circle cx={x} cy={y} r={R} />}
              {kind === 'split' && <polygon points={`${x},${y - R - 1} ${x + R + 1},${y} ${x},${y + R + 1} ${x - R - 1},${y}`} />}
              {kind === 'earnings' && <rect x={x - R} y={y - R} width={R * 2} height={R * 2} rx={2} />}
              {kind === 'custom' && <polygon points={`${x},${y - R - 1} ${x + R + 1},${y + R} ${x - R - 1},${y + R}`} />}
              <text x={x} y={kind === 'custom' ? y + 3 : y} textAnchor="middle" dominantBaseline="central">{glyphOf(kinds[kind], kind)}</text>
            </g>
          );
        }),
        table: count > 0 ? (
          <table>
            <caption>{`${ctx.label}: ${L?.caption ?? 'Events'}`}</caption>
            <thead>
              <tr>
                <th scope="col">{ctx.labels?.date ?? 'Date'}</th>
                <th scope="col">{L?.kind ?? 'Kind'}</th>
                <th scope="col">{L?.event ?? 'Event'}</th>
                <th scope="col">{L?.detail ?? 'Detail'}</th>
              </tr>
            </thead>
            <tbody>
              {placed.map((p) => (
                <tr key={p.n}>
                  <th scope="row">{ctx.formatDate(p.e.date)}</th>
                  <td>{kinds[p.e.kind]}</td>
                  <td>{p.e.label}</td>
                  <td>{p.e.detail ?? none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null,
      };
    },
  };
}
