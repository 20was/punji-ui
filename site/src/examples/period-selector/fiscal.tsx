import { useState } from 'react';
import { FinancialPeriodSelector, nepalFiscalMonthPeriods, nepalFiscalQuarterPeriods, nepalFiscalYearPeriods } from '@punji/ui/period-selector';
import { periodSpec } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

const periods = [
  ...nepalFiscalYearPeriods(periodSpec.from, periodSpec.to),
  ...nepalFiscalQuarterPeriods(periodSpec.detailYear),
  ...nepalFiscalMonthPeriods(periodSpec.detailYear),
];

// Switching the kind keeps the same time span: a month moves to the year that contains it.
export default function Example() {
  const [value, setValue] = useState<string>(periodSpec.initial);
  return (
    <Stack>
      <FinancialPeriodSelector
        periods={periods}
        value={value}
        onChange={(id) => setValue(id)}
        label="Reporting period"
        kindLabels={{ year: 'Year', quarter: 'Quarter', month: 'Month' }}
      />
      <output>Selected: {value}</output>
    </Stack>
  );
}
