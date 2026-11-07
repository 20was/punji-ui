import { money } from '@punji/ui/money';
import { incomeStatementFlow, SankeyChart } from '@punji/ui/sankey-chart';

const npr = (crore: number) => money(BigInt(Math.round(crore * 100)) * 10_000_000n, 'NPR');

// A year of a bank-sized income statement, in crore.
const flow = incomeStatementFlow({
  revenue: [
    { label: 'Interest income', amount: npr(820) },
    { label: 'Fees and commission', amount: npr(140) },
    { label: 'Treasury and other', amount: npr(60) },
  ],
  costOfRevenue: npr(430),
  operatingExpenses: [
    { label: 'Staff', amount: npr(150) },
    { label: 'Premises and technology', amount: npr(90) },
    { label: 'Provisions', amount: npr(60) },
  ],
  tax: npr(80),
});

export default function Example() {
  return <SankeyChart label="Income statement, FY 2025/26" nodes={flow.nodes} links={flow.links} base={flow.base} />;
}
