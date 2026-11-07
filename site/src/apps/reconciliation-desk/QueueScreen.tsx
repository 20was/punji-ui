import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import { sumAmounts, type ReconcileItem } from '@punji/ui/reconciliation-matcher';
import { useHotkeys } from '@punji/ui/use-hotkeys';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatMoneyAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { rs, shortDate } from '../shared/books.ts';
import { useRecon } from './store.ts';

const common = (notes: Map<string, string>, timing: string): FinancialColumn<ReconcileItem>[] => [
  {
    key: 'description',
    label: 'Description',
    rowHeader: true,
    render: (x) => (
      <span className="rc-desc">
        <strong>{x.description}</strong>
        <span>
          {x.reference || 'No reference'} · {x.id}
        </span>
      </span>
    ),
  },
  {
    key: 'amount',
    label: 'Amount',
    kind: 'money',
    num: true,
    value: (x) => nprMoney(x.amount),
    aggregate: 'sum',
    formatAggregate: formatMoneyAggregate,
    render: (x) => <Amount value={x.amount} />,
  },
  { key: 'date', label: 'Date', render: (x) => shortDate(x.date) },
  { key: 'note', label: 'Note', render: (x) => <span className="rc-note">{notes.get(x.id) ?? timing}</span> },
];

/** The work: unmatched bank lines beside unmatched book entries. Tick lines on both sides that agree to the paisa and
 *  match them (one to one, or many to one for a payroll paid in parts), accept suggestions, or book the bank's own
 *  charges and interest. Exceptions are named in the Note column and are never matched or booked silently. */
export default function QueueScreen() {
  const { derived, dispatch } = useRecon();
  const { summary, suggestions, exceptions } = derived;
  const [pickS, setPickS] = useState<readonly string[]>([]);
  const [pickL, setPickL] = useState<readonly string[]>([]);
  const openS = summary.unmatchedStatement;
  const openL = summary.unmatchedLedger;
  // Ticks on lines that have since been matched are dropped.
  const chosenS = useMemo(() => openS.filter((x) => pickS.includes(x.id)), [openS, pickS]);
  const chosenL = useMemo(() => openL.filter((x) => pickL.includes(x.id)), [openL, pickL]);
  const totalS = sumAmounts(chosenS);
  const totalL = sumAmounts(chosenL);
  const diff = totalS - totalL;
  const ready = chosenS.length > 0 && chosenL.length > 0;

  const doMatch = () => {
    dispatch({ type: 'match', statementIds: chosenS.map((x) => x.id), ledgerIds: chosenL.map((x) => x.id) });
    if (ready && diff === 0n) {
      setPickS([]);
      setPickL([]);
    }
  };
  useHotkeys([
    { keys: 'm', handler: doMatch },
    { keys: 'a', handler: () => dispatch({ type: 'suggest' }) },
  ]);

  const notesS = new Map<string, string>();
  const notesL = new Map<string, string>();
  const bookable = new Set<string>();
  for (const g of suggestions) {
    notesS.set(g.statementIds[0]!, `Suggested: ${g.ledgerIds[0]}`);
    notesL.set(g.ledgerIds[0]!, `Suggested: ${g.statementIds[0]}`);
  }
  for (const e of exceptions) {
    const note = e.kind === 'mismatch' ? 'Amount differs from the books' : e.kind === 'duplicate' ? 'Possible duplicate' : e.kind === 'aged' ? 'Outstanding too long' : 'Not in the books';
    for (const id of e.statementIds) {
      notesS.set(id, note);
      if (e.kind === 'unrecorded') bookable.add(id);
    }
    for (const id of e.ledgerIds) notesL.set(id, e.kind === 'mismatch' ? 'Amount differs from the bank' : note);
  }

  const statementColumns: FinancialColumn<ReconcileItem>[] = [
    ...common(notesS, ''),
    {
      key: 'act',
      label: 'Action',
      render: (x) =>
        bookable.has(x.id) ? (
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'book', id: x.id })} aria-label={`Book ${x.description} in the ledger`} testId={`rc-book-${x.id}`}>
            Book
          </Button>
        ) : null,
    },
  ];
  const ledgerColumns = common(notesL, 'Not yet at the bank');

  return (
    <div className="app-stack">
      <ScreenTitle
        aside={
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'suggest' })} disabled={suggestions.length === 0} testId="rc-q-suggest">
            Accept {suggestions.length} {suggestions.length === 1 ? 'suggestion' : 'suggestions'}
          </Button>
        }
      >
        Unmatched queue
      </ScreenTitle>
      <div className="rc-bar" data-testid="rc-selection">
        <p className="rc-sel">
          <span>
            Statement <strong>{rs(totalS)}</strong> ({chosenS.length})
          </span>
          <span>
            Ledger <strong>{rs(totalL)}</strong> ({chosenL.length})
          </span>
          <span>
            Difference <strong data-testid="rc-diff">{rs(diff)}</strong>
            {ready && diff !== 0n ? ' (cannot match)' : ready ? ' (agrees)' : ''}
          </span>
        </p>
        <Button size="sm" onClick={doMatch} disabled={!ready} testId="rc-match">
          Match selected
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setPickS([]); setPickL([]); }} disabled={chosenS.length + chosenL.length === 0}>
          Clear
        </Button>
      </div>
      <p className="app-muted app-small">
        Keys: <kbd className="app-kbd">M</kbd> matches the ticked lines, <kbd className="app-kbd">A</kbd> accepts suggestions. Tick a line with Space.
      </p>
      <div className="app-grid is-halves rc-queue">
        <Card title="Bank statement" description={`${openS.length} unmatched ${openS.length === 1 ? 'line' : 'lines'}, NPR`} headingLevel={3} flush testId="rc-queue-statement">
          <FinancialTable
            caption="Unmatched bank statement lines (NPR)"
            columns={statementColumns}
            rows={openS}
            rowKey={(x) => x.id}
            emptyTitle="Every statement line is matched"
            emptyBody="Nothing is waiting on the bank side."
            selection={{ selectedRowIds: pickS, onChange: setPickS, rowLabel: (id) => `Select ${openS.find((x) => x.id === id)?.description ?? id}`, testIdPrefix: 'rc-s' }}
            totals
            totalsLabels={{ total: 'Unmatched total' }}
          />
        </Card>
        <Card title="Bank account in the books" description={`${openL.length} unmatched ${openL.length === 1 ? 'entry' : 'entries'}, NPR`} headingLevel={3} flush testId="rc-queue-ledger">
          <FinancialTable
            caption="Unmatched ledger entries, account 1010 (NPR)"
            columns={ledgerColumns}
            rows={openL}
            rowKey={(x) => x.id}
            emptyTitle="Every ledger entry is matched"
            emptyBody="Nothing is waiting on the books side."
            selection={{ selectedRowIds: pickL, onChange: setPickL, rowLabel: (id) => `Select ${openL.find((x) => x.id === id)?.description ?? id}`, testIdPrefix: 'rc-l' }}
            totals
            totalsLabels={{ total: 'Unmatched total' }}
          />
        </Card>
      </div>
    </div>
  );
}
