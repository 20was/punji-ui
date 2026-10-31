import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccountNumber, BankAccountCard, Button, BeneficiarySelector, PaymentReceipt, PaymentTimeline, TransactionList, TransactionStatus,
} from '@punji/ui';
import {
  accounts, beneficiaries, manyTransactions, qrPlaceholderPath, receipt, sampleAccountNumber, shortAccountNumber, timelineCompleted, timelineFailed, timelineInProgress,
  timelineReversed, transactions,
} from '../../fixtures/banking-data.ts';

// Banking and payments fixtures. Data comes from fixtures/banking-data.ts, the same file the docs site reads (one source).
// Invented accounts; the full numbers never appear in any screenshot while masked.
const noop = () => undefined;
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Stack = ({ children }: { children: ReactNode }) => <div style={{ display: 'grid', gap: 24 }}>{children}</div>;

function AccountNumberFixture() {
  return <Stack>
    <Block title="Masked (default)"><AccountNumber value={sampleAccountNumber} testId="vr-an" /></Block>
    <Block title="Copyable, 2 visible"><AccountNumber value={sampleAccountNumber} copyable visible={2} testId="vr-an-copy" /></Block>
    <Block title="Always masked"><AccountNumber value={sampleAccountNumber} revealable={false} /></Block>
    <Block title="Short number (never fully shown)"><AccountNumber value={shortAccountNumber} /></Block>
    <Block title="No number"><AccountNumber value={null} /></Block>
  </Stack>;
}

function BankAccountCardFixture() {
  return <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
    <BankAccountCard {...accounts.savings} testId="vr-card-savings" actions={<Button variant="secondary" size="sm">Statement</Button>} />
    <BankAccountCard {...accounts.current} balanceToggle defaultBalanceHidden={false} testId="vr-card-current" />
    <BankAccountCard {...accounts.wallet} balanceToggle testId="vr-card-wallet" />
    <BankAccountCard {...accounts.closed} money={{ currency: 'USD', locale: 'en-US' }} />
    <BankAccountCard {...accounts.wallet} loading />
    <BankAccountCard {...accounts.savings} error onRetry={noop} />
  </div>;
}

function TransactionListFixture() {
  return <Stack>
    <Block title="Gregorian dates, running balance"><TransactionList transactions={transactions} showBalance testId="vr-tx" /></Block>
    <Block title="Bikram Sambat dates, Nepali"><TransactionList transactions={transactions.slice(0, 3)} calendar="bs" language="ne" showCompletedStatus /></Block>
  </Stack>;
}

function TransactionListPagedFixture() {
  return <TransactionList transactions={manyTransactions} pageSize={6} testId="vr-tx-paged" />;
}

function TransactionListStatesFixture() {
  return <Stack>
    <Block title="Loading"><TransactionList transactions={[]} loading /></Block>
    <Block title="Empty"><TransactionList transactions={[]} labels={{ emptyBody: 'Transactions will show here once you use this account.' }} /></Block>
    <Block title="Error"><TransactionList transactions={[]} error onRetry={noop} /></Block>
    <Block title="Statuses"><div className="vr-row">{(['completed', 'pending', 'failed', 'reversed'] as const).map((s) => <TransactionStatus key={s} status={s} />)}</div></Block>
  </Stack>;
}

function QrPlaceholder() {
  return <svg width="140" height="140" viewBox="0 0 20 20" role="img" aria-label="QR code placeholder" fill="currentColor"><path d={qrPlaceholderPath} /></svg>;
}

function PaymentReceiptFixture() {
  return <Stack>
    <PaymentReceipt {...receipt} printable qr={<QrPlaceholder />} testId="vr-receipt" />
    <Block title="Failed, no fees, UTC"><PaymentReceipt {...receipt} fees={undefined} status="failed" timeZone="UTC" note={undefined} reference="NPT-1" /></Block>
  </Stack>;
}

function PaymentTimelineFixture() {
  return <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
    <Block title="Completed"><PaymentTimeline steps={timelineCompleted} testId="vr-tl-done" /></Block>
    <Block title="In progress"><PaymentTimeline steps={timelineInProgress} /></Block>
    <Block title="Failed"><PaymentTimeline steps={timelineFailed} /></Block>
    <Block title="Reversed, UTC"><PaymentTimeline steps={timelineReversed} timeZone="UTC" /></Block>
  </div>;
}

function BeneficiaryFixture({ open }: { open: boolean }) {
  const [value, setValue] = useState<string | null>(open ? null : 'b3');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) box.current?.querySelector('input')?.focus();
  }, [open]);
  return <div ref={box} style={{ minHeight: open ? 420 : undefined }}>
    <BeneficiarySelector label="Pay to" beneficiaries={beneficiaries} value={value} onChange={setValue} testId="vr-bene" />
  </div>;
}

export const bankingRegistry: Record<string, () => ReactNode> = {
  'account-number': AccountNumberFixture,
  'bank-account-card': BankAccountCardFixture,
  'transaction-list': TransactionListFixture,
  'transaction-list-paged': TransactionListPagedFixture,
  'transaction-list-states': TransactionListStatesFixture,
  'payment-receipt': PaymentReceiptFixture,
  'payment-timeline': PaymentTimelineFixture,
  'beneficiary-selector': () => <BeneficiaryFixture open={false} />,
  'beneficiary-selector-open': () => <BeneficiaryFixture open />,
};
