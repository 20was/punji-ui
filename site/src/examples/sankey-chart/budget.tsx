import { money } from '@punji/ui/money';
import { SankeyChart } from '@punji/ui/sankey-chart';

const npr = (rupees: number) => money(BigInt(rupees) * 100n, 'NPR');

// Not an income statement: where a household's month went. Any acyclic nodes and links in one currency work.
export default function Example() {
  return (
    <SankeyChart
      label="Where the month's money went"
      base="income"
      nodes={[
        { id: 'salary', label: 'Salary', tone: 'nepse' },
        { id: 'rent', label: 'Rent income', tone: 'nepse' },
        { id: 'income', label: 'Income', tone: 'chart' },
        { id: 'home', label: 'Home', tone: 'series3' },
        { id: 'food', label: 'Food', tone: 'series3' },
        { id: 'saved', label: 'Saved', tone: 'gain' },
      ]}
      links={[
        { source: 'salary', target: 'income', amount: npr(95_000) },
        { source: 'rent', target: 'income', amount: npr(25_000) },
        { source: 'income', target: 'home', amount: npr(38_000) },
        { source: 'income', target: 'food', amount: npr(27_000) },
        { source: 'income', target: 'saved', amount: npr(55_000) },
      ]}
    />
  );
}
