import { OrderTicket } from '@punji/ui/order-ticket';

// Published limits win over a derived band. costPerUnit is the WACC with fees, in paisa.
export default function Example() {
  return (
    <div className="ex-narrow">
      <OrderTicket
        symbol="NABIL"
        defaultSide="sell"
        ltp={60_000n}
        lowerLimit={54_000n}
        upperLimit={66_000n}
        lotSize={10n}
        defaultQuantity={100n}
        defaultPrice={60_000n}
        costPerUnit={51_407n}
        holdingDays={100}
        onSubmit={() => undefined}
      />
    </div>
  );
}
