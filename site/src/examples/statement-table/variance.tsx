import { StatementTable } from '@punji/ui/statement-table';
import { rollUp } from '@punji/ui/ledger';
import { incomeStatement, periods } from '../../sample.ts';

// The table never adds a subtotal for you: rollUp() fills them in, exactly, before you pass the rows.
export default function Example() {
  return (
    <StatementTable
      caption="Income statement (NPR)"
      periods={periods}
      rows={rollUp(incomeStatement)}
      variance={{ from: '2080/81', to: '2081/82' }}
    />
  );
}
