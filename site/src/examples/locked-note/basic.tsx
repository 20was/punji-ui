import { LockedNote } from '@punji/ui/locked-note';

// The locked state of a data view: a lock and what is not included on this account.
// Say what is missing and, if you can, how to get it. Never a plan's name, never a blurred fake of the data.
export default function Example() {
  return (
    <div className="ex-stack">
      <LockedNote title="Not included on this account">Broker activity is available to accounts with a market data subscription.</LockedNote>
      <LockedNote>Order book depth is not included on this account.</LockedNote>
    </div>
  );
}
