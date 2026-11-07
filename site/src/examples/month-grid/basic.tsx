import { useState } from 'react';
import { MonthGrid, type MonthGridData } from '@punji/ui/month-grid';

// Percent return per month, index 0 is Baisakh on the BS calendar. null is a month with no figure (never zero).
const grid: MonthGridData = {
  calendar: 'bs',
  years: [
    { year: 2078, months: [3.2, -1.4, 6.8, 11.2, -4.1, 2.7, 0.4, -7.6, 5.1, 1.9, -2.3, 4.4], yearReturn: 18.6 },
    { year: 2079, months: [-2.8, -5.5, 1.1, 3.6, 8.9, -0.2, 2.4, 6.1, -3.7, 0.9, 4.8, -1.6], yearReturn: 12.3 },
    { year: 2080, months: [1.5, 2.2, -3.9, 7.4, 0.0, 5.6, -2.1, 3.3, 9.8, -4.6, 1.2, 2.9], yearReturn: 24.7 },
    { year: 2081, months: [4.1, -0.8, 2.6, -6.2, 3.9, 1.7, 5.3, -1.1, 0.6, 7.9, -3.4, 2.0], yearReturn: 16.9 },
    { year: 2082, months: [-1.9, 3.8, 5.2, 2.4, -2.7, 6.6, 0.3, null, null, null, null, null], yearReturn: null },
  ],
};

export default function Example() {
  const [month, setMonth] = useState<number | null>(null);
  return (
    <MonthGrid
      grid={grid}
      label="NEPSE return by month, Bikram Sambat calendar"
      selected={month}
      onSelect={setMonth}
      minYears={4}
      legend
      testId="mg"
    />
  );
}
