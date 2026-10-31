import { isBalanced, journalImbalance, runningBalance, trialBalance } from '@punji/ui/ledger';
import { minorUnitsToDecimal } from '@punji/ui/nepal/money';
import { Card } from '@punji/ui/card';
import { DataRow, DataRows } from '@punji/ui/rows';
import { cashEntries, cashOpening, journals, unbalancedJournal } from '../../sample.ts';

const fmt = (v: bigint) => `Rs ${minorUnitsToDecimal(v)}`;

// Pure functions over bigint minor units: no React, no rounding. Run them on the server too.
export default function Example() {
  const running = runningBalance(cashEntries, { normal: 'debit', opening: cashOpening });
  const tb = trialBalance(journals);
  return (
    <Card title="Month-end checks" description="Run before the books are closed" headingLevel={3}>
      <DataRows label="Checks">
        <DataRow label="Closing cash" value={fmt(running[running.length - 1]!.balance)} />
        <DataRow label="Total debits" value={fmt(tb.totals.debit)} />
        <DataRow label="Total credits" value={fmt(tb.totals.credit)} />
        <DataRow label="Trial balance" value={tb.balanced ? 'Balanced' : 'Out of balance'} />
        <DataRow label="Draft journal" value={isBalanced(unbalancedJournal) ? 'Balanced' : `Out by ${fmt(journalImbalance(unbalancedJournal))}`} />
      </DataRows>
    </Card>
  );
}
