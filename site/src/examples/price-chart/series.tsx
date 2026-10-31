import { PriceChart } from '@punji/ui/financial';
import { priceSeries } from '../../sample.ts';

// 6 Nov has no value: the line breaks there and the data table says "Not published", never 0.
export default function Example() {
  return (
    <PriceChart
      label="NABIL closing price, 3 to 14 Nov"
      points={priceSeries}
      formatValue={(value) => `Rs ${value.toFixed(2)}`}
      dataLabel="Closing prices"
      missingLabel="Not published"
    />
  );
}
