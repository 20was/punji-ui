import { useState } from 'react';
import { FinancialPeriodSelector, type FinancialPeriod } from '@punji/ui/period-selector';

// Any list works; another jurisdiction passes its own calendar. One kind means no kind switch.
const periods: FinancialPeriod[] = [
  { id: 'cy-2024', kind: 'year', label: 'Calendar 2024', detail: '1 Jan 2024 – 31 Dec 2024', start: { year: 2024, month: 1, day: 1 }, end: { year: 2024, month: 12, day: 31 } },
  { id: 'cy-2025', kind: 'year', label: 'Calendar 2025', detail: '1 Jan 2025 – 31 Dec 2025', start: { year: 2025, month: 1, day: 1 }, end: { year: 2025, month: 12, day: 31 } },
];

export default function Example() {
  const [value, setValue] = useState('cy-2025');
  return <FinancialPeriodSelector periods={periods} value={value} onChange={(id) => setValue(id)} label="Accounting year" />;
}
