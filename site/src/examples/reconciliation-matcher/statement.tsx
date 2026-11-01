import { useState } from 'react';
import { ReconciliationMatcher, type ReconcileItem, type ReconcileMatch } from '@punji/ui/reconciliation-matcher';

// A month's bank statement against the bank account in the books. Accept the two suggestions, then tick the rent on
// the statement and both rent lines in the books (net of TDS, and the TDS adjustment) and match them: one to many.
// The deposit in transit, the unpresented cheque and the bank's charges stay as reconciling items. Invented amounts.
const d = (day: number) => ({ year: 2026, month: 10, day });
const statement: ReconcileItem[] = [
  { id: 's1', date: d(3), description: 'Deposit, Everest Stores', reference: 'RV-101', amount: 1_130_000n },
  { id: 's2', date: d(6), description: 'Cheque 000412 paid', reference: 'CHQ-412', amount: -250_000n },
  { id: 's3', date: d(8), description: 'Standing order, rent', amount: -13_500_000n },
  { id: 's4', date: d(28), description: 'SMS banking charge', amount: -22_600n },
  { id: 's5', date: d(30), description: 'Interest credited', amount: 120_000n },
];
const ledger: ReconcileItem[] = [
  { id: 'l1', date: d(2), description: 'Receipt, Everest Stores', reference: 'RV-101', amount: 1_130_000n },
  { id: 'l2', date: d(4), description: 'Stationery, cheque 412', reference: 'CHQ-412', amount: -250_000n },
  { id: 'l3', date: d(8), description: 'Office rent, net of TDS', amount: -13_000_000n },
  { id: 'l4', date: d(8), description: 'Office rent, TDS adjustment', amount: -500_000n },
  { id: 'l5', date: d(29), description: 'Cheque 418 to Kathmandu Dev Studio', reference: 'CHQ-418', amount: -400_000n },
  { id: 'l6', date: d(31), description: 'Receipt, Koshi Hospital (in transit)', amount: 2_000_000n },
];
const ledgerBalance = 50_000_000n;
const statementBalance = ledgerBalance - 2_000_000n + 400_000n - 22_600n + 120_000n;

export default function Example() {
  const [matches, setMatches] = useState<ReconcileMatch[]>([]);
  return (
    <ReconciliationMatcher
      statement={statement}
      ledger={ledger}
      matches={matches}
      onMatchesChange={setMatches}
      statementBalance={statementBalance}
      ledgerBalance={ledgerBalance}
    />
  );
}
