import { isBalanced, journalImbalance, runningBalance, trialBalance } from '@punji/ui/ledger';
import { minorUnitsToDecimal } from '@punji/ui/nepal/money';
import { cashEntries, cashOpening, journals, unbalancedJournal } from '../../sample.ts';

const fmt = (v: bigint) => minorUnitsToDecimal(v);

// Pure functions over bigint minor units: no React, no rounding. Run them on the server too.
export default function Example() {
  const running = runningBalance(cashEntries, { normal: 'debit', opening: cashOpening });
  const tb = trialBalance(journals);
  return (
    <div className="ex-stack">
      <p>Closing cash: {fmt(running[running.length - 1]!.balance)}</p>
      <p>Trial balance of three journals: debits {fmt(tb.totals.debit)}, credits {fmt(tb.totals.credit)}, balanced {String(tb.balanced)}</p>
      <p>Draft journal balanced: {String(isBalanced(unbalancedJournal))} (imbalance {fmt(journalImbalance(unbalancedJournal))})</p>
    </div>
  );
}
