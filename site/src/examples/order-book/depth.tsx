import { OrderBookDepth } from '@punji/ui/order-book';
import { orderBook } from '../../sample.ts';

export default function Example() {
  return (
    <OrderBookDepth
      bids={orderBook.bids}
      asks={orderBook.asks}
      levels={5}
      labels={{
        buyQty: 'Buy quantity',
        bid: 'Bid',
        ask: 'Ask',
        sellQty: 'Sell quantity',
        caption: `Order book for ${orderBook.symbol}`,
        buyTotal: (pct, qty) => `Buy ${pct} · ${qty}`,
        sellTotal: (pct, qty) => `Sell ${pct} · ${qty}`,
      }}
    />
  );
}
