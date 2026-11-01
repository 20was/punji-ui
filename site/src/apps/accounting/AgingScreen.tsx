import { AgingTable } from '@punji/ui/aging-table';
import { Card } from '@punji/ui/card';
import { Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { TODAY, rs } from '../shared/books.ts';
import { onNormal } from './books.ts';
import { useAcct } from './store.ts';

const tie = (open: bigint, ledger: bigint, code: string) =>
  open === ledger ? (
    <Note quiet>✓ Agrees with account {code}: {rs(ledger)}.</Note>
  ) : (
    <Note tone="warn">Account {code} is {rs(ledger)}; open items total {rs(open)}. A journal posted to {code} has no invoice or bill behind it.</Note>
  );

/** Open invoices and bills by party, aged from their due dates to the session date, each tied back to its ledger
 *  account. */
export default function AgingScreen() {
  const { derived } = useAcct();
  const { receivables, payables, now } = derived;
  const ar = receivables.reduce((s, i) => s + i.total, 0n);
  const ap = payables.reduce((s, i) => s + i.total, 0n);
  const ledgerAr = onNormal(now, '1100');
  const ledgerAp = onNormal(now, '2000');
  return (
    <div className="app-stack">
      <ScreenTitle>Receivables and payables</ScreenTitle>
      <Card title="Receivables aging" description={`${receivables.length} open invoices, aged from their due dates to 15 Kartik 2083`} headingLevel={3}>
        <AgingTable caption="Receivables aging at 15 Kartik 2083 (1 Nov 2026), NPR" items={receivables} asOf={TODAY} bare emptyLabel="No open invoices." testId="ac-ar" />
        {tie(ar, ledgerAr, '1100')}
      </Card>
      <Card title="Payables aging" description={`${payables.length} open ${payables.length === 1 ? 'bill' : 'bills'}, aged from their due dates`} headingLevel={3}>
        <AgingTable caption="Payables aging at 15 Kartik 2083 (1 Nov 2026), NPR" items={payables} asOf={TODAY} bare emptyLabel="No open bills." testId="ac-ap" />
        {tie(ap, ledgerAp, '2000')}
      </Card>
    </div>
  );
}
