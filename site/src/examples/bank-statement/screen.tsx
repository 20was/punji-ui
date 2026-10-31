import { useMemo, useState } from 'react';
import { transactionsToCsv } from '@punji/ui/banking';
import { BankAccountCard } from '@punji/ui/bank-account-card';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { SegmentedControl } from '@punji/ui/controls';
import { downloadText } from '@punji/ui/download';
import { CSV_MIME } from '@punji/ui/export';
import { Field } from '@punji/ui/fields';
import { FinancialSummary } from '@punji/ui/financial';
import { MoneyDisplay } from '@punji/ui/money-display';
import { nepalMoneyConfig } from '@punji/ui/money';
import { TransactionList } from '@punji/ui/transaction-list';
import { accounts, transactions } from '../../sample.ts';
import './screen.css';

// A bank statement. The summary is computed from the entries (bigint paisa): money in, money out, and the opening and
// closing balances as the bank stated them. Filters and the AD/BS switch only change what the list shows; the CSV is
// exactly the rows on screen, with formula text neutralised.
const npr = nepalMoneyConfig();
// The fixture's formula-text row belongs to the CSV safety example; a statement screen would not show it.
const entries = transactions.filter((t) => !t.counterparty.startsWith('='));
const settled = entries.filter((t) => t.status === 'completed');
const moneyIn = settled.reduce((sum, t) => (t.amount > 0n ? sum + t.amount : sum), 0n);
const moneyOut = settled.reduce((sum, t) => (t.amount < 0n ? sum - t.amount : sum), 0n);
const oldest = entries.at(-1)!;
const opening = (oldest.balance ?? 0n) - oldest.amount;
const closing = entries[0]!.balance ?? null;

type Flow = 'all' | 'in' | 'out';
type Calendar = 'ad' | 'bs';

export default function Example() {
  const [flow, setFlow] = useState<Flow>('all');
  const [calendar, setCalendar] = useState<Calendar>('bs');
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (t) => (flow === 'all' || (flow === 'in' ? t.amount > 0n : t.amount < 0n)) && (!q || `${t.counterparty} ${t.reference} ${t.category ?? ''}`.toLowerCase().includes(q)),
    );
  }, [flow, query]);
  const csv = () => downloadText('statement-nov-2025.csv', transactionsToCsv(shown, { currency: 'NPR', balance: true }), CSV_MIME);

  return (
    <div className="sc-bs">
      <FinancialSummary
        label="Statement summary, 9 to 14 November 2025"
        metrics={[
          { id: 'opening', label: 'Opening balance', value: <MoneyDisplay value={opening} preset={npr} />, note: '9 Nov' },
          { id: 'in', label: 'Money in', value: <MoneyDisplay value={moneyIn} preset={npr} />, note: `${settled.filter((t) => t.amount > 0n).length} credits` },
          { id: 'out', label: 'Money out', value: <MoneyDisplay value={moneyOut} preset={npr} />, note: `${settled.filter((t) => t.amount < 0n).length} debits` },
          { id: 'closing', label: 'Closing balance', value: <MoneyDisplay value={closing} preset={npr} />, note: '14 Nov, as stated' },
        ]}
      />

      <div className="sc-bs-grid">
        <div className="sc-bs-side">
          <BankAccountCard
            {...accounts.savings}
            balanceToggle
            defaultBalanceHidden={false}
            headingLevel={3}
            actions={
              <Button size="sm" variant="secondary">
                Transfer
              </Button>
            }
          />
        </div>
        <Card
          title="Transactions"
          description="Savings account, 9 to 14 November 2025"
          headingLevel={3}
          action={
            <Button size="sm" variant="secondary" onClick={csv}>
              Download CSV
            </Button>
          }
        >
          <div className="sc-bs-stack">
            <div className="sc-bs-filters">
              <div className="sc-bs-search">
                <Field label="Search transactions" hideLabel size="md" placeholder="Search payee, reference or category" value={query} onChange={setQuery} />
              </div>
              <SegmentedControl<Flow>
                label="Direction"
                prefix="sc-bs-flow"
                size="sm"
                value={flow}
                onChange={setFlow}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'in', label: 'Money in' },
                  { value: 'out', label: 'Money out' },
                ]}
              />
              <SegmentedControl<Calendar>
                label="Dates"
                prefix="sc-bs-cal"
                size="sm"
                value={calendar}
                onChange={setCalendar}
                options={[
                  { value: 'bs', label: 'BS' },
                  { value: 'ad', label: 'AD' },
                ]}
              />
            </div>
            <TransactionList transactions={shown} calendar={calendar} showBalance />
          </div>
        </Card>
      </div>
    </div>
  );
}
