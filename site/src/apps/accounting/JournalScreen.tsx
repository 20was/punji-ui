import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { CurrencyInput } from '@punji/ui/currency-input';
import { Field } from '@punji/ui/fields';
import { JournalEntryView } from '@punji/ui/journal-entry';
import type { JournalEntry } from '@punji/ui/ledger';
import { MoneyDisplay } from '@punji/ui/money-display';
import { Select } from '@punji/ui/select';
import { EmptyState, Note } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { TODAY, compareDates, decimal, isoDate, npr, parseIsoDate, shortDate } from '../shared/books.ts';
import { ACCOUNTS, DATA_START, accountName } from './books.ts';
import { useAcct } from './store.ts';

interface Draft {
  key: number;
  account: string;
  debit: string;
  credit: string;
  dr: bigint | null;
  cr: bigint | null;
}
const blank = (key: number, account = ''): Draft => ({ key, account, debit: '', credit: '', dr: null, cr: null });
const OPTIONS = [{ value: '', label: 'Choose an account' }, ...ACCOUNTS.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }))];

/** A journal entry with a running balance check: two or more lines, each a debit or a credit, and the entry posts
 *  only when debits equal credits to the paisa. Posted journals move every report at once. */
export default function JournalScreen() {
  const { state, dispatch } = useAcct();
  const [date, setDate] = useState(isoDate(TODAY));
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<Draft[]>([blank(1, '5400'), blank(2, '1000')]);
  const [tried, setTried] = useState(false);
  const nextKey = useRef(3);
  const form = useRef<HTMLFormElement>(null);

  const debit = lines.reduce((s, l) => s + (l.dr ?? 0n), 0n);
  const credit = lines.reduce((s, l) => s + (l.cr ?? 0n), 0n);
  const difference = debit - credit;
  const parsed = parseIsoDate(date);
  const problems: string[] = [];
  if (!parsed) problems.push('Enter the date as YYYY-MM-DD.');
  else if (compareDates(parsed, DATA_START) < 0 || compareDates(parsed, TODAY) > 0) problems.push(`The date must be from ${shortDate(DATA_START)} to ${shortDate(TODAY)}.`);
  if (!memo.trim()) problems.push('Write a narration: what the entry is for.');
  const used = lines.filter((l) => l.account || l.dr || l.cr);
  if (used.length < 2) problems.push('A journal needs at least two lines.');
  used.forEach((l, i) => {
    if (!l.account) problems.push(`Line ${i + 1}: choose an account.`);
    if ((l.dr ?? 0n) > 0n && (l.cr ?? 0n) > 0n) problems.push(`Line ${i + 1}: a line is a debit or a credit, not both.`);
    if (!(l.dr ?? 0n) && !(l.cr ?? 0n)) problems.push(`Line ${i + 1}: enter a debit or a credit.`);
  });
  if (difference !== 0n) problems.push(`Debits and credits differ by ${decimal(difference < 0n ? -difference : difference)}.`);
  const journal: JournalEntry = {
    id: 'Draft',
    date: parsed ?? TODAY,
    memo: memo || 'New journal',
    lines: used.filter((l) => l.account).map((l) => ({ account: l.account, debit: l.dr ?? 0n, credit: l.cr ?? 0n })),
  };

  const update = (key: number, patch: Partial<Draft>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => {
    const key = nextKey.current++;
    setLines((all) => [...all, blank(key)]);
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-line="${key}"] button, [data-line="${key}"] select`)?.focus());
  };
  const fill = () => {
    const target = lines.toReversed().find((l) => !(l.dr ?? 0n) && !(l.cr ?? 0n)) ?? lines.at(-1)!;
    const others = lines.filter((l) => l.key !== target.key);
    const gap = others.reduce((s, l) => s + (l.dr ?? 0n) - (l.cr ?? 0n), 0n);
    if (gap === 0n) return;
    update(target.key, gap > 0n ? { debit: '', dr: null, credit: decimal(gap), cr: gap } : { credit: '', cr: null, debit: decimal(-gap), dr: -gap });
  };
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    setTried(true);
    if (problems.length) return;
    dispatch({ type: 'post', journal: { ...journal, id: '', memo: memo.trim() } });
    setMemo('');
    setLines([blank(nextKey.current++), blank(nextKey.current++)]);
    setTried(false);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit(event);
  };
  const posted = state.posted.map((id) => state.journals.find((j) => j.id === id)!).filter(Boolean).toReversed();

  return (
    <div className="app-stack">
      <ScreenTitle>Journal entry</ScreenTitle>
      <Card title="New journal" description="Tab through the fields; Ctrl+Enter or ⌘Enter posts. Amounts are exact to the paisa." headingLevel={3}>
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Ctrl+Enter from any field posts the journal */}
        <form ref={form} className="ac-journal-form" onSubmit={submit} onKeyDown={onKeyDown} noValidate aria-describedby={tried && problems.length ? 'ac-journal-problems' : undefined}>
          <div className="ac-journal-head">
            <Field label="Date (AD)" type="date" value={date} onChange={setDate} min={isoDate(DATA_START)} max={isoDate(TODAY)} size="md" testId="ac-journal-date" />
            <Field label="Narration" value={memo} onChange={setMemo} placeholder="What the entry is for" size="md" testId="ac-journal-memo" />
          </div>
          <div className="ac-journal-lines" role="group" aria-label="Journal lines">
            <div className="ac-journal-row is-head" aria-hidden="true">
              <span>Account</span>
              <span>Debit</span>
              <span>Credit</span>
              <span />
            </div>
            {lines.map((l, i) => (
              <div className="ac-journal-row" key={l.key} data-line={l.key}>
                <Select label={`Account, line ${i + 1}`} labelPlacement="hidden" size="md" value={l.account} onChange={(v) => update(l.key, { account: v })} options={OPTIONS} block testId={`ac-journal-account-${i}`} />
                <CurrencyInput label={`Debit, line ${i + 1}`} hideLabel size="md" preset={npr} showCurrency={false} value={l.debit} onValueChange={(c) => update(l.key, { debit: c.value, dr: c.minorUnits })} testId={`ac-journal-debit-${i}`} />
                <CurrencyInput label={`Credit, line ${i + 1}`} hideLabel size="md" preset={npr} showCurrency={false} value={l.credit} onValueChange={(c) => update(l.key, { credit: c.value, cr: c.minorUnits })} testId={`ac-journal-credit-${i}`} />
                <Button size="sm" variant="ghost" disabled={lines.length <= 2} onClick={() => setLines((all) => all.filter((x) => x.key !== l.key))} aria-label={`Remove line ${i + 1}`}>
                  Remove
                </Button>
              </div>
            ))}
            <div className="ac-journal-row is-total">
              <span>Total</span>
              <span><MoneyDisplay value={debit} preset={npr} testId="ac-journal-total-debit" /></span>
              <span><MoneyDisplay value={credit} preset={npr} testId="ac-journal-total-credit" /></span>
              <span />
            </div>
          </div>
          <p className={`ac-balance${difference === 0n ? ' is-ok' : ''}`} aria-live="polite" data-testid="ac-journal-status">
            {difference === 0n ? (debit > 0n ? 'Balanced: debits equal credits.' : 'Enter the amounts.') : <>Out of balance by <MoneyDisplay value={difference < 0n ? -difference : difference} preset={npr} /> ({difference > 0n ? 'debits exceed credits' : 'credits exceed debits'})</>}
          </p>
          {tried && problems.length > 0 && (
            <div id="ac-journal-problems">
              <Note tone="error">
                <ul className="ac-problems">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
              </Note>
            </div>
          )}
          <div className="ac-links">
            <Button type="button" variant="secondary" size="sm" onClick={addLine} testId="ac-journal-add">Add line</Button>
            <Button type="button" variant="secondary" size="sm" onClick={fill} disabled={difference === 0n} testId="ac-journal-fill">Fill the difference</Button>
            <Button type="submit" size="sm" testId="ac-journal-post">Post journal</Button>
          </div>
        </form>
      </Card>
      {journal.lines.length > 0 && (
        <Card title="Preview" headingLevel={3}>
          <JournalEntryView journal={journal} renderAccount={accountName} formatDate={shortDate} headingLevel={4} bare testId="ac-journal-preview" />
        </Card>
      )}
      <Card title="Posted in this session" description="They are in the ledger, the trial balance and the statements" headingLevel={3} testId="ac-posted">
        {posted.length ? (
          <div className="app-stack">
            {posted.map((j) => <JournalEntryView key={j.id} journal={j} renderAccount={accountName} formatDate={shortDate} headingLevel={4} bare />)}
          </div>
        ) : (
          <EmptyState title="Nothing posted yet" body="Post a journal above, or book a bank charge from the reconciliation." headingLevel={4} bare />
        )}
      </Card>
    </div>
  );
}
