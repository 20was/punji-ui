/**
 * OrderBookDepth (design.punji.app/components/order-book): the best bids and
 * asks for one security, side by side, as the Punji site draws them. Each row
 * is one level: the quantity waiting to buy and its price on the left, the
 * price asked and its quantity on the right. A soft bar behind each quantity
 * shows its size against the largest quantity on the board; the figure itself
 * is always printed. Under the levels, the two sides' totals as one split bar
 * with their share and quantity in words.
 *
 * This is the depth view. `OrderBook` (`@punji/ui/financial`) is the plain,
 * caller-formatted table with no bars or totals; both stay.
 *
 * A table: the header names each column, so a screen reader hears "Buy
 * quantity 1,840, Bid 546.90, Ask 547.00, Sell quantity 1,210" per row. The
 * bars are decoration. An empty book (outside the session) is the caller's
 * empty state, never an empty table.
 */
import type { ReactNode } from 'react';

import { formatFigure } from '../format/format.ts';

export interface BookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookDepthLabels {
  /** The four column heads: buy quantity, bid, ask, sell quantity. */
  buyQty: string;
  bid: string;
  ask: string;
  sellQty: string;
  /** The table's name ("Order book for NABIL"). */
  caption: string;
  /** Under the split bar: one side's share and quantity, as the page words it ("Buy 58.0% · 41,210"). */
  buyTotal: (pct: string, qty: string) => string;
  sellTotal: (pct: string, qty: string) => string;
}

export function OrderBookDepth({ bids, asks, levels = 5, totals, labels, testId }: {
  /** Best first (highest bid first). */
  bids: readonly BookLevel[];
  /** Best first (lowest ask first). */
  asks: readonly BookLevel[];
  /** Rows drawn (the longer side decides, at most this many). */
  levels?: number;
  /** Each side's whole quantity, when published; else the drawn levels' sum. */
  totals?: { buy: number; sell: number } | null;
  labels: OrderBookDepthLabels;
  testId?: string;
}) {
  const n = Math.min(levels, Math.max(bids.length, asks.length));
  const shown = [...bids.slice(0, n), ...asks.slice(0, n)];
  const max = Math.max(1, ...shown.map((l) => l.quantity));
  const buy = totals?.buy ?? bids.slice(0, n).reduce((s, l) => s + l.quantity, 0);
  const sell = totals?.sell ?? asks.slice(0, n).reduce((s, l) => s + l.quantity, 0);
  const whole = buy + sell;
  const share = (v: number) => (whole > 0 ? (v / whole) * 100 : 0);
  const pct = (v: number) => formatFigure(share(v), 'pct', 1);
  const qty = (l: BookLevel | undefined, side: 'b' | 's'): ReactNode =>
    l ? (
      <>
        <i className={`kit-ob-bar ${side}`} style={{ width: `${((l.quantity / max) * 100).toFixed(1)}%` }} aria-hidden="true" />
        <span>{formatFigure(l.quantity, 'int')}</span>
      </>
    ) : null;
  return (
    <div className="kit-ob" data-testid={testId}>
      <table className="kit-ob-t">
        <caption className="kit-sr">{labels.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.buyQty}</th>
            <th scope="col" className="end">{labels.bid}</th>
            <th scope="col">{labels.ask}</th>
            <th scope="col" className="end">{labels.sellQty}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => {
            const b = bids[i];
            const s = asks[i];
            return (
              <tr key={i}>
                <td className="q b">{qty(b, 'b')}</td>
                <td className="p b">{b ? formatFigure(b.price) : null}</td>
                <td className="p s">{s ? formatFigure(s.price) : null}</td>
                <td className="q s">{qty(s, 's')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {whole > 0 && (
        <div className="kit-ob-tot">
          <span className="kit-ob-split" aria-hidden="true">
            <i className="b" style={{ width: `${share(buy)}%` }} />
            <i className="s" style={{ width: `${share(sell)}%` }} />
          </span>
          <p>
            <span>{labels.buyTotal(pct(buy), formatFigure(buy, 'int'))}</span>
            <span>{labels.sellTotal(pct(sell), formatFigure(sell, 'int'))}</span>
          </p>
        </div>
      )}
    </div>
  );
}
