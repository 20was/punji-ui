import { PriceLimitIndicator } from '@punji/ui/price-limit';
import { circuit } from '../../sample.ts';

export default function Example() {
  return (
    <div className="ex-stack">
      <PriceLimitIndicator symbol="HDL" ltp={circuit.upper} previousClose={circuit.previousClose} lowerLimit={circuit.lower} upperLimit={circuit.upper} />
      <PriceLimitIndicator symbol="CHCL" ltp={circuit.lower} previousClose={circuit.previousClose} lowerLimit={circuit.lower} upperLimit={circuit.upper} />
      <PriceLimitIndicator symbol="STALE" ltp={54_000n} previousClose={circuit.previousClose} lowerLimit={circuit.lower} upperLimit={circuit.upper} />
    </div>
  );
}
