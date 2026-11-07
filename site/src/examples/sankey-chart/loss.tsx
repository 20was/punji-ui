import { money } from '@punji/ui/money';
import { incomeStatementFlow, SankeyChart } from '@punji/ui/sankey-chart';

const npr = (lakh: number) => money(BigInt(lakh) * 10_000_000n, 'NPR');

// Costs exceed revenue: the shortfall enters as a Net loss node, with a triangle and the word Loss.
const flow = incomeStatementFlow({
  revenue: [{ label: 'Sales', amount: npr(480) }],
  costOfRevenue: npr(350),
  operatingExpenses: [
    { label: 'Salaries', amount: npr(140) },
    { label: 'Rent and utilities', amount: npr(60) },
  ],
  tax: npr(0),
});

export default function Example() {
  return <SankeyChart label="Income statement of a loss-making year" nodes={flow.nodes} links={flow.links} base={flow.base} height={300} />;
}
