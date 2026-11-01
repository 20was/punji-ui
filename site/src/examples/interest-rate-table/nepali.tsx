import { InterestRateTable } from '@punji/ui/interest-rate-table';
import { lendingRates } from '../../sample.ts';

// Effective dates in Bikram Sambat with Nepali month names and Devanagari digits.
export default function Example() {
  return (
    <InterestRateTable
      caption="कर्जाको ब्याजदर"
      rates={lendingRates}
      calendar="bs"
      language="ne"
      digits="deva"
      labels={{ product: 'कर्जा', rate: 'ब्याजदर (वार्षिक)', change: 'परिवर्तन', effective: 'लागू मिति', up: 'बढ्यो', down: 'घट्यो', same: 'परिवर्तन छैन', points: 'अंक' }}
    />
  );
}
