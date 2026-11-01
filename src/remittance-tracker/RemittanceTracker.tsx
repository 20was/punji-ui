'use client';

/**
 * RemittanceTracker: look up an inbound remittance by its control number (the PIN or MTCN the sender shares), then
 * show where it stands (a PaymentTimeline), the amounts sent and paid out at the stated rate, and how and where it
 * is paid out. Your `onLookup` calls your server; the tracker owns only the request state (latest request wins) and
 * never computes a payout. Treat a control number like a password for cash pickup: the result shows only its last
 * four digits, and nothing here stores it.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { Field } from '../fields/Fields.tsx';
import { asciiDigits } from '../internal/lendingDigits.ts';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import type { MoneyFormatConfig } from '../money/money.ts';
import { PaymentTimeline, type PaymentStep } from '../payment-timeline/PaymentTimeline.tsx';

export interface RemittanceDetails {
  /** The sender's name as the remitter records it. Plain text. */
  sender: string;
  /** Where it was sent from ("Doha, Qatar"). */
  origin?: string;
  /** The receiver's name. Plain text. */
  receiver: string;
  /** Amount sent, in the sending currency's minor units. */
  sentAmount: bigint;
  /** ISO 4217 code of the sending currency ('QAR', 'MYR', 'USD'). */
  sentCurrency: string;
  /** Amount paid out, in the payout currency's minor units (the server's figure). */
  payoutAmount: bigint;
  /** The rate as the remitter states it, display text ("1 QAR = 36.62 NPR"). */
  rate?: string;
  /** 'cash' pickup, 'bank' deposit or 'wallet' credit. */
  payoutMethod: 'cash' | 'bank' | 'wallet';
  /** Agent, branch, bank or wallet name. Plain text. */
  payoutLocation?: string;
  /** Where the transfer stands, in order (from your server). */
  steps: readonly PaymentStep[];
}

export interface RemittanceTrackerLabels {
  /** The control number field. */
  controlNumber: string;
  hint: (min: number, max: number) => string;
  track: string;
  /** Errors and results. */
  invalid: (min: number, max: number) => string;
  notFound: string;
  failed: string;
  searching: string;
  sender: string;
  receiver: string;
  sent: string;
  payout: string;
  rate: string;
  method: string;
  location: string;
  methods: Record<RemittanceDetails['payoutMethod'], string>;
  /** The timeline's name. */
  progress: string;
  /** The heading over the result, with the masked number. */
  resultTitle: (masked: string) => string;
}

export const DEFAULT_REMITTANCE_TRACKER_LABELS: RemittanceTrackerLabels = {
  controlNumber: 'Control number', hint: (min, max) => (min === max ? `${min} digits, from the sender's receipt` : `${min} to ${max} digits, from the sender's receipt`), track: 'Track',
  invalid: (min, max) => (min === max ? `Enter the ${min}-digit control number.` : `Enter the control number: ${min} to ${max} digits.`),
  notFound: 'No remittance matches this control number. Check the digits with the sender.', failed: 'The lookup did not finish. Try again.', searching: 'Looking up the remittance',
  sender: 'Sender', receiver: 'Receiver', sent: 'Amount sent', payout: 'Amount to receive', rate: 'Exchange rate', method: 'Paid as', location: 'Paid at',
  methods: { cash: 'Cash pickup', bank: 'Bank deposit', wallet: 'Wallet credit' }, progress: 'Transfer progress', resultTitle: (masked) => `Remittance ${masked}`,
};

export interface RemittanceTrackerProps {
  /** Look the control number up on your server. Resolve with the details, or null when nothing matches; reject on failure. */
  onLookup: (controlNumber: string, signal: AbortSignal) => Promise<RemittanceDetails | null>;
  /** A control number to start with (from a link in an SMS or email). Digits only after normalising. */
  defaultControlNumber?: string;
  /** Look `defaultControlNumber` up as soon as the tracker mounts. Default false. */
  lookupOnMount?: boolean;
  /** Fewest digits in a control number. Default 8. */
  minLength?: number;
  /** Most digits. Default 16. */
  maxLength?: number;
  /** Format of the payout amount. Default NPR with lakh and crore grouping. */
  payoutMoney?: MoneyFormatConfig;
  /** Locale for the sent amount. Default 'en'. */
  sentLocale?: string;
  /** IANA zone for the timeline. Default 'Asia/Kathmandu'. */
  timeZone?: string;
  /** Replace any words, for translation. */
  labels?: Partial<RemittanceTrackerLabels>;
  /** The heading level of the result. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Content after the result (a "Find an agent" link). */
  footer?: ReactNode;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the outer element; parts get `-input`, `-submit` and `-result`. */
  testId?: string;
}

/** Digits only: Devanagari to ASCII, spaces and dashes dropped. Anything else makes it invalid (returns null). */
export function normalizeControlNumber(text: string): string | null {
  const ascii = asciiDigits(String(text ?? '')).replace(/[\s-]/g, '');
  return /^\d*$/.test(ascii) ? ascii : null;
}

/** "•••• •••• 5678": the last four digits only. */
export function maskControlNumber(value: string): string {
  const tail = value.slice(-4);
  return `${'•'.repeat(Math.max(0, Math.min(value.length - 4, 8))).replace(/(.{4})(?=.)/g, '$1 ')} ${tail}`.trim();
}

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'found'; number: string; details: RemittanceDetails } | { kind: 'not-found' } | { kind: 'error' };

export function RemittanceTracker({ onLookup, defaultControlNumber = '', lookupOnMount = false, minLength = 8, maxLength = 16, payoutMoney = { currency: 'NPR', locale: 'en-IN', display: 'code' }, sentLocale = 'en', timeZone, labels, headingLevel = 3, footer, className, testId }: RemittanceTrackerProps) {
  const words = { ...DEFAULT_REMITTANCE_TRACKER_LABELS, ...labels, methods: { ...DEFAULT_REMITTANCE_TRACKER_LABELS.methods, ...labels?.methods } };
  const uid = useId();
  const [text, setText] = useState(() => (normalizeControlNumber(defaultControlNumber) ?? '').slice(0, maxLength));
  const [problem, setProblem] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const controller = useRef<AbortController | null>(null);
  const result = useRef<HTMLHeadingElement>(null);
  const focusResult = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (state.kind === 'found' && focusResult.current) result.current?.focus(); }, [state]);

  const run = (number: string, moveFocus: boolean) => {
    if (number.length < minLength || number.length > maxLength) { setProblem(words.invalid(minLength, maxLength)); return; }
    setProblem(null);
    focusResult.current = moveFocus;
    controller.current?.abort();
    const mine = new AbortController();
    controller.current = mine;
    setState({ kind: 'loading' });
    onLookup(number, mine.signal).then(
      (details) => { if (controller.current === mine) setState(details ? { kind: 'found', number, details } : { kind: 'not-found' }); },
      () => { if (controller.current === mine && !mine.signal.aborted) setState({ kind: 'error' }); },
    );
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(normalizeControlNumber(text) ?? '', true);
  };
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    // A lookup from a link: run once, without moving focus away from where the page put it. It starts a request (an
    // external system), so the loading state is set from the effect on purpose.
    // oxlint-disable-next-line react/set-state-in-effect
    if (lookupOnMount && text !== '') run(text, false);
  });
  const Heading = `h${headingLevel}` as 'h3';
  const grouped = text.replace(/(\d{4})(?=\d)/g, '$1 ');
  return (
    <div className={`pu-remit${className ? ` ${className}` : ''}`} data-testid={testId}>
      <form className="pu-remit-form" onSubmit={submit} noValidate role="search" aria-label={words.controlNumber}>
        <Field label={words.controlNumber} hint={words.hint(minLength, maxLength)} error={problem ?? undefined} value={grouped} inputMode="numeric" autoComplete="off" spellCheck={false}
          maxLength={maxLength + Math.ceil(maxLength / 4)} testId={testId && `${testId}-input`}
          onChange={(raw) => { const next = normalizeControlNumber(raw); if (next !== null && next.length <= maxLength) { setText(next); setProblem(null); } }} />
        <Button type="submit" loading={state.kind === 'loading'} testId={testId && `${testId}-submit`}>{words.track}</Button>
      </form>
      <div aria-live="polite" className="pu-remit-live">
        {state.kind === 'loading' && <span className="kit-sr">{words.searching}</span>}
        {state.kind === 'not-found' && <p className="pu-remit-msg" role="status">{words.notFound}</p>}
      </div>
      {state.kind === 'error' && <p className="pu-remit-msg pu-remit-error" role="alert">{words.failed}</p>}
      {state.kind === 'found' && (
        <section className="pu-remit-result" aria-labelledby={`${uid}-result`} data-testid={testId && `${testId}-result`}>
          <Heading className="pu-remit-title" id={`${uid}-result`} ref={result} tabIndex={-1}>{words.resultTitle(maskControlNumber(state.number))}</Heading>
          <div className="pu-remit-grid">
            <dl className="pu-remit-facts">
              <div><dt>{words.payout}</dt><dd className="pu-remit-payout"><MoneyDisplay value={state.details.payoutAmount} preset={payoutMoney} /></dd></div>
              <div><dt>{words.sent}</dt><dd><MoneyDisplay value={state.details.sentAmount} currency={state.details.sentCurrency} locale={sentLocale} display="code" /></dd></div>
              {state.details.rate && <div><dt>{words.rate}</dt><dd>{state.details.rate}</dd></div>}
              <div><dt>{words.sender}</dt><dd>{state.details.sender}{state.details.origin && <span className="pu-remit-sub">{state.details.origin}</span>}</dd></div>
              <div><dt>{words.receiver}</dt><dd>{state.details.receiver}</dd></div>
              <div><dt>{words.method}</dt><dd>{words.methods[state.details.payoutMethod]}</dd></div>
              {state.details.payoutLocation && <div><dt>{words.location}</dt><dd>{state.details.payoutLocation}</dd></div>}
            </dl>
            <PaymentTimeline steps={state.details.steps} label={words.progress} timeZone={timeZone} />
          </div>
        </section>
      )}
      {footer}
    </div>
  );
}
