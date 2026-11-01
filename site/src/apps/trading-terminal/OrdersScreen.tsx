import { useState } from 'react';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { OrderList, isOrderLive } from '@punji/ui/order-list';
import { ScreenTitle } from '../shared/kit.tsx';
import { npr, useTerminal } from './store.ts';
import { Ticket } from './Ticket.tsx';

type Show = 'all' | 'open' | 'done';
const quoteMoney = { ...npr, display: 'none' as const };

/** The order book of the day beside a ticket: place, watch it fill in parts, modify or cancel while it is live. */
export default function OrdersScreen() {
  const { state, derived, dispatch } = useTerminal();
  const [show, setShow] = useState<Show>('all');
  const orders = state.orders.filter((o) => (show === 'open' ? isOrderLive(o.status) : show === 'done' ? !isOrderLive(o.status) : true));
  return (
    <div className="app-stack">
      <ScreenTitle>Orders</ScreenTitle>
      <div className="app-grid is-split is-reverse">
        <Card
          title="Today’s orders"
          description={`${derived.openOrders} live · ${state.orders.length} placed`}
          headingLevel={3}
          flush
          action={
            <SegmentedControl<Show>
              label="Show orders"
              prefix="tt-orders-show"
              size="sm"
              value={show}
              onChange={setShow}
              options={[
                { value: 'all', label: 'All' },
                { value: 'open', label: 'Live' },
                { value: 'done', label: 'Done' },
              ]}
            />
          }
        >
          <OrderList
            orders={orders}
            money={quoteMoney}
            onCancel={derived.halted ? undefined : (order) => dispatch({ type: 'cancel', id: order.id })}
            onModify={
              derived.halted
                ? undefined
                : (order) => {
                    dispatch({ type: 'cancel', id: order.id });
                    dispatch({ type: 'ticket', side: order.side, symbol: order.symbol, price: order.price, quantity: order.quantity - (order.filledQuantity ?? 0n) });
                  }
            }
            labels={{ empty: show === 'all' ? 'No orders yet today. Use the ticket to place one; it fills when the price reaches your limit.' : 'No orders in this view.' }}
            testId="tt-orders"
          />
        </Card>
        <Card title="New order" headingLevel={3}>
          <Ticket pickSymbol />
        </Card>
      </div>
    </div>
  );
}
