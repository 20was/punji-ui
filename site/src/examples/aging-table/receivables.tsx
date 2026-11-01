import { AgingTable } from '@punji/ui/aging-table';
import type { AgingItem } from '@punji/ui/tax';

// Outstanding invoices by customer, aged from their due dates to 15 Nov 2025. Not-due appears because one invoice is
// not yet due. The oldest bucket is bold, not only coloured. Parties and amounts are invented.
const items: AgingItem[] = [
  { id: 'INV-0101', party: 'Everest Stores', date: { year: 2025, month: 7, day: 20 }, amount: 4_250_000n },
  { id: 'INV-0133', party: 'Everest Stores', date: { year: 2025, month: 10, day: 2 }, amount: 1_830_000n },
  { id: 'INV-0127', party: 'Himal Traders', date: { year: 2025, month: 9, day: 10 }, amount: 2_640_000n },
  { id: 'INV-0141', party: 'Himal Traders', date: { year: 2025, month: 11, day: 25 }, amount: 960_000n },
  { id: 'INV-0118', party: 'Lumbini Mart', date: { year: 2025, month: 8, day: 28 }, amount: 3_115_000n },
  { id: 'INV-0139', party: 'Fewa Guest House', date: { year: 2025, month: 11, day: 1 }, amount: 742_500n },
];

export default function Example() {
  return <AgingTable caption="Receivables aging as of 29 Kartik 2082 (15 Nov 2025), NPR" items={items} asOf={{ year: 2025, month: 11, day: 15 }} />;
}
