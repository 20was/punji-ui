import { useState } from 'react';
import { RangeSlider } from '@punji/ui/range-slider';
import { Stack } from '@punji/ui/stack';

// Two native range inputs on one track: arrows, Page Up/Down, Home/End work per thumb, and a thumb never passes the other.
export default function Example() {
  const [range, setRange] = useState<[number, number]>([2, 8]);
  return (
    <Stack>
      <RangeSlider
        min={0}
        max={12}
        step={0.5}
        lo={range[0]}
        hi={range[1]}
        onChange={(lo, hi) => setRange([lo, hi])}
        labelLo="Dividend yield minimum"
        labelHi="Dividend yield maximum"
        valueText={(v, which) => (which === 'lo' && v === 0 ? 'Any' : which === 'hi' && v === 12 ? 'Any' : `${v}%`)}
        testId="yield"
      />
      <p className="doc-muted">
        Yield from {range[0]}% to {range[1]}%
      </p>
    </Stack>
  );
}
