import { useState } from 'react';
import { FinancialPeriodSelector, nepalFiscalYearPeriods } from '@punji/ui/period-selector';

// FY 2083/84 ends on the last day of Asar 2084, a month with no official publication yet.
const periods = nepalFiscalYearPeriods(2082, 2083);

export default function Example() {
  const [value, setValue] = useState('fy-2083');
  return <FinancialPeriodSelector periods={periods} value={value} onChange={(id) => setValue(id)} label="Reporting period" />;
}
