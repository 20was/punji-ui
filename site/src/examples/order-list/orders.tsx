import { Stack } from '@punji/ui/stack';
import { useEffect, useState } from 'react';
import { Button } from '@punji/ui/button';
import { OrderList, type TradingOrder } from '@punji/ui/order-list';

const START: TradingOrder[] = [
  { id: 'o1', symbol: 'NABIL', side: 'buy', quantity: 100n, filledQuantity: 60n, price: 51_230n, averagePrice: 51_220n, status: 'partially-filled', time: '11:02:15' },
  { id: 'o2', symbol: 'NTC', side: 'sell', quantity: 50n, price: 88_000n, status: 'open', time: '11:05:40' },
  { id: 'o3', symbol: 'UPPER', side: 'buy', quantity: 200n, filledQuantity: 200n, price: 21_000n, averagePrice: 21_000n, status: 'filled', time: '11:10:02' },
  { id: 'o4', symbol: 'HDL', side: 'buy', quantity: 10n, price: 99_990n, status: 'rejected', reason: 'Above the upper circuit', time: '11:12:30' },
];

export default function Example() {
  const [orders, setOrders] = useState(START);
  const [pending, setPending] = useState<string[]>([]);
  const [fillSoon, setFillSoon] = useState(false);
  useEffect(() => {
    if (!fillSoon) return;
    const timer = setTimeout(() => {
      setOrders((list) => list.map((o) => (o.id === 'o2' && o.status === 'open' ? { ...o, status: 'filled', filledQuantity: o.quantity, averagePrice: o.price } : o)));
      setFillSoon(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [fillSoon]);
  return (
    <Stack>
      <OrderList
        orders={orders}
        pendingIds={pending}
        onModify={() => undefined}
        onCancel={(order) => {
          setPending((ids) => [...ids, order.id]);
          setTimeout(() => {
            setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
            setPending((ids) => ids.filter((id) => id !== order.id));
          }, 600);
        }}
      />
      <div>
        <Button variant="secondary" size="sm" onClick={() => setFillSoon(true)} disabled={fillSoon}>Fill the NTC order in 2 seconds</Button>
      </div>
    </Stack>
  );
}
