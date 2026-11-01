import { useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { DebitCredit } from '@punji/ui/debit-credit';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { JournalEntryView } from '@punji/ui/journal-entry';
import { LedgerTable } from '@punji/ui/ledger-table';
import { Select } from '@punji/ui/select';
import { ScreenTitle } from '../shared/kit.tsx';
import { addDays, compareDates, dayNumber, shortDate } from '../shared/books.ts';
import { ACCOUNTS, accountName, netByAccount, onNormal, rangeOf, type Account } from './books.ts';
import { PeriodBar } from './PeriodBar.tsx';
import { periodById, useAcct } from './store.ts';

const TYPES: Record<Account['type'], string> = { asset: 'Asset', liability: 'Liability', equity: 'Equity', income: 'Income', expense: 'Expense' };

/** The chart of accounts with balances, one account's general ledger for the period with its running balance, and
 *  any journal behind it. */
export default function LedgerScreen() {
  const { state, derived } = useAcct();
  const [code, setCode] = useState('1010');
  const [query, setQuery] = useState('');
  const period = periodById(state.periodId);
  const { from, to } = rangeOf(period);
  const account = ACCOUNTS.find((a) => a.code === code)!;
  const atEnd = netByAccount(derived.ledger, null, to);
  const before = netByAccount(derived.ledger, null, addDays(from, -1));
  const lo = dayNumber(from);
  const hi = dayNumber(to);
  const entries = derived.ledger.entries.filter((e, i) => e.account === code && derived.ledger.days[i]! >= lo && derived.ledger.days[i]! <= hi);
  const refs = [...new Set(entries.map((e) => e.reference ?? ''))].filter(Boolean).toReversed();
  const [journalId, setJournalId] = useState('');
  const journal = state.journals.find((j) => j.id === (refs.includes(journalId) ? journalId : refs[0]));
  const q = query.trim().toLowerCase();
  const rows = ACCOUNTS.filter((a) => !q || a.code.includes(q) || a.name.toLowerCase().includes(q) || a.type.includes(q));

  const columns: FinancialColumn<Account>[] = [
    {
      key: 'account', label: 'Account', rowHeader: true,
      render: (a) => (
        <button type="button" className="app-sym" aria-pressed={a.code === code} onClick={() => setCode(a.code)} data-testid={`ac-coa-${a.code}`}>
          <strong>{a.code} · {a.name}</strong>
          <span>{a.group}</span>
        </button>
      ),
    },
    { key: 'type', label: 'Type', render: (a) => TYPES[a.type], wide: true },
    { key: 'balance', label: `Balance at ${shortDate(to)}`, num: true, render: (a) => <DebitCredit value={atEnd.get(a.code) ?? 0n} /> },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle aside={<PeriodBar testId="ac-ledger-period" />}>Accounts and ledger</ScreenTitle>
      <div className="app-grid ac-ledger-grid">
        <Card title="Chart of accounts" description={`${ACCOUNTS.length} accounts. Choose one to see its ledger.`} headingLevel={3} flush>
          <FinancialTable
            caption="Chart of accounts"
            columns={columns}
            rows={rows}
            rowKey={(a) => a.code}
            emptyTitle="No account matches"
            emptyBody="Try a code such as 1010, or a word such as VAT."
            search={{ label: 'Find an account', value: query, onChange: setQuery, placeholder: 'Code or name' }}
          />
        </Card>
        <div className="app-stack">
          <Card title={accountName(code)} description={`General ledger, ${period.label}${compareDates(period.end!, to) > 0 ? ' to date' : ''}`} headingLevel={3} flush testId="ac-ledger-card">
            <LedgerTable
              caption={`${accountName(code)}, ${period.label}`}
              entries={entries}
              normal={account.normal}
              opening={onNormal(before, code)}
              formatDate={shortDate}
              maxHeight={440}
              bare
              emptyLabel="No postings to this account in the period."
              testId="ac-ledger"
            />
          </Card>
          <Card
            title="Journal"
            description="Every posting comes from a balanced journal"
            headingLevel={3}
            action={
              refs.length ? (
                <Select label="Journal" labelPlacement="hidden" size="sm" value={journal?.id ?? ''} onChange={setJournalId} options={refs.slice(0, 40).map((r) => ({ value: r, label: r }))} testId="ac-journal-pick" />
              ) : undefined
            }
          >
            {journal ? (
              <JournalEntryView journal={journal} renderAccount={accountName} formatDate={shortDate} headingLevel={4} bare testId="ac-journal-view" />
            ) : (
              <p className="app-muted">No journal in this period for this account.</p>
            )}
            <div className="ac-links">
              <Button size="sm" variant="ghost" onClick={() => setCode(code === '1010' ? '1100' : '1010')}>
                {code === '1010' ? 'Show receivables' : 'Show the bank account'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
