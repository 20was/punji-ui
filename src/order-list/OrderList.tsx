'use client';

/**
 * OrderList and TradeList: a terminal's order book (the person's own orders, with a status in words, the filled
 * share and Modify and Cancel for live orders) and trade book (their fills). Not the market depth: that is
 * `OrderBook`. Prices are bigint minor units. The lists only ask: `onCancel` and `onModify` request, you apply.
 * A change of status is announced politely ("NABIL buy 100: Filled").
 */
import { useEffect, useRef, useState } from 'react';

import { Button } from '../button/Button.tsx';
import { getMoneyFormatter, nepalMoneyConfig, type MoneyFormatConfig } from '../money/money.ts';
import { InlineConfirm } from '../inline-confirm/InlineConfirm.tsx';
import { StatusPill } from '../status-pill/StatusPill.tsx';
import { Cell, DataListRow, DataTable, type Column } from '../table/Table.tsx';
import { toDevanagari } from '../internal/digits.ts';

export type OrderStatus = 'pending' | 'open' | 'partially-filled' | 'filled' | 'cancelled' | 'rejected' | 'expired';

export interface TradingOrder {
  /** Stable order id from your broker. */
  id: string;
  /** The scrip. */
  symbol: string;
  /** Buy or sell. */
  side: 'buy' | 'sell';
  /** Units ordered. */
  quantity: bigint;
  /** Units filled so far. Default 0n. */
  filledQuantity?: bigint;
  /** Limit price, minor units. */
  price: bigint;
  /** Average fill price, minor units, when anything filled. */
  averagePrice?: bigint | null;
  /** Where the order stands; shown as a word in a pill. */
  status: OrderStatus;
  /** When it was placed, already formatted ("11:02:15" or a BS date). */
  time?: string;
  /** Why it was rejected or cancelled, in words. */
  reason?: string;
}

export interface TradeFill {
  /** Contract or match number. */
  id: string;
  /** The scrip. */
  symbol: string;
  /** Buy or sell. */
  side: 'buy' | 'sell';
  /** Units filled. */
  quantity: bigint;
  /** Fill price, minor units. */
  price: bigint;
  /** Already formatted. */
  time?: string;
  /** The other side's broker number, when known. */
  counterpartyBroker?: string;
}

const LIVE: ReadonlySet<OrderStatus> = new Set(['pending', 'open', 'partially-filled']);

/** Whether an order can still be modified or cancelled. */
export function isOrderLive(status: OrderStatus): boolean {
  return LIVE.has(status);
}

/** The pill tone for a status. Words carry the meaning; the tone is extra. */
export function orderStatusTone(status: OrderStatus): 'gain' | 'loss' | 'warn' | 'accent' | 'highlight' | 'info' | undefined {
  switch (status) {
    case 'pending': return 'info';
    case 'open': return 'accent';
    case 'partially-filled': return 'highlight';
    case 'filled': return 'gain';
    case 'rejected': return 'loss';
    default: return undefined;
  }
}

export interface OrderListLabels {
  caption: string;
  time: string; symbol: string; quantity: string; price: string; status: string; actions: string;
  buy: string; sell: string;
  statuses: Record<OrderStatus, string>;
  /** "60 of 100". */
  filled: (filled: string, quantity: string) => string;
  averagePrice: (price: string) => string;
  modify: string; cancel: string;
  /** The accessible name of a row's buttons: "Cancel NABIL buy 100 at 512.30". */
  actionName: (action: string, order: { symbol: string; side: string; quantity: string; price: string }) => string;
  confirmTitle: (symbol: string) => string;
  confirmCancel: string; keep: string;
  empty: string;
  /** Announced when a status changes. */
  changed: (order: { symbol: string; side: string; quantity: string }, status: string) => string;
}

const EN: OrderListLabels = {
  caption: 'Orders',
  time: 'Time', symbol: 'Symbol', quantity: 'Filled', price: 'Price', status: 'Status', actions: 'Actions',
  buy: 'Buy', sell: 'Sell',
  statuses: { pending: 'Pending', open: 'Open', 'partially-filled': 'Part filled', filled: 'Filled', cancelled: 'Cancelled', rejected: 'Rejected', expired: 'Expired' },
  filled: (filled, quantity) => `${filled} of ${quantity}`,
  averagePrice: (price) => `avg ${price}`,
  modify: 'Modify', cancel: 'Cancel',
  actionName: (action, o) => `${action} ${o.symbol} ${o.side.toLowerCase()} ${o.quantity} at ${o.price}`,
  confirmTitle: (symbol) => `Cancel this ${symbol} order?`,
  confirmCancel: 'Cancel order', keep: 'Keep it',
  empty: 'No orders today.',
  changed: (o, status) => `${o.symbol} ${o.side.toLowerCase()} ${o.quantity}: ${status}`,
};

export interface OrderListProps {
  /** Orders in the order you want them shown (newest first is usual). */
  orders: readonly TradingOrder[];
  /** Ask to cancel a live order. A confirm step comes first. */
  onCancel?: (order: TradingOrder) => void;
  /** Ask to modify a live order (open your ticket with its values). */
  onModify?: (order: TradingOrder) => void;
  /** Orders with a request in flight: their buttons are busy. */
  pendingIds?: readonly string[];
  /** Currency and locale of the prices. Default `nepalMoneyConfig()` without the currency mark. */
  money?: MoneyFormatConfig;
  /** Data is loading: headers stay, the body says so. */
  loading?: boolean;
  /** Words in the reader's language. Partial overrides of the English defaults. */
  labels?: Partial<Omit<OrderListLabels, 'statuses'>> & { statuses?: Partial<Record<OrderStatus, string>> };
  /** Under 640px each order becomes a block. Default true. */
  stack?: boolean;
  /** data-testid on the table; rows are `${testId}-${id}`. */
  testId?: string;
}

const deva = (on: boolean) => (on ? toDevanagari : (text: string) => text);

function SidePill({ side, words }: { side: 'buy' | 'sell'; words: { buy: string; sell: string } }) {
  return <StatusPill size="sm" tone={side === 'buy' ? 'gain' : 'loss'} className="pu-orders-side">{side === 'buy' ? words.buy : words.sell}</StatusPill>;
}

export function OrderList({ orders, onCancel, onModify, pendingIds = [], money, loading, labels, stack = true, testId }: OrderListProps) {
  const words: OrderListLabels = { ...EN, ...labels, statuses: { ...EN.statuses, ...labels?.statuses } };
  const config = money ?? nepalMoneyConfig();
  const prices = getMoneyFormatter({ ...config, display: 'none' });
  const count = deva(config.numberingSystem === 'deva');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const seen = useRef<Map<string, OrderStatus> | null>(null);
  const actions = Boolean(onCancel || onModify);
  const busy = new Set(pendingIds);

  useEffect(() => {
    const previous = seen.current;
    const next = new Map(orders.map((o) => [o.id, o.status]));
    seen.current = next;
    if (!previous) return;
    const changed = orders.filter((o) => previous.has(o.id) && previous.get(o.id) !== o.status);
    if (changed.length === 0) return;
    setAnnouncement(changed.map((o) => words.changed({ symbol: o.symbol, side: o.side === 'buy' ? words.buy : words.sell, quantity: count(o.quantity.toString()) }, words.statuses[o.status])).join('. '));
    // words and count are derived from props each render; only a change of orders should announce.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const columns: Column<string>[] = [
    { key: 'symbol', label: words.symbol },
    { key: 'time', label: words.time, wide: true },
    { key: 'quantity', label: words.quantity, num: true },
    { key: 'price', label: words.price, num: true },
    { key: 'status', label: words.status },
    ...(actions ? [{ key: 'actions', label: <span className="kit-sr">{words.actions}</span> }] : []),
  ];

  return (
    <div className="pu-orders">
      <DataTable caption={words.caption} columns={columns} stack={stack} loading={loading} empty={words.empty} testId={testId}>
        {orders.map((order) => {
          const filled = order.filledQuantity ?? 0n;
          const live = isOrderLive(order.status);
          const name = { symbol: order.symbol, side: order.side === 'buy' ? words.buy : words.sell, quantity: count(order.quantity.toString()), price: prices.format(order.price) };
          const inFlight = busy.has(order.id);
          return (
            <DataListRow key={order.id} testId={testId ? `${testId}-${order.id}` : undefined}>
              <Cell header sym>
                <b>{order.symbol}</b> <SidePill side={order.side} words={words} />
              </Cell>
              <Cell wide label={words.time}>{order.time ?? '—'}</Cell>
              <Cell num label={words.quantity}>
                <span className="pu-orders-fill">
                  {words.filled(count(filled.toString()), count(order.quantity.toString()))}
                  <meter className="pu-orders-meter" min={0} max={Number(order.quantity)} value={Number(filled < order.quantity ? filled : order.quantity)} aria-hidden="true" />
                </span>
              </Cell>
              <Cell num label={words.price}>
                {prices.format(order.price)}
                {order.averagePrice != null && filled > 0n && <span className="pu-orders-sub">{words.averagePrice(prices.format(order.averagePrice))}</span>}
              </Cell>
              <Cell label={words.status}>
                <StatusPill size="sm" tone={orderStatusTone(order.status)} dot={live}>{words.statuses[order.status]}</StatusPill>
                {order.reason && <span className="pu-orders-sub">{order.reason}</span>}
              </Cell>
              {actions && (
                <Cell label={words.actions}>
                  {confirming === order.id && onCancel ? (
                    <InlineConfirm
                      className="pu-orders-confirm"
                      title={words.confirmTitle(order.symbol)}
                      confirm={words.confirmCancel}
                      cancel={words.keep}
                      busy={inFlight}
                      onConfirm={() => { onCancel(order); setConfirming(null); }}
                      onCancel={() => setConfirming(null)}
                      confirmTestId={testId ? `${testId}-${order.id}-confirm` : undefined}
                    />
                  ) : live ? (
                    <span className="pu-orders-actions">
                      {onModify && <Button size="sm" variant="secondary" disabled={inFlight} aria-label={words.actionName(words.modify, name)} onClick={() => onModify(order)} testId={testId ? `${testId}-${order.id}-modify` : undefined}>{words.modify}</Button>}
                      {onCancel && <Button size="sm" variant="ghost" loading={inFlight} aria-label={words.actionName(words.cancel, name)} onClick={() => setConfirming(order.id)} testId={testId ? `${testId}-${order.id}-cancel` : undefined}>{words.cancel}</Button>}
                    </span>
                  ) : null}
                </Cell>
              )}
            </DataListRow>
          );
        })}
      </DataTable>
      <p className="kit-sr" role="status" aria-atomic="true">{announcement}</p>
    </div>
  );
}

export interface TradeListLabels {
  caption: string;
  time: string; symbol: string; quantity: string; price: string; amount: string; counterparty: string;
  buy: string; sell: string; total: string; bought: string; sold: string; empty: string;
}

const TRADE_EN: TradeListLabels = {
  caption: 'Trades', time: 'Time', symbol: 'Symbol', quantity: 'Quantity', price: 'Price', amount: 'Amount', counterparty: 'Broker',
  buy: 'Buy', sell: 'Sell', total: 'Total', bought: 'Bought', sold: 'Sold', empty: 'No trades today.',
};

export interface TradeListProps {
  /** Fills in the order you want them shown. */
  trades: readonly TradeFill[];
  /** Currency and locale. Default `nepalMoneyConfig()`. */
  money?: MoneyFormatConfig;
  /** Show a totals row (bought and sold amounts). Default true. */
  showTotals?: boolean;
  /** Data is loading: headers stay, the body says so. */
  loading?: boolean;
  /** Words in the reader's language. Partial overrides of the English defaults. */
  labels?: Partial<TradeListLabels>;
  /** Under 640px each trade becomes a block. Default true. */
  stack?: boolean;
  /** data-testid on the table; rows are `${testId}-${id}`. */
  testId?: string;
}

/** The trade book: each fill with its amount (quantity × price, exact). The totals row sums buys and sells separately. */
export function TradeList({ trades, money, showTotals = true, loading, labels, stack = true, testId }: TradeListProps) {
  const words = { ...TRADE_EN, ...labels };
  const config = money ?? nepalMoneyConfig();
  const amounts = getMoneyFormatter(config);
  const prices = getMoneyFormatter({ ...config, display: 'none' });
  const count = deva(config.numberingSystem === 'deva');
  const broker = trades.some((t) => t.counterpartyBroker);
  const columns: Column<string>[] = [
    { key: 'symbol', label: words.symbol },
    { key: 'time', label: words.time, wide: true },
    { key: 'quantity', label: words.quantity, num: true },
    { key: 'price', label: words.price, num: true },
    { key: 'amount', label: words.amount, num: true },
    ...(broker ? [{ key: 'broker', label: words.counterparty, wide: true }] : []),
  ];
  let bought = 0n;
  let sold = 0n;
  for (const t of trades) {
    if (t.side === 'buy') bought += t.quantity * t.price;
    else sold += t.quantity * t.price;
  }
  return (
    <DataTable
      caption={words.caption}
      columns={columns}
      stack={stack}
      loading={loading}
      empty={words.empty}
      testId={testId}
      footer={showTotals ? (
        <DataListRow>
          <Cell header>{words.total}</Cell>
          <Cell wide>{''}</Cell>
          <Cell num>{''}</Cell>
          <Cell num>{''}</Cell>
          <Cell num label={words.amount}>
            <span className="pu-trades-total"><span>{words.bought} {amounts.format(bought)}</span><span>{words.sold} {amounts.format(sold)}</span></span>
          </Cell>
          {broker && <Cell wide>{''}</Cell>}
        </DataListRow>
      ) : undefined}
    >
      {trades.map((t) => (
        <DataListRow key={t.id} testId={testId ? `${testId}-${t.id}` : undefined}>
          <Cell header sym><b>{t.symbol}</b> <SidePill side={t.side} words={words} /></Cell>
          <Cell wide label={words.time}>{t.time ?? '—'}</Cell>
          <Cell num label={words.quantity}>{count(t.quantity.toString())}</Cell>
          <Cell num label={words.price}>{prices.format(t.price)}</Cell>
          <Cell num label={words.amount}>{amounts.format(t.quantity * t.price)}</Cell>
          {broker && <Cell wide label={words.counterparty}>{t.counterpartyBroker ?? '—'}</Cell>}
        </DataListRow>
      ))}
    </DataTable>
  );
}
