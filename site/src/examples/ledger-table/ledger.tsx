import { LedgerTable } from '@punji/ui/ledger-table';
import { cashEntries, cashOpening } from '../../sample.ts';

// Oldest first, as given. The opening row, the period totals and the closing row are drawn for you.
export default function Example() {
  return <LedgerTable caption="Cash ledger, Shrawan 2081 (NPR)" entries={cashEntries} normal="debit" opening={cashOpening} />;
}
