import { useMemo } from 'react';
import { Card } from '@punji/ui/card';
import { PriceOnlyChart } from '@punji/ui/price-only-chart';
import { renkoType } from '@punji/ui/renko-type';
import { sampleBars } from '../../sample.ts';

// Renko: a brick of one box size each time price moves a box past the last brick, and a box beyond its open edge to turn.
// The box is fixed ("5") or an ATR ({ atr: 14 }, Wilder, rounded to the prices' decimals). Time is not drawn, so the table
// lists the source dates every brick covers. Hoist or memoize the type so the bricks are not rebuilt on every render.
const bars = sampleBars(160, 3);

export default function Example() {
  const fixed = useMemo(() => renkoType({ box: '5' }), []);
  const atr = useMemo(() => renkoType({ box: { atr: 14 } }), []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Box of 5.00" description="Hollow bricks with a triangle up rise; solid bricks with a triangle down fall.">
        <PriceOnlyChart label="NABIL, 5 rupee Renko" bars={bars} type={fixed} />
      </Card>
      <Card title="ATR box, 14 bars" description="The box is Wilder's average true range of the whole series.">
        <PriceOnlyChart label="NABIL, ATR Renko" bars={bars} type={atr} height={220} />
      </Card>
    </div>
  );
}
