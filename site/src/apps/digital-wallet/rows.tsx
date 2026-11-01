// One wallet entry as a row (Home and History), and the balance figure that respects "Hide balance".
import { MoneyDisplay } from '@punji/ui/money-display';
import { TransactionStatus } from '@punji/ui/transaction-status';
import { npr, type WalletKind, type WalletTx } from './store.ts';

export const KIND_LABEL: Record<WalletKind, string> = { load: 'Load', qr: 'QR payment', send: 'Sent', bill: 'Bill', topup: 'Top-up', cashback: 'Cashback', receive: 'Received', redeem: 'Rewards' };

export function Balance({ value, hidden, testId }: { value: bigint; hidden: boolean; testId?: string }) {
  if (hidden)
    return (
      <span data-testid={testId} data-hidden="true">
        <span aria-hidden="true">Rs ••••••</span>
        <span className="kit-sr">hidden</span>
      </span>
    );
  return <MoneyDisplay value={value} preset={npr} testId={testId} />;
}

/** The time of day, from the entry's own ISO instant (always Kathmandu time here). */
const timeOf = (iso: string) => iso.slice(11, 16);

export function TxRow({ tx, onOpen, today }: { tx: WalletTx; onOpen?: (tx: WalletTx) => void; today: string }) {
  const credit = tx.amount > 0n;
  const body = (
    <>
      <span className="dw-tx-kind" data-kind={tx.kind} aria-hidden="true">
        {KIND_LABEL[tx.kind].slice(0, 1)}
      </span>
      <span className="dw-tx-main">
        <span className="dw-tx-title">{tx.title}</span>
        <span className="dw-tx-sub">
          {KIND_LABEL[tx.kind]} · {tx.date === today ? `Today ${timeOf(tx.at)}` : `${tx.date} ${timeOf(tx.at)}`}
        </span>
      </span>
      <span className="dw-tx-end">
        <span className="dw-tx-amount" data-credit={credit || undefined} data-void={tx.status === 'failed' || tx.status === 'reversed' || undefined}>
          <MoneyDisplay value={tx.amount} preset={npr} signDisplay="always" />
          <span className="kit-sr">{credit ? ' in' : ' out'}</span>
        </span>
        {tx.status !== 'completed' && <TransactionStatus status={tx.status} size="sm" />}
      </span>
    </>
  );
  return (
    <li className="dw-tx" data-status={tx.status}>
      {onOpen ? (
        <button type="button" className="dw-tx-btn" onClick={() => onOpen(tx)} data-testid={`dw-tx-${tx.id}`}>
          {body}
        </button>
      ) : (
        <div className="dw-tx-btn">{body}</div>
      )}
    </li>
  );
}
