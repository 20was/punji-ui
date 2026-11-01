import { Card } from '@punji/ui/card';
import { amortise, calculateEmi, simulateDeposit } from '@punji/ui/lending';
import { formatMoney, nepalMoneyConfig } from '@punji/ui/money';
import { DataRow, DataRows } from '@punji/ui/rows';

// Pure functions, the same on a server. Amounts are paisa (bigint); every fraction is rounded with the mode you pass.
const npr = (minor: bigint) => formatMoney(minor, nepalMoneyConfig());
const emi = calculateEmi({ principal: 100_000_000n, ratePercent: '10', months: 120, rounding: 'half-up' });
const base = amortise({ principal: 200_000_000n, ratePercent: '12', months: 120, rounding: 'half-up' });
const prepaid = amortise({ principal: 200_000_000n, ratePercent: '12', months: 120, rounding: 'half-up', prepayments: [{ period: 12, amount: 50_000_000n }] });
const fd = simulateDeposit({ principal: 10_000_000n, months: 12, ratePercent: '10', compounding: 'quarterly', tdsPercent: '6', rounding: 'half-up' });

export default function Example() {
  return (
    <Card title="Loan and deposit maths" headingLevel={3}>
      <DataRows label="Results">
        <DataRow label="EMI: 10 lakh, 10%, 10 years" value={npr(emi)} />
        <DataRow label="Interest: 20 lakh, 12%, 10 years" value={npr(base.totalInterest)} />
        <DataRow label="Same, 5 lakh prepaid after a year" value={npr(prepaid.totalInterest)} />
        <DataRow label="Instalments after the prepayment" value={String(prepaid.periods)} />
        <DataRow label="FD 1 lakh, 10% quarterly, at maturity" value={npr(fd.maturity)} />
        <DataRow label="TDS at 6%" value={npr(fd.totalTds)} />
      </DataRows>
    </Card>
  );
}
