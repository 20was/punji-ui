import { useMemo } from 'react';
import { Card } from '@punji/ui/card';
import { lineBreakType } from '@punji/ui/line-break-type';
import { PriceOnlyChart } from '@punji/ui/price-only-chart';
import { sampleBars } from '../../sample.ts';

// Line Break: a close past the last line's end adds a line; turning round needs a close past the high or low of the last N
// lines (three by default). Fewer lines turns sooner.
const bars = sampleBars(160, 3);

export default function Example() {
  const three = useMemo(() => lineBreakType(), []);
  const two = useMemo(() => lineBreakType({ lines: 2 }), []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Three-line break">
        <PriceOnlyChart label="NABIL, three-line break" bars={bars} type={three} />
      </Card>
      <Card title="Two-line break" description="Turns sooner, so there are more lines.">
        <PriceOnlyChart label="NABIL, two-line break" bars={bars} type={two} height={220} />
      </Card>
    </div>
  );
}
