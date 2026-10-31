import { PriceLimitIndicator, circuitLimits, limitPosition } from '@punji/ui/price-limit';

// No published limits: derive them from the previous close and a band rate.
// Each limit rounds toward the close. Many exchanges round to a tick, so prefer published figures.
const previousClose = 48_750n;
const { lower, upper } = circuitLimits(previousClose, '0.10');

export default function Example() {
  return (
    <div className="ex-stack">
      <PriceLimitIndicator symbol="NABIL" ltp={51_000n} previousClose={previousClose} bandRate="0.10" />
      <p className="ex-pre">{JSON.stringify({ lower: String(lower), upper: String(upper), ...limitPosition(51_000n, lower, upper) }, null, 1)}</p>
      <PriceLimitIndicator symbol="NO DATA" ltp={null} />
    </div>
  );
}
