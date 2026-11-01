'use client';

/**
 * BillSummary (design.punji.app/components/bill-summary): the bill a biller returned for a customer number, shown
 * before the payer pays it: who the biller is, whose account, the period, each charge, any rebate or late fine, the
 * total due and the due date (AD or Bikram Sambat), with a status the caller decides. The kind of card eSewa and
 * Khalti show after you enter an electricity SC number, a water customer ID or an internet username.
 *
 * Every amount is exact bigint minor units. The total is the one your biller returned (`total`); without it the
 * component adds the lines and adjustments itself. It submits nothing: put your Pay button in `action`.
 */
import { useId, type ReactNode } from 'react';

import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { formatBSDate, gregorianToBS } from '../nepal/calendar.ts';
import { formatCalendarDate, parseCalendarDate } from '../nepal/date-only.ts';
import { PaymentStatus, type PaymentStatusValue } from '../payment-status/PaymentStatus.tsx';
import { Button } from '../button/Button.tsx';
import { Skeleton, ToneIcon } from '../states/States.tsx';

/** One charge on the bill (energy charge, service charge, a package), or an adjustment (a rebate is negative, a late fine positive). */
export interface BillLine {
  /** Stable unique id. */
  id: string;
  /** What the charge is. Plain text. */
  label: string;
  /** Minor units. Negative for a rebate or discount. */
  amount: bigint;
  /** A quiet second line ("212 units", "Shrawan to Bhadra"). */
  detail?: string;
}

export interface BillSummaryLabels {
  /** Name of the customer line. Default 'Customer'. */
  customer: string;
  /** Name of the customer number line. Default 'Customer ID'. */
  customerId: string;
  /** Name of the period line. Default 'Bill period'. */
  period: string;
  /** Name of the due date line. Default 'Due date'. */
  dueDate: string;
  /** Heading over the charges. Default 'Charges'. */
  charges: string;
  /** Heading over rebates and fines. Default 'Rebates and fines'. */
  adjustments: string;
  /** Name of the total. Default 'Total due'. */
  total: string;
  /** Title of the empty state. Default 'Nothing to pay'. */
  nothingDue: string;
  /** Line of the empty state. */
  nothingDueBody: string;
  /** Spoken while loading. Default 'Fetching the bill'. */
  loading: string;
  /** The default error line. */
  error: string;
  /** The retry button. Default 'Try again'. */
  retry: string;
  /** Shown for an unreadable due date. Default 'Unknown date'. */
  unknownDate: string;
}

export const DEFAULT_BILL_SUMMARY_LABELS: BillSummaryLabels = {
  customer: 'Customer',
  customerId: 'Customer ID',
  period: 'Bill period',
  dueDate: 'Due date',
  charges: 'Charges',
  adjustments: 'Rebates and fines',
  total: 'Total due',
  nothingDue: 'Nothing to pay',
  nothingDueBody: 'There is no unpaid bill on this account.',
  loading: 'Fetching the bill',
  error: 'Could not fetch the bill. Check the customer ID and try again.',
  retry: 'Try again',
  unknownDate: 'Unknown date',
};

export interface BillSummaryProps {
  /** The biller ("Nepal Electricity Authority", "KUKL", "WorldLink"). Shown as given. */
  biller: string;
  /** The service ("Electricity", "Water", "Internet"), shown above the biller. */
  service?: string;
  /** The account holder's name as the biller holds it, so the payer sees whose bill this is. */
  customerName?: string;
  /** The number the payer entered (SC number, customer ID, username). */
  customerId?: string;
  /** The billing period, as text ("Ashwin 2083"). */
  period?: string;
  /** The charges. */
  lines?: readonly BillLine[];
  /** Rebates (negative) and late fines (positive), listed after the charges. */
  adjustments?: readonly BillLine[];
  /** The total your biller returned. Omit to add up the lines and adjustments. */
  total?: bigint;
  /** Due date, `YYYY-MM-DD` (Gregorian). */
  dueDate?: string;
  /** Show the due date in 'ad' (default) or 'bs' (Bikram Sambat). */
  calendar?: 'ad' | 'bs';
  /** Where the bill stands, decided by the caller: unpaid, overdue, partial, paid or void. */
  status?: PaymentStatusValue;
  /** ready (default), loading (placeholders), error (with retry) or empty (no bill due). */
  state?: 'ready' | 'loading' | 'error' | 'empty';
  /** What failed, in place of the default error line. */
  errorMessage?: ReactNode;
  /** Called by Try again in the error state. Without it no button is drawn. */
  onRetry?: () => void;
  /** Money format; default NPR. */
  money?: MoneyFormatConfig;
  /** Your Pay button or link, under the total. */
  action?: ReactNode;
  /** Heading level of the biller name. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Replace the words, in the reader's language. */
  labels?: Partial<BillSummaryLabels>;
  /** Extra class for layout. */
  className?: string;
  /** Sets `data-testid` on the root; the total gets `-total`. */
  testId?: string;
}

/** The sum of the charges and adjustments, minor units. */
export function billTotal(lines: readonly BillLine[] = [], adjustments: readonly BillLine[] = []): bigint {
  let total = 0n;
  for (const line of [...lines, ...adjustments]) total += line.amount;
  return total;
}

function dateText(value: string, calendar: 'ad' | 'bs', unknown: string): string {
  const parsed = parseCalendarDate(value);
  if (!parsed) return unknown;
  try {
    return calendar === 'bs' ? formatBSDate(gregorianToBS(parsed)) : formatCalendarDate(parsed);
  } catch {
    return unknown;
  }
}

function Lines({ title, lines, money }: { title: string; lines: readonly BillLine[]; money: MoneyFormatConfig }) {
  return (
    <>
      <dt className="pu-bill-group">{title}</dt>
      {lines.map((line) => (
        <dd key={line.id} className="pu-bill-line" data-negative={line.amount < 0n || undefined}>
          <span className="pu-bill-label">
            {line.label}
            {line.detail && <span className="pu-bill-detail">{line.detail}</span>}
          </span>
          <MoneyDisplay value={line.amount} preset={money} />
        </dd>
      ))}
    </>
  );
}

export function BillSummary({
  biller, service, customerName, customerId, period, lines = [], adjustments = [], total, dueDate, calendar = 'ad', status, state = 'ready',
  errorMessage, onRetry, money = nepalMoneyPreset, action, headingLevel = 3, labels, className, testId,
}: BillSummaryProps) {
  const words = { ...DEFAULT_BILL_SUMMARY_LABELS, ...labels };
  const uid = useId();
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const due = total ?? billTotal(lines, adjustments);
  const cls = `pu-bill${className ? ` ${className}` : ''}`;
  const head = (
    <header className="pu-bill-head">
      <div className="pu-bill-title">
        {service && <span className="pu-bill-service">{service}</span>}
        <Heading className="pu-bill-biller" id={`${uid}-t`}>{biller}</Heading>
      </div>
      {state === 'ready' && status && <PaymentStatus status={status} size="sm" />}
    </header>
  );

  if (state === 'loading') {
    return (
      <section className={cls} aria-labelledby={`${uid}-t`} aria-busy="true" data-state="loading" data-testid={testId}>
        {head}
        <div className="pu-bill-wait" role="status">
          <span className="kit-sr">{words.loading}</span>
          <Skeleton width="55%" height={14} />
          <Skeleton width="80%" height={14} />
          <Skeleton width="40%" height={28} />
        </div>
      </section>
    );
  }
  if (state === 'error') {
    return (
      <section className={cls} aria-labelledby={`${uid}-t`} data-state="error" data-testid={testId}>
        {head}
        <div className="pu-bill-problem" role="alert">
          <ToneIcon tone="error" />
          <span>{errorMessage ?? words.error}</span>
        </div>
        {onRetry && (
          <div className="pu-bill-actions">
            <Button size="sm" variant="secondary" onClick={onRetry} testId={testId ? `${testId}-retry` : undefined}>{words.retry}</Button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={cls} aria-labelledby={`${uid}-t`} data-state={state} data-testid={testId}>
      {head}
      <dl className="pu-bill-facts">
        {customerName && <div><dt>{words.customer}</dt><dd className="pu-bill-customer">{customerName}</dd></div>}
        {customerId && <div><dt>{words.customerId}</dt><dd className="pu-bill-id">{customerId}</dd></div>}
        {state === 'ready' && period && <div><dt>{words.period}</dt><dd>{period}</dd></div>}
        {state === 'ready' && dueDate && (
          <div>
            <dt>{words.dueDate}</dt>
            <dd><time dateTime={parseCalendarDate(dueDate) ? dueDate : undefined}>{dateText(dueDate, calendar, words.unknownDate)}</time></dd>
          </div>
        )}
      </dl>
      {state === 'empty' ? (
        <div className="pu-bill-empty" role="status">
          <ToneIcon tone="success" />
          <span><b>{words.nothingDue}</b> {words.nothingDueBody}</span>
        </div>
      ) : (
        <>
          {(lines.length > 0 || adjustments.length > 0) && (
            <dl className="pu-bill-lines">
              {lines.length > 0 && <Lines title={words.charges} lines={lines} money={money} />}
              {adjustments.length > 0 && <Lines title={words.adjustments} lines={adjustments} money={money} />}
            </dl>
          )}
          <p className="pu-bill-total">
            <span>{words.total}</span>
            <strong data-testid={testId ? `${testId}-total` : undefined}>
              <MoneyDisplay value={due} preset={money} />
            </strong>
          </p>
          {action && <div className="pu-bill-actions">{action}</div>}
        </>
      )}
    </section>
  );
}
