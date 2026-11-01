import { CodeBlock } from '@punji/ui/code-block';
import { TdsSummary } from '@punji/ui/tds-summary';
import { tdsToCsv, type TdsEntryInput } from '@punji/ui/tax';

// Entry by entry with each payee's PAN, and the same entries as exact, formula-safe CSV for the working behind a return.
const entries: TdsEntryInput[] = [
  { id: 't1', party: 'Ram Shrestha', pan: '123456789', category: 'House rent', gross: 5_000_000n, rate: '0.1' },
  { id: 't3', party: 'Sagarmatha Builders', pan: '301234567', category: 'Contract payment', gross: 42_000_000n, rate: '0.015' },
  { id: 't5', party: 'Bikash Rai', category: 'Service fee (individual)', gross: 1_500_000n, rate: '0.15' },
];

export default function Example() {
  return (
    <div className="ex-stack">
      <TdsSummary caption="TDS entries, Kartik 2082 (NPR)" entries={entries} view="entries" />
      <CodeBlock aria-label="TDS CSV">{tdsToCsv(entries, { rounding: 'half-up' })}</CodeBlock>
    </div>
  );
}
