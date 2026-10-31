import { CodeBlock } from '@punji/ui/code-block';
import { toCsv } from '@punji/ui/export';

const rows = [
  { date: '2082-07-01', symbol: 'NABIL', quantity: 100, amount: '124000.00' },
  { date: '2082-07-03', symbol: 'NTC', quantity: 50, amount: '61500.00' },
];

// The text is shown exactly as given. `copy` adds a Copy button for the whole text.
export default function Example() {
  const csv = toCsv(
    rows,
    [
      { header: 'Date', accessor: 'date' },
      { header: 'Symbol', accessor: 'symbol' },
      { header: 'Quantity', accessor: 'quantity' },
      { header: 'Amount', accessor: 'amount' },
    ],
    { crlf: false },
  );
  return (
    <CodeBlock label="transactions.csv" copy>
      {csv}
    </CodeBlock>
  );
}
