import { MonthGrid, type MonthGridData } from '@punji/ui/month-grid';

// The Gregorian (AD) calendar: January to December heads. Months with too few sessions are passed as null and say why.
const grid: MonthGridData = {
  calendar: 'ad',
  years: [
    { year: 2024, months: [2.1, -3.0, 4.5, 1.2, -0.6, 3.3, 5.8, -2.4, 0.9, 6.1, -1.8, 2.6], yearReturn: 19.4 },
    { year: 2025, months: [-1.2, 2.9, null, 3.4, 7.2, -4.8, 1.6, 0.2, -2.5, 4.1, 3.0, null], yearReturn: null },
  ],
};

export default function Example() {
  return (
    <MonthGrid
      grid={grid}
      label="NEPSE return by month, Gregorian calendar"
      absent={(_year, month) => (month === 3 ? 'Under 10 sessions' : undefined)}
      averageNote="Appears once a month has 5 years of history"
    />
  );
}
