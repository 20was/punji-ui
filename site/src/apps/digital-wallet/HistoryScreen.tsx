import { useMemo, useState } from 'react';
import { Button } from '@punji/ui/button';
import { ChipRow } from '@punji/ui/controls';
import { ListFilter } from '@punji/ui/list-filter';
import { Sheet } from '@punji/ui/overlay';
import { EmptyState } from '@punji/ui/states';
import { ScreenTitle } from '../shared/kit.tsx';
import { SESSION_DATE } from '../shared/sim.ts';
import { WalletReceipt } from './confirm.tsx';
import { KIND_LABEL, TxRow } from './rows.tsx';
import { rs, useWallet, type WalletTx } from './store.ts';

type Filter = 'all' | 'in' | 'out' | 'pending' | 'problem';

const matches = (f: Filter, t: WalletTx) =>
  f === 'all' || (f === 'in' ? t.amount > 0n : f === 'out' ? t.amount < 0n : f === 'pending' ? t.status === 'pending' : t.status === 'failed' || t.status === 'reversed');

/** Every wallet entry with search and filters; each opens in a sheet with its status, timeline and receipt. */
export default function HistoryScreen() {
  const { state } = useWallet();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = state.txs.find((t) => t.id === openId) ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.txs.filter((t) => matches(filter, t)).filter((t) => !q || `${t.title} ${t.detail ?? ''} ${KIND_LABEL[t.kind]} ${t.reference}`.toLowerCase().includes(q));
  }, [state.txs, filter, query]);
  const totalIn = shown.filter((t) => t.amount > 0n && t.status === 'completed').reduce((s, t) => s + t.amount, 0n);
  const totalOut = shown.filter((t) => t.amount < 0n && (t.status === 'completed' || t.status === 'pending')).reduce((s, t) => s - t.amount, 0n);
  const options: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'in', label: 'Money in' },
    { value: 'out', label: 'Money out' },
    { value: 'pending', label: 'Pending' },
    { value: 'problem', label: 'Failed or refunded' },
  ];

  return (
    <div className="app-stack">
      <ScreenTitle>History</ScreenTitle>
      <ListFilter value={query} onChange={setQuery} label="Search payments" clear="Clear search" placeholder="Search name, bill, reference" testId="dw-history-search" />
      <ChipRow options={options.map((o) => ({ ...o, count: state.txs.filter((t) => matches(o.value, t)).length }))} value={filter} onChange={setFilter} prefix="dw-history" label="Show" size="sm" wrap />
      {shown.length > 0 && (
        <p className="app-small app-muted dw-history-totals">
          In {rs(totalIn)} · Out {rs(totalOut)} · {shown.length} {shown.length === 1 ? 'entry' : 'entries'}
        </p>
      )}
      {shown.length === 0 ? (
        <EmptyState
          title="No payments match"
          body="Try another search or show everything."
          headingLevel={3}
          role="status"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setFilter('all');
                setQuery('');
              }}
            >
              Show all
            </Button>
          }
        />
      ) : (
        <ul className="dw-txs dw-txs-card" aria-label="Payments" data-testid="dw-history">
          {shown.map((tx) => (
            <TxRow key={tx.id} tx={tx} today={SESSION_DATE} onOpen={(t) => setOpenId(t.id)} />
          ))}
        </ul>
      )}
      <Sheet open={open !== null} title={open ? `${KIND_LABEL[open.kind]}: ${open.title}` : ''} onClose={() => setOpenId(null)} testId="dw-detail">
        {open && <WalletReceipt tx={open} />}
      </Sheet>
    </div>
  );
}
