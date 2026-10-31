import { DividendHistory } from '@punji/ui/dividend-history';
import type { DividendEntry } from '@punji/ui/portfolio';

// Without a market value or cost there are no yield columns. Entries are yours to value:
// the cash received, and what you count a bonus issue or rights issue as worth.
const entries: DividendEntry[] = [
  { id: 'a', date: '2025-08-27', symbol: 'NABIL', kind: 'cash', amount: 1_610_000n },
  { id: 'b', date: '2025-09-10', symbol: 'HDL', kind: 'cash', amount: 712_500n },
  { id: 'c', date: '2025-07-16', symbol: 'NICA', kind: 'cash', amount: 500_000n }, // 32 Ashadh 2082: still 2081/82
  { id: 'd', date: '2025-07-17', symbol: 'GBIME', kind: 'bonus', amount: 410_000n }, // 1 Shrawan 2082: 2082/83
];

export default function Example() {
  return <DividendHistory entries={entries} caption="Dividends" chart={false} />;
}
