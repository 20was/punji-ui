import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { AccountNumber } from '@punji/ui/account-number';
import type { BankTransaction } from '@punji/ui/banking';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { ChipRow, SegmentedControl } from '@punji/ui/controls';
import type { CsvColumn } from '@punji/ui/export';
import { rollUp, type StatementRow } from '@punji/ui/ledger';
import { ListFilter } from '@punji/ui/list-filter';
import { formatBSDate, gregorianToBS } from '@punji/ui/nepal/calendar';
import { Select } from '@punji/ui/select';
import { StatementTable } from '@punji/ui/statement-table';
import { TableExport } from '@punji/ui/table-export';
import { TransactionList } from '@punji/ui/transaction-list';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { Amount } from './Home.tsx';
import { ACCOUNTS, HOLDER, accountById, useBank, type AccountId } from './store.ts';

type Direction = 'all' | 'in' | 'out';
type Period = 'all' | 'month' | '30' | '90';
type Calendar = 'bs' | 'ad';

const AD_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parts = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return { year: y, month: m, day: d };
};
/** The calendar month an entry falls in, as a sortable key and a label, in BS or AD. */
function monthOf(iso: string, calendar: Calendar): { key: string; label: string } {
  if (calendar === 'ad') {
    const p = parts(iso);
    return { key: `${p.year}-${String(p.month).padStart(2, '0')}`, label: `${AD_MONTHS[p.month - 1]} ${p.year}` };
  }
  const bs = gregorianToBS(parts(iso));
  return { key: `${bs.year}-${String(bs.month).padStart(2, '0')}`, label: formatBSDate(bs).replace(/^\d+ /, '') };
}
const daysBefore = (iso: string, days: number) => {
  const p = parts(iso);
  const t = new Date(Date.UTC(p.year, p.month - 1, p.day - days));
  return t.toISOString().slice(0, 10);
};
const decimal = (paisa: bigint | null | undefined) => {
  if (paisa === null || paisa === undefined) return '';
  const abs = paisa < 0n ? -paisa : paisa;
  return `${paisa < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
};
const bsText = (iso: string) => formatBSDate(gregorianToBS(parts(iso)));

const CSV: CsvColumn<BankTransaction>[] = [
  { header: 'Date (AD)', accessor: 'date' },
  { header: 'Date (BS)', accessor: (t) => bsText(t.date) },
  { header: 'Description', accessor: 'counterparty' },
  { header: 'Reference', accessor: (t) => t.reference ?? '' },
  { header: 'Category', accessor: (t) => t.category ?? '' },
  { header: 'Status', accessor: 'status' },
  { header: 'Amount (NPR)', accessor: (t) => decimal(t.amount), keepNumericText: true },
  { header: 'Balance (NPR)', accessor: (t) => decimal(t.balance), keepNumericText: true },
];

/** Money in and out by category for the last three months, in the chosen calendar, rolled up exactly. */
function monthlySummary(entries: readonly BankTransaction[], calendar: Calendar) {
  const done = entries.filter((t) => t.status !== 'failed');
  const months = [...new Map(done.map((t) => [monthOf(t.date, calendar).key, monthOf(t.date, calendar).label])).entries()].toSorted((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-3);
  const keys = new Set(months.map(([k]) => k));
  const lines = (sign: 1 | -1) => {
    const byCat = new Map<string, Record<string, bigint>>();
    for (const t of done) {
      if ((sign === 1) !== t.amount > 0n) continue;
      const key = monthOf(t.date, calendar).key;
      if (!keys.has(key)) continue;
      const cat = t.category ?? 'Other';
      const row = byCat.get(cat) ?? {};
      row[key] = (row[key] ?? 0n) + (t.amount < 0n ? -t.amount : t.amount);
      byCat.set(cat, row);
    }
    return [...byCat.entries()].toSorted((a, b) => a[0].localeCompare(b[0])).map(([cat, values]) => ({ kind: 'line' as const, id: `${sign}-${cat}`, label: cat, values }));
  };
  const rows: StatementRow[] = rollUp(
    [
      {
        kind: 'section',
        id: 'net',
        label: 'Net flow',
        rows: [
          { kind: 'section', id: 'in', label: 'Money in', rows: lines(1), subtotal: { label: 'Total in' } },
          { kind: 'section', id: 'out', label: 'Money out', rows: lines(-1), subtotal: { label: 'Total out' }, effect: 'subtract' },
        ],
        subtotal: { label: 'Net flow', grand: true },
      },
    ],
    months.map(([k]) => k),
  );
  return { periods: months.map(([key, label]) => ({ key, label })), rows };
}

/** One account's statement: balance, search and filters, BS or AD dates, a monthly summary, CSV and a printable view. */
export default function AccountsScreen() {
  const { state, account: initialAccount } = useBank();
  const [account, setAccount] = useState<AccountId>(initialAccount);
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState<Direction>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [calendar, setCalendar] = useState<Calendar>('bs');
  const [page, setPage] = useState(1);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [printing, setPrinting] = useState(false);
  const loadKey = `${account}:${attempt}`;
  const loading = loadedFor !== loadKey;
  const failed = !loading && state.offline;

  // Fetching a statement takes a moment; offline it fails, with a retry.
  useEffect(() => {
    const id = setTimeout(() => setLoadedFor(loadKey), 450);
    return () => clearTimeout(id);
  }, [loadKey]);

  const all = state.statements[account];
  const meta = accountById(account);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const thisMonth = monthOf(SESSION_DATE, calendar).key;
    const since = period === '30' ? daysBefore(SESSION_DATE, 30) : period === '90' ? daysBefore(SESSION_DATE, 90) : null;
    return all.filter(
      (t) =>
        (direction === 'all' || (direction === 'in' ? t.amount > 0n : t.amount < 0n)) &&
        (period === 'all' || (period === 'month' ? monthOf(t.date, calendar).key === thisMonth : t.date >= since!)) &&
        (!q || `${t.counterparty} ${t.reference ?? ''} ${t.category ?? ''}`.toLowerCase().includes(q)),
    );
  }, [all, query, direction, period, calendar]);
  const summary = useMemo(() => monthlySummary(all, calendar), [all, calendar]);
  const pending = all.filter((t) => t.status === 'pending').reduce((s, t) => s + t.amount, 0n);
  const filtersOn = query !== '' || direction !== 'all' || period !== 'all';
  const inTotal = filtered.filter((t) => t.status !== 'failed' && t.amount > 0n).reduce((s, t) => s + t.amount, 0n);
  const outTotal = filtered.filter((t) => t.status !== 'failed' && t.amount < 0n).reduce((s, t) => s - t.amount, 0n);
  const reset = () => {
    setQuery('');
    setDirection('all');
    setPeriod('all');
    setPage(1);
  };

  return (
    <div className="app-stack rb-statement">
      <ScreenTitle>Accounts</ScreenTitle>
      <div className="rb-noprint">
        <SegmentedControl
          options={ACCOUNTS.map((a) => ({ value: a.id, label: a.name }))}
          value={account}
          onChange={(id) => {
            setAccount(id);
            setPage(1);
          }}
          prefix="rb-acct"
          label="Account"
          wrap
          testId="rb-acct"
        />
      </div>

      <div className="rb-print-head">
        <p>
          <strong>Punji Bank · Account statement</strong>
        </p>
        <p>
          {HOLDER} · {meta.name} · account ending {meta.number.slice(-4)} · printed 1 Nov 2026 (15 Kartik 2083)
        </p>
      </div>

      <Card title={meta.name} description={`${meta.type} account${meta.rate !== '0.00' ? ` · ${meta.rate}% a year` : ''}`} headingLevel={3} testId="rb-acct-summary">
        <dl className="rb-facts">
          <div>
            <dt>Balance</dt>
            <dd className="rb-facts-big">
              <Amount value={state.balances[account]} hidden={state.hideBalances} testId="rb-acct-balance" />
            </dd>
          </div>
          <div>
            <dt>Available</dt>
            <dd>
              <Amount value={state.balances[account]} hidden={state.hideBalances} />
              {pending !== 0n && <span className="app-muted app-small"> (pending card payments already held)</span>}
            </dd>
          </div>
          <div>
            <dt>Account number</dt>
            <dd>
              <AccountNumber value={meta.number} label={`${meta.name} account number`} copyable autoHideMs={15000} testId="rb-acct-number" />
            </dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Statement"
        description={loading || failed ? undefined : `${filtered.length} of ${all.length} entries`}
        headingLevel={3}
        action={
          <div className="rb-export rb-noprint">
            <TableExport columns={CSV} filename={(scope) => `statement-${account}-${SESSION_DATE}${scope === 'all' ? '-all' : ''}`} visibleRows={filtered} allRows={all} label="CSV" testIdPrefix="rb-csv" />
            <Button size="sm" variant="secondary" onClick={() => {
                // Render every entry (no pages), print, then go back to pages.
                flushSync(() => setPrinting(true));
                window.print();
                setPrinting(false);
              }} disabled={loading || failed || all.length === 0} testId="rb-print">
              Print or PDF
            </Button>
          </div>
        }
      >
        <div className="rb-filters rb-noprint">
          <ListFilter value={query} onChange={(v) => { setQuery(v); setPage(1); }} label="Search the statement" clear="Clear search" placeholder="Search name, reference, category" testId="rb-search" />
          <ChipRow
            options={[
              { value: 'all', label: 'All' },
              { value: 'in', label: 'Money in' },
              { value: 'out', label: 'Money out' },
            ]}
            value={direction}
            onChange={(v) => { setDirection(v); setPage(1); }}
            prefix="rb-dir"
            label="Direction"
            size="sm"
          />
          <div className="rb-filter-row">
            <Select
              label="Period"
              labelPlacement="inline"
              size="sm"
              value={period}
              onChange={(v) => { setPeriod(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'month', label: calendar === 'bs' ? 'This month (Kartik)' : 'This month (Nov)' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
              ]}
              testId="rb-period"
            />
            <SegmentedControl
              options={[
                { value: 'bs', label: 'BS' },
                { value: 'ad', label: 'AD' },
              ]}
              value={calendar}
              onChange={setCalendar}
              prefix="rb-cal"
              label="Dates in"
              size="sm"
              testId="rb-cal"
            />
          </div>
        </div>
        {!loading && !failed && filtered.length > 0 && (
          <p className="rb-totals app-small">
            In <Amount value={inTotal} hidden={state.hideBalances} /> · Out <Amount value={outTotal} hidden={state.hideBalances} />
          </p>
        )}
        <TransactionList
          transactions={filtered}
          calendar={calendar}
          showBalance={!state.hideBalances}
          pageSize={printing ? undefined : 10}
          page={page}
          onPageChange={setPage}
          loading={loading}
          error={failed}
          onRetry={() => setAttempt((n) => n + 1)}
          labels={{
            list: `${meta.name} statement`,
            empty: all.length === 0 ? 'No transactions yet' : 'Nothing matches',
            emptyBody: all.length === 0 ? 'Money you receive in this account will show here.' : 'Try another search or clear the filters.',
            error: 'Could not load the statement. You are offline.',
          }}
          testId="rb-statement"
        />
        {!loading && !failed && filtered.length === 0 && filtersOn && (
          <div className="rb-noprint">
            <Button size="sm" variant="secondary" onClick={reset}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {!loading && !failed && summary.periods.length > 0 && (
        <Card title="Monthly summary" description={`By ${calendar === 'bs' ? 'Bikram Sambat' : 'Gregorian'} month, failed entries left out`} headingLevel={3} flush>
          <StatementTable
            caption={`${meta.name}: money in and out (NPR)`}
            periods={summary.periods}
            rows={summary.rows}
            variance={summary.periods.length >= 2 ? { from: summary.periods.at(-2)!.key, to: summary.periods.at(-1)!.key } : undefined}
            bare
            testId="rb-summary"
          />
        </Card>
      )}
    </div>
  );
}
