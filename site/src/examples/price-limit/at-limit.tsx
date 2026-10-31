import { PriceLimitIndicator } from '@punji/ui/price-limit';
import { circuit } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

export default function Example() {
  return (
    <Stack>
      <PriceLimitIndicator symbol="HDL" ltp={circuit.upper} previousClose={circuit.previousClose} lowerLimit={circuit.lower} upperLimit={circuit.upper} />
      <PriceLimitIndicator symbol="CHCL" ltp={circuit.lower} previousClose={circuit.previousClose} lowerLimit={circuit.lower} upperLimit={circuit.upper} />
      <PriceLimitIndicator symbol="STALE" ltp={54_000n} previousClose={circuit.previousClose} lowerLimit={circuit.lower} upperLimit={circuit.upper} />
    </Stack>
  );
}
