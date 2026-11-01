import { TdsSummary } from '@punji/ui/tds-summary';
import type { TdsEntryInput } from '@punji/ui/tax';

// Withholding by category for a month. Categories and rates are your data (these are examples, not a rate table).
// The service fee shows a withheld amount entered by hand, used as given.
const entries: TdsEntryInput[] = [
  { id: 't1', party: 'Ram Shrestha', pan: '123456789', category: 'House rent', gross: 5_000_000n, rate: '0.1' },
  { id: 't2', party: 'Gita Tamang', pan: '123987654', category: 'House rent', gross: 3_500_000n, rate: '0.1' },
  { id: 't3', party: 'Sagarmatha Builders', pan: '301234567', category: 'Contract payment', gross: 42_000_000n, rate: '0.015' },
  { id: 't4', party: 'Koshi Consulting', pan: '609112233', category: 'Service fee', gross: 8_000_000n, rate: '0.015', withheld: 120_000n },
  { id: 't5', party: 'Bikash Rai', category: 'Service fee (individual)', gross: 1_500_000n, rate: '0.15' },
];

export default function Example() {
  return <TdsSummary caption="TDS for Kartik 2082 (NPR)" entries={entries} />;
}
