import { InterestRateTable } from '@punji/ui/interest-rate-table';
import { depositRates } from '../../sample.ts';

// Invented rates. Changes are compared exactly and read as words ("Down 0.25 points"), with an arrow.
export default function Example() {
  return <InterestRateTable caption="Deposit rates" description="Annual rates for individuals" rates={depositRates} />;
}
