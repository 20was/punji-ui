import { MarketIndices } from '@punji/ui/market-indices';
import { getMarketSession, nepseSchedule } from '@punji/ui/market-status';
import { marketIndices, sampleNow } from '../../sample.ts';

// A strip for a page header, with the status derived from a schedule you keep current.
export default function Example() {
  const session = getMarketSession(sampleNow, nepseSchedule);
  return (
    <MarketIndices
      indices={marketIndices.slice(0, 3)}
      label="Market indices"
      variant="strip"
      session={session}
      showTrend={false}
      convention="red-up"
    />
  );
}
