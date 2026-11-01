import { AmortisationTable } from '@punji/ui/amortisation-table';
import { amortise } from '@punji/ui/lending';

// 5 lakh at 11.5% for two years with NPR 50,000 prepaid after instalment 6. Switch between months and years.
const schedule = amortise({
  principal: 50_000_000n,
  ratePercent: '11.5',
  months: 24,
  rounding: 'half-up',
  prepayments: [{ period: 6, amount: 5_000_000n }],
});

export default function Example() {
  return <AmortisationTable schedule={schedule} footnote="Interest is charged monthly on the reducing balance." />;
}
