import { useMemo } from 'react';
import { Card } from '@punji/ui/card';
import { kagiType } from '@punji/ui/kagi-type';
import { PriceOnlyChart } from '@punji/ui/price-only-chart';
import { sampleBars } from '../../sample.ts';

// Kagi: lines follow closes and turn when price reverses by the amount (fixed, or a percent of the line's end). A line is
// thick (yang) after it passes the previous shoulder and thin (yin) after it passes the previous waist; a line that
// changes thickness midway is drawn in two pieces and said so in the table.
const bars = sampleBars(160, 3);

export default function Example() {
  const fixed = useMemo(() => kagiType({ reversal: '8' }), []);
  const percent = useMemo(() => kagiType({ reversal: { percent: '1.5' } }), []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Reversal of 8.00" description="Thick lines are yang, thin lines are yin.">
        <PriceOnlyChart label="NABIL, Kagi, 8 rupee reversal" bars={bars} type={fixed} />
      </Card>
      <Card title="Reversal of 1.5 percent" description="The amount is a share of the line's end price, compared in exact integers.">
        <PriceOnlyChart label="NABIL, Kagi, 1.5 percent reversal" bars={bars} type={percent} height={220} />
      </Card>
    </div>
  );
}
