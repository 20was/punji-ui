import { Stack } from '@punji/ui/stack';
import { useState } from 'react';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { OrderTicket, type OrderTicketOrder } from '@punji/ui/order-ticket';

// Prices are paisa: 51_230n is Rs 512.30. The band is ±10% of the previous close; NEPSE trades in lots of 10, tick Rs 0.10.
export default function Example() {
  const [placed, setPlaced] = useState<OrderTicketOrder | null>(null);
  return (
    <Stack className="ex-narrow">
      <OrderTicket
        symbol="NABIL"
        ltp={51_230n}
        previousClose={50_800n}
        bandRate="0.10"
        lotSize={10n}
        defaultQuantity={100n}
        defaultPrice={51_230n}
        onSubmit={setPlaced}
      />
      <p className="doc-muted" role="status">
        {placed ? `Sent: ${placed.side} ${placed.quantity} ${placed.symbol}, total ${formatMoney(placed.estimate.total, nepalMoneyConfig())}` : 'Nothing sent yet.'}
      </p>
    </Stack>
  );
}
