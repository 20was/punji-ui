import { ledgerToCsv } from '@punji/ui/ledger';
import { hostileEntries } from '../../sample.ts';

// An account that starts with = and a description that starts with @ are exported with a leading apostrophe,
// so a spreadsheet shows them as text instead of running them. Amounts are exact decimal text.
export default function Example() {
  const csv = ledgerToCsv(hostileEntries, { balance: true, normal: 'debit' });
  return <pre className="ex-pre" aria-label="Exported CSV">{csv}</pre>;
}
