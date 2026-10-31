import { RangeBar } from '@punji/ui/meter';
import { Stack } from '@punji/ui/stack';

// Without `label` the mark labels are real text; with it the bar is one image and the labels are hidden.
export default function Example() {
  return (
    <Stack>
      <RangeBar
        head="52-week range, Rs 402 to Rs 612"
        domain={[402, 612]}
        fill={487.5}
        marks={[
          { value: 402, kind: 'edge', label: 'Rs 402' },
          { value: 487.5, kind: 'strong', label: 'Rs 487.50' },
          { value: 540, kind: 'accent', label: 'Alert 540' },
          { value: 612, kind: 'edge', label: 'Rs 612' },
        ]}
      />
      <RangeBar
        head="Month's low and high"
        domain={[402, 612]}
        span={[470, 505]}
        legend={['Rs 402', 'Rs 507', 'Rs 612']}
        label="This month traded between Rs 470 and Rs 505, inside a year range of Rs 402 to Rs 612"
      />
      <RangeBar
        head="Price to book among peers"
        domain={[0.8, 3.4]}
        marks={[
          { value: 1.4, kind: 'dot', label: 'Peer' },
          { value: 1.9, kind: 'tick', label: 'Median' },
          { value: 2.6, kind: 'strong', label: 'NABIL 2.6' },
        ]}
      />
    </Stack>
  );
}
