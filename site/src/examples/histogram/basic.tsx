import { useState } from 'react';
import { Histogram } from '@punji/ui/histogram';
import { RangeSlider } from '@punji/ui/range-slider';

// Stocks per price-to-book bucket, 0.5 wide from 0 to 6. The range keeps the buckets between the two handles.
const counts = [2, 6, 14, 22, 31, 24, 17, 11, 8, 5, 3, 2];
const edge = (i: number) => (i * 0.5).toFixed(1);
const bucketLabels = counts.map((_, i) => `${edge(i)} to ${edge(i + 1)}`);

export default function Example() {
  const [range, setRange] = useState<[number, number]>([1, 3.5]);
  const kept = counts.map((_, i) => i * 0.5 >= range[0] && (i + 1) * 0.5 <= range[1]);
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <Histogram
        counts={counts}
        kept={kept}
        label="Number of stocks by price-to-book ratio"
        bucketLabels={bucketLabels}
        countWord={(n) => `${n} stocks`}
        ticks={[{ at: 0, label: '0' }, { at: 4, label: '2' }, { at: 8, label: '4' }, { at: 12, label: '6' }]}
        testId="hist"
      />
      <RangeSlider
        min={0}
        max={6}
        step={0.5}
        lo={range[0]}
        hi={range[1]}
        onChange={(lo, hi) => setRange([lo, hi])}
        labelLo="Price to book minimum"
        labelHi="Price to book maximum"
        valueText={(v) => v.toFixed(1)}
        testId="hist-range"
      />
    </div>
  );
}
