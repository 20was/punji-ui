import { useMemo } from 'react';
import { Card } from '@punji/ui/card';
import { PriceOnlyChart } from '@punji/ui/price-only-chart';
import { pointFigureType } from '@punji/ui/point-figure-type';
import { sampleBars } from '../../sample.ts';

// Point and Figure: X columns rise, O columns fall, one mark per box. A column turns when price reverses by the reversal
// count of boxes (3 is the classic). Boxes are named by their lower edge. The second chart reads each bar's high and low.
const bars = sampleBars(160, 3);

export default function Example() {
  const close = useMemo(() => pointFigureType({ box: '3', reversal: 3 }), []);
  const highLow = useMemo(() => pointFigureType({ box: '2', reversal: 2, source: 'highlow' }), []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Box of 3.00, three-box reversal, closes" description="X (two strokes) rises, O (a ring) falls.">
        <PriceOnlyChart label="NABIL, Point and Figure" bars={bars} type={close} />
      </Card>
      <Card title="Box of 2.00, two-box reversal, from each bar's high and low">
        <PriceOnlyChart label="NABIL, Point and Figure, high and low" bars={bars} type={highLow} height={220} />
      </Card>
    </div>
  );
}
