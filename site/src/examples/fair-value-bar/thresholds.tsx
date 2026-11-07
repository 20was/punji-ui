import { FairValueBar } from '@punji/ui/fair-value-bar';
import { money } from '@punji/ui/money';

// Money works too, and the zones start where you say: 10% below, 30% above.
export default function Example() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <FairValueBar label="Overvalued" price={money(231_050n, 'NPR')} fairValue={money(150_000n, 'NPR')} thresholds={{ undervalued: 10, overvalued: 30 }} />
      <FairValueBar label="About fair" price="990.00" fairValue="1000.00" />
    </div>
  );
}
