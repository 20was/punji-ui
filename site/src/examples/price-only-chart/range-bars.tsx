import { useMemo } from 'react';
import { Card } from '@punji/ui/card';
import { PriceOnlyChart } from '@punji/ui/price-only-chart';
import { rangeBarsType } from '@punji/ui/range-bars-type';
import { sampleBars } from '../../sample.ts';

// Range bars: every bar spans exactly the range from low to high, so a quiet week is one bar and a fast day several.
// A bar closes at its high (up) or its low (down); the bar still forming is not drawn.
const bars = sampleBars(160, 3);

export default function Example() {
  const six = useMemo(() => rangeBarsType({ range: '6' }), []);
  return (
    <Card title="Range of 6.00" description="Up bars are hollow and closed at the high; down bars are solid and closed at the low.">
      <PriceOnlyChart label="NABIL, 6 rupee range bars" bars={bars} type={six} />
    </Card>
  );
}
