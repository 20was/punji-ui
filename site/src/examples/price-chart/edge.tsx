import { PriceChart } from '@punji/ui/financial';
import { Stack } from '@punji/ui/stack';

const fmt = (value: number) => `Rs ${value.toFixed(2)}`;

// One real value, and a series with nothing in it. Neither invents a line.
export default function Example() {
  return (
    <Stack>
      <PriceChart label="One observation" points={[{ label: '14 Nov', value: 487.5 }]} formatValue={fmt} />
      <PriceChart
        label="Nothing published"
        points={[
          { label: '13 Nov', value: null },
          { label: '14 Nov', value: null },
        ]}
        formatValue={fmt}
      />
    </Stack>
  );
}
