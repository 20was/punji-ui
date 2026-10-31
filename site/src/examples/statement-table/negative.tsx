import { StatementTable } from '@punji/ui/statement-table';
import { rollUp } from '@punji/ui/ledger';
import { incomeStatement, periods } from '../../sample.ts';

// negative="minus" prints -1,200.00 instead of (1,200.00). Bank charges for 2081/82 are missing: a dash, never zero.
export default function Example() {
  return <StatementTable caption="Income statement, minus signs (NPR)" periods={periods} rows={rollUp(incomeStatement)} negative="minus" />;
}
