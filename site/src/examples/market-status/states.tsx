import { MarketStatus, type MarketState } from '@punji/ui/market-status';

const states: MarketState[] = ['open', 'pre-open', 'closed', 'halted', 'holiday'];

// Each state has its own icon shape and its own word, so colour is never the only signal.
export default function Example() {
  return (
    <div className="ex-stack">
      <div className="ex-row">
        {states.map((state) => (
          <MarketStatus key={state} state={state} market="NEPSE" />
        ))}
      </div>
      <div className="ex-row">
        <MarketStatus state="holiday" detail="Dashain" market="NEPSE" />
        <MarketStatus state="pre-open" detail="Opens 11:00" market="NEPSE" size="sm" />
        <MarketStatus state="closed" labels={{ closed: 'बन्द' }} market="NEPSE" />
      </div>
    </div>
  );
}
