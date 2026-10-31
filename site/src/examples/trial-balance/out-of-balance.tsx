import { TrialBalance } from '@punji/ui/trial-balance';
import { journals, unbalancedJournal } from '../../sample.ts';

// A draft journal that is 5.00 short: the status line says "Out of balance by 5.00" with a warning icon.
export default function Example() {
  return <TrialBalance caption="Trial balance with a draft entry (NPR)" data={[...journals, unbalancedJournal]} />;
}
