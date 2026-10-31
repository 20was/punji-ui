'use client';

/**
 * PaymentReceipt: a printable record of one payment: status, amount, fees,
 * total, who paid whom (account numbers masked), the reference (with a copy
 * button), when it happened in a time zone you name, and a slot for a QR code.
 *
 * Display only. Every figure and the status come from your server; the total
 * is the one you pass, or, when you omit it, amount plus fees (exact bigint
 * addition), so check it against the server. Account numbers are masked to the
 * last digits and the full number is never rendered. The QR slot takes
 * whatever you render (an `<img>` or inline SVG you generated); the package
 * ships no QR encoder. Print: the receipt has its own print styles (plain
 * background, no buttons, no page break inside), and the Print button calls
 * `window.print()` only when the reader presses it.
 */
import { useId, type ReactNode } from 'react';

import { accountNumberTail, formatTransactionReference } from '../banking/account.ts';
import { formatTimestamp } from '../banking/time.ts';
import type { TransactionStatusValue as StatusValue } from '../banking/transactions.ts';
import { Button } from '../button/Button.tsx';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { TransactionStatus } from '../transaction-status/TransactionStatus.tsx';
import { useClipboard } from '../use-clipboard/useClipboard.ts';

export interface ReceiptParty {
  /** Display name of the person, business, bank or wallet. */
  name: string;
  /** The bank or wallet, when it adds to the name. */
  institution?: string;
  /** Full account number; only the last digits are shown. */
  accountNumber?: string;
}

export interface PaymentReceiptLabels {
  title: string; from: string; to: string; amount: string; fees: string; total: string; reference: string; date: string; note: string;
  copy: string; copied: string; print: string; qr: string; endingIn: string;
}

export const DEFAULT_PAYMENT_RECEIPT_LABELS: PaymentReceiptLabels = {
  title: 'Payment receipt', from: 'From', to: 'To', amount: 'Amount', fees: 'Fees', total: 'Total', reference: 'Reference', date: 'Date and time', note: 'Note',
  copy: 'Copy reference', copied: 'Reference copied', print: 'Print receipt', qr: 'QR code', endingIn: 'ending',
};

export interface PaymentReceiptProps {
  /** Amount sent, in integer minor units. */
  amount: bigint;
  /** Fees charged, in minor units. Omit for none (the row is not drawn). */
  fees?: bigint;
  /** Total debited, from your server. Omit to show amount plus fees. */
  total?: bigint;
  /** Money format; default NPR. */
  money?: MoneyFormatConfig;
  /** The payer. */
  from: ReceiptParty;
  /** The payee. */
  to: ReceiptParty;
  /** The bank's or wallet's reference. */
  reference: string;
  /** When it happened: a Date, epoch milliseconds, or an ISO string that carries an offset or Z. Anything else shows a dash. */
  timestamp: Date | number | string;
  /** IANA zone to print the time in. Default 'Asia/Kathmandu'. The zone name is printed with the time. */
  timeZone?: string;
  /** BCP 47 locale for the date. Default 'en-GB'. */
  locale?: string;
  /** Where the payment stands. */
  status: StatusValue;
  /** A free-text remark the payer added. Printed as plain text. */
  note?: string;
  /** A QR code or similar you render (img or inline svg). */
  qr?: ReactNode;
  /** Words describing the QR code, for `aria-label`/alt context. Default 'QR code'. */
  qrLabel?: string;
  /** Show a Print button. Default false. */
  printable?: boolean;
  /** Replace the words, in the reader's language. */
  labels?: Partial<PaymentReceiptLabels>;
  /** Heading level of the title. Default 2. */
  headingLevel?: 2 | 3;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the receipt. */
  testId?: string;
}

function Party({ party, words }: { party: ReceiptParty; words: PaymentReceiptLabels }) {
  const tail = party.accountNumber ? accountNumberTail(party.accountNumber, 4) : '';
  return (
    <>
      <span className="pu-receipt-name">{party.name}</span>
      {party.institution && <span className="pu-receipt-sub">{party.institution}</span>}
      {tail && <span className="pu-receipt-sub">{words.endingIn} {tail}</span>}
    </>
  );
}

export function PaymentReceipt({ amount, fees, total, money = nepalMoneyPreset, from, to, reference, timestamp, timeZone, locale, status, note, qr, printable, labels, qrLabel, headingLevel = 2, className, testId }: PaymentReceiptProps) {
  const words = { ...DEFAULT_PAYMENT_RECEIPT_LABELS, ...labels };
  const clipboard = useClipboard();
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3';
  const when = formatTimestamp(timestamp, { timeZone, locale });
  const ref = formatTransactionReference(reference);
  const grand = total ?? amount + (fees ?? 0n);
  return (
    <article className={`pu-receipt${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-t`} data-testid={testId}>
      <header className="pu-receipt-head">
        <Heading className="pu-receipt-title" id={`${uid}-t`}>{words.title}</Heading>
        <TransactionStatus status={status} />
      </header>
      <p className="pu-receipt-amount"><MoneyDisplay value={amount} preset={money} /></p>
      <dl className="pu-receipt-facts">
        <div><dt>{words.from}</dt><dd><Party party={from} words={words} /></dd></div>
        <div><dt>{words.to}</dt><dd><Party party={to} words={words} /></dd></div>
        <div>
          <dt>{words.reference}</dt>
          <dd className="pu-receipt-ref">
            <span className="pu-receipt-refval">{ref || '—'}</span>
            {ref && (
              <button type="button" className="pu-acct-btn pu-receipt-noprint" aria-label={words.copy} onClick={() => { void clipboard.copy(ref); }} data-testid={testId ? `${testId}-copy` : undefined}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" /></svg>
              </button>
            )}
            <span className="kit-sr" role="status">{clipboard.copied ? words.copied : ''}</span>
          </dd>
        </div>
        <div><dt>{words.date}</dt><dd>{when ? <time dateTime={when.iso}>{when.text}</time> : '—'}</dd></div>
        {note && <div><dt>{words.note}</dt><dd className="pu-receipt-note">{note}</dd></div>}
      </dl>
      <dl className="pu-receipt-sum">
        <div><dt>{words.amount}</dt><dd><MoneyDisplay value={amount} preset={money} /></dd></div>
        {fees !== undefined && <div><dt>{words.fees}</dt><dd><MoneyDisplay value={fees} preset={money} /></dd></div>}
        <div className="pu-receipt-total"><dt>{words.total}</dt><dd><MoneyDisplay value={grand} preset={money} /></dd></div>
      </dl>
      {qr && <figure className="pu-receipt-qr" aria-label={qrLabel ?? words.qr}>{qr}</figure>}
      {printable && (
        <div className="pu-receipt-actions pu-receipt-noprint">
          <Button variant="secondary" size="sm" onClick={() => window.print()} testId={testId ? `${testId}-print` : undefined}>{words.print}</Button>
        </div>
      )}
    </article>
  );
}
