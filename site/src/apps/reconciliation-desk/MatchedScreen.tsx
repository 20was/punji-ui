import { useMemo } from 'react';
import { Button } from '@punji/ui/button';
import { Card } from '@punji/ui/card';
import { FinancialTable, type FinancialColumn } from '@punji/ui/financial';
import type { ReconcileItem } from '@punji/ui/reconciliation-matcher';
import { ScreenTitle } from '../shared/kit.tsx';
import { Amount, formatMoneyAggregate, nprMoney } from '../shared/moneyCells.tsx';
import { shortDate } from '../shared/books.ts';
import { STATEMENT } from './recon.ts';
import { useRecon } from './store.ts';

interface MatchedLine {
  key: string;
  matchId: string;
  side: 'Statement' | 'Ledger';
  item: ReconcileItem;
}

const kindOf = (id: string) => (id.startsWith('A-') ? 'matched on arrival' : id.startsWith('G-') ? 'suggestion accepted' : id.startsWith('B-') ? 'booked from the statement' : 'matched by hand');

/** Every match, grouped: each group's header carries the statement and ledger subtotals, which agree. Unmatch puts
 *  the lines back in the queue (and removes an entry that was booked from the statement). */
export default function MatchedScreen() {
  const { state, derived, dispatch } = useRecon();
  const rows = useMemo<MatchedLine[]>(
    () =>
      state.matches.flatMap((m) => [
        ...m.statementIds.map((id) => ({ key: `${m.id}:s:${id}`, matchId: m.id, side: 'Statement' as const, item: STATEMENT.find((x) => x.id === id)! })),
        ...m.ledgerIds.map((id) => ({ key: `${m.id}:l:${id}`, matchId: m.id, side: 'Ledger' as const, item: derived.ledger.find((x) => x.id === id)! })),
      ]),
    [state.matches, derived.ledger],
  );
  const columns: FinancialColumn<MatchedLine>[] = [
    {
      key: 'description',
      label: 'Description',
      rowHeader: true,
      render: (r) => (
        <span className="rc-desc">
          <strong>{r.item.description}</strong>
          <span>
            {r.side} · {r.item.reference || 'No reference'} · {r.item.id}
          </span>
        </span>
      ),
    },
    {
      key: 'statement',
      label: 'Bank',
      kind: 'money',
      num: true,
      value: (r) => (r.side === 'Statement' ? nprMoney(r.item.amount) : null),
      aggregate: 'sum',
      formatAggregate: formatMoneyAggregate,
      render: (r) => (r.side === 'Statement' ? <Amount value={r.item.amount} /> : null),
    },
    {
      key: 'ledger',
      label: 'Books',
      kind: 'money',
      num: true,
      value: (r) => (r.side === 'Ledger' ? nprMoney(r.item.amount) : null),
      aggregate: 'sum',
      formatAggregate: formatMoneyAggregate,
      render: (r) => (r.side === 'Ledger' ? <Amount value={r.item.amount} /> : null),
    },
    { key: 'date', label: 'Date', render: (r) => shortDate(r.item.date) },
    {
      key: 'act',
      label: 'Action',
      render: (r) => (
        <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'unmatch', id: r.matchId })} aria-label={`Unmatch ${r.matchId}: ${r.item.description}`} testId={`rc-unmatch-${r.key}`}>
          Unmatch
        </Button>
      ),
    },
  ];
  const groups = state.matches.length;
  return (
    <div className="app-stack">
      <ScreenTitle>Matched</ScreenTitle>
      <Card title="Matches" description={`${groups} ${groups === 1 ? 'match' : 'matches'}. Open a group to see its lines; the bank and books subtotals of every group are equal.`} headingLevel={3} flush testId="rc-matched">
        <FinancialTable
          caption="Matched lines by match (NPR)"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.key}
          emptyTitle="Nothing matched yet"
          emptyBody="Match lines in the queue and they appear here."
          groupBy={(r) => r.matchId}
          groupLabel={(key, members) => `${key} · ${kindOf(key)} · ${members.filter((m) => m.side === 'Statement').length} bank + ${members.filter((m) => m.side === 'Ledger').length} books`}
          totals
          totalsLabels={{ total: 'All matches' }}
        />
      </Card>
    </div>
  );
}
