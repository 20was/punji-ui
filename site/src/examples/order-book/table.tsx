import { OrderBook } from '@punji/ui/financial';
import { formatPrice, formatQuantity } from '@punji/ui/nepal/market-format';
import { orderBook } from '../../sample.ts';

export default function Example() {
  return (
    <OrderBook
      caption={`Order book for ${orderBook.symbol}`}
      bids={orderBook.bids}
      asks={orderBook.asks}
      labels={{ bidQuantity: 'Bid quantity', bid: 'Bid', ask: 'Ask', askQuantity: 'Ask quantity' }}
      formatPrice={(value) => formatPrice(value)}
      formatQuantity={(value) => formatQuantity(value)}
    />
  );
}
