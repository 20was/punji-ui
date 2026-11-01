import { Card } from '@punji/ui/card';
import { allotUnits, projectLumpSum, projectSip, sipForGoal, termCoverNeeded, xirr } from '@punji/ui/invest';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';

// Pure functions, the same on a server. Amounts are paisa (bigint); every rounding is chosen by the caller.
const npr = (minor: bigint) => formatMoney(minor, nepalMoneyConfig());
const RS = 100n;
const LAKH = 1_00_000n * RS;
const rate = xirr([
  { date: '2008-01-01', amount: -10_000n * RS },
  { date: '2008-03-01', amount: 2_750n * RS },
  { date: '2008-10-30', amount: 4_250n * RS },
  { date: '2009-02-15', amount: 3_250n * RS },
  { date: '2009-04-01', amount: 2_750n * RS },
]);
const sip = projectSip({ monthly: 5_000n * RS, months: 120, annualReturnPercent: '12', rounding: 'half-even' });
const stepped = projectSip({ monthly: 5_000n * RS, months: 120, annualReturnPercent: '12', stepUpPercent: '10', roundTo: RS, rounding: 'half-even' });
const lump = projectLumpSum({ amount: sip.invested, months: 120, annualReturnPercent: '12', rounding: 'half-even' });
const goal = sipForGoal({ goal: 100n * LAKH, months: 180, annualReturnPercent: '12', roundTo: RS });
const units = allotUnits(5_000n * RS, '12.3456');
const cover = termCoverNeeded({ annualIncome: 12n * LAKH, years: 20, incomeSharePercent: '70', liabilities: 35n * LAKH, goals: 25n * LAKH, savings: 18n * LAKH, existingCover: 50n * LAKH, roundTo: LAKH });

export default function Example() {
  return (
    <Card title="Fund and cover maths" headingLevel={3}>
      <DataRows label="Results">
        <DataRow label="XIRR of the Excel example" value={rate ? `${rate.percent}%` : 'No rate'} />
        <DataRow label="SIP Rs 5,000 a month, 12%, 10 years" value={npr(sip.value)} />
        <DataRow label="Same with a 10% step-up each year" value={npr(stepped.value)} />
        <DataRow label={`${npr(sip.invested)} as a lump sum, same rate`} value={npr(lump.value)} />
        <DataRow label="SIP for Rs 1 crore in 15 years at 12%" value={`${npr(goal)} a month`} />
        <DataRow label="Rs 5,000 at NAV 12.3456" value={`${units.unitsText} units, ${npr(units.remainder)} left`} />
        <DataRow label="Term cover still needed" value={npr(cover.gap)} />
      </DataRows>
    </Card>
  );
}
