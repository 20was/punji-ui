import { FinancialSummary } from '@punji/ui/financial';

// A figure that is not available is a dash with a reason, never zero. Two metrics make a two-column grid.
export default function Example() {
  return (
    <FinancialSummary
      label="Invoice totals"
      metrics={[
        { id: 'due', label: 'Amount due', value: 'USD 1,240.00', note: 'Due 30 Nov 2026' },
        { id: 'paid', label: 'Paid', value: '—', note: 'No payments recorded' },
      ]}
    />
  );
}
