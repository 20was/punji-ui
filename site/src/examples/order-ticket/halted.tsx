import { nepalMoneyConfig } from '@punji/ui/money';
import { OrderTicket } from '@punji/ui/order-ticket';

export default function Example() {
  return (
    <div className="ex-narrow">
      <OrderTicket
        symbol="NTC"
        ltp={88_000n}
        previousClose={88_000n}
        bandRate="0.10"
        lotSize={10n}
        defaultQuantity={50n}
        defaultPrice={88_000n}
        money={nepalMoneyConfig({ digits: 'deva' })}
        disabledReason="NEPSE is halted by the circuit breaker. Orders open again at 13:25."
        onSubmit={() => undefined}
      />
    </div>
  );
}
