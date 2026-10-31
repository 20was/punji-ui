import { PriceLimitIndicator } from '@punji/ui/price-limit';
import { circuit } from '../../sample.ts';

// The exchange's published limits are the authority: pass them when you have them.
export default function Example() {
  return (
    <div className="ex-stack">
      <PriceLimitIndicator
        symbol="NABIL"
        ltp={50_120n}
        previousClose={circuit.previousClose}
        lowerLimit={circuit.lower}
        upperLimit={circuit.upper}
      />
      <PriceLimitIndicator
        symbol="NTC"
        ltp={84_200n}
        previousClose={84_200n}
        lowerLimit={75_780n}
        upperLimit={92_620n}
        showFigures={false}
      />
    </div>
  );
}
