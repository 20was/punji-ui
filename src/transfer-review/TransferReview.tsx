'use client';

/**
 * TransferReview and ConfirmAmount: the last screen before money moves. The amount is read back twice, in figures
 * and in words, because a slipped zero is easy to miss in figures and hard to miss in words. The recipient's name is
 * shown inside <bdi> with bidi controls and invisible characters removed, and checked with `detectSpoofing` (mixed
 * scripts, look-alike letters, a look-alike of a payee the person already trusts); a risky name blocks the confirm
 * button until the person ticks that they have checked it. Fields that changed since the person last saw them
 * (a new account number, an edited amount) are marked "Changed" in words, not only in colour, with the old value.
 *
 * Display only: it calculates nothing but the shown total (amount + fee, exact bigint), and moves no money.
 */
import { useId, useState, type ReactNode } from 'react';

import { Checkbox } from '../checkbox/Checkbox.tsx';
import { getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import { currencyAmountInWords } from '../tax/words.ts';
import { detectSpoofing, type SpoofCheck } from '../trust/spoofing.ts';

/** A money config whose currency may come from the separate `currency` prop instead. */
type MoneyOptions = Omit<MoneyFormatConfig, 'currency'> & { currency?: string };

export interface ConfirmAmountProps {
  /** The amount, bigint minor units. */
  amount: bigint;
  /** ISO 4217 code. Default `money.currency`, else 'NPR'. */
  currency?: string;
  /** Locale, digits, grouping and exponent for the figure. Default locale 'en'. */
  money?: MoneyOptions;
  /** The words line. Default: English words for the currency (`currencyAmountInWords`) when the locale is English; none otherwise. A string replaces it; false hides it. */
  words?: string | false;
  /** The label above the figure. Default "Amount". */
  label?: ReactNode;
  /** The amount the person saw before, when it changed: shown as "Changed from …". */
  previous?: bigint;
  /** Words. */
  labels?: { inWords?: string; changedFrom?: string };
  /** Extra class on the root element (layout only). */
  className?: string;
  /** Becomes data-testid on the root. */
  testId?: string;
}

function defaultWords(amount: bigint, currency: string, money: MoneyOptions | undefined): string | null {
  const locale = money?.locale ?? 'en';
  if (!/^en\b/i.test(locale)) return null;
  try {
    return currencyAmountInWords(amount, currency, money?.exponent === undefined ? {} : { scale: money.exponent });
  } catch {
    return null;
  }
}

/** The amount in figures and in words, large, for a confirm step. */
export function ConfirmAmount({ amount, currency: currencyProp, money, words, label = 'Amount', previous, labels = {}, className, testId }: ConfirmAmountProps) {
  const { inWords = 'In words', changedFrom = 'Changed from' } = labels;
  const currency = currencyProp ?? money?.currency ?? 'NPR';
  const formatter = getMoneyFormatter({ ...money, currency });
  const text = words === false ? null : words ?? defaultWords(amount, currency, money);
  const changed = previous !== undefined && previous !== amount;
  return (
    <div className={`pu-confirm-amount${className ? ` ${className}` : ''}`} data-changed={changed ? 'true' : undefined} data-testid={testId}>
      <span className="pu-confirm-amount-label">{label}</span>
      <span className="pu-confirm-amount-figure">
        <span aria-hidden="true">{formatter.format(amount)}</span>
        <span className="kit-sr">{formatter.formatSpoken(amount)}</span>
      </span>
      {text && <span className="pu-confirm-amount-words"><span className="kit-sr">{`${inWords}: `}</span>{text}</span>}
      {changed && <span className="pu-review-changed">{changedFrom} {formatter.format(previous)}</span>}
    </div>
  );
}

export interface TransferRecipient {
  /** The name to pay, as entered or as saved. */
  name: string;
  /** Account, wallet or IBAN, already masked or formatted the way you want it shown. */
  account?: ReactNode;
  /** Bank or wallet provider. */
  institution?: ReactNode;
}

export interface TransferReviewField {
  /** Stable key. */
  id: string;
  /** The row name ("Remarks"). */
  label: ReactNode;
  /** The value as shown now. */
  value: ReactNode;
  /** The value before it changed. When given, the row is marked "Changed" and shows it. */
  previous?: ReactNode;
  /** Mark the row changed without showing the old value (for example a secret). */
  changed?: boolean;
}

export interface TransferReviewLabels {
  /** Heading. Default "Check before you send". */
  title?: string;
  /** Amount label. Default "You are sending". */
  amount?: string;
  /** Recipient row. Default "To". */
  recipient?: string;
  /** Account row. Default "Account". */
  account?: string;
  /** Institution row. Default "Bank". */
  institution?: string;
  /** Fee row. Default "Fee". */
  fee?: string;
  /** Total row. Default "Total". */
  total?: string;
  /** Badge on a changed row. Default "Changed". */
  changed?: string;
  /** Before the old value. Default "was". */
  was?: string;
  /** Heading of the name warning. Default "Check the recipient's name". */
  nameWarning?: string;
  /** Acknowledgement for a risky name. */
  nameAcknowledge?: string;
  /** Shown when hidden characters were removed from the name for display. */
  nameCleaned?: string;
  /** Confirm button. Default "Confirm and send". */
  confirm?: string;
  /** Edit button. Default "Edit". */
  edit?: string;
}

export interface TransferReviewProps {
  /** The amount to send, bigint minor units. */
  amount: bigint;
  /** ISO 4217 code. Default `money.currency`, else 'NPR'. */
  currency?: string;
  /** The money config for every figure (`MoneyFormatConfig`, as elsewhere in the kit: currency, locale, digits, exponent). */
  money?: MoneyOptions;
  /** Who receives the money. */
  recipient: TransferRecipient;
  /** Names the person already trusts (saved payees). A different name that looks like one of them is flagged. */
  knownPayees?: readonly string[];
  /** The fee, bigint minor units in the same currency. When given, a total line (amount + fee) is shown. */
  fee?: bigint;
  /** The amount before an edit, to mark it changed. */
  previousAmount?: bigint;
  /** The amount in words: see `ConfirmAmount`. */
  words?: string | false;
  /** More rows: reference, date, purpose, source account. */
  details?: readonly TransferReviewField[];
  /** A slot under the recipient, usually `PayeeVerification`. */
  verification?: ReactNode;
  /** Called by the confirm button. Leave it out and pass `confirm` for your own control (for example `HoldToConfirm`). */
  onConfirm?: () => void;
  /** Your own confirm control, replacing the button. It is not rendered while a risky name is unacknowledged. */
  confirm?: ReactNode;
  /** Called by "Edit". */
  onEdit?: () => void;
  /** Disable confirming (while sending). */
  busy?: boolean;
  /** Words, in the reader's language. */
  labels?: TransferReviewLabels;
  /** Extra class on the root element (layout only). */
  className?: string;
  /** Becomes data-testid on the root. */
  testId?: string;
}

const DEFAULT_LABELS: Required<TransferReviewLabels> = {
  title: 'Check before you send', amount: 'You are sending', recipient: 'To', account: 'Account', institution: 'Bank', fee: 'Fee', total: 'Total',
  changed: 'Changed', was: 'was', nameWarning: "Check the recipient's name", nameAcknowledge: 'I have checked the name and it is right',
  nameCleaned: 'Hidden characters were removed from this name before showing it.', confirm: 'Confirm and send', edit: 'Edit',
};

function ChangedNote({ previous, words }: { previous?: ReactNode; words: Required<TransferReviewLabels> }) {
  return (
    <span className="pu-review-changed">
      {words.changed}
      {previous !== undefined && previous !== null && <>{` (${words.was} `}<span className="pu-review-was">{previous}</span>)</>}
    </span>
  );
}

/** The transfer confirm screen: amount in figures and words, a spoofing-checked recipient, changed fields marked. */
export function TransferReview({
  amount, currency: currencyProp, money, recipient, knownPayees, fee, previousAmount, words, details = [], verification, onConfirm, confirm, onEdit, busy, labels = {}, className, testId,
}: TransferReviewProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const id = useId();
  const currency = currencyProp ?? money?.currency ?? 'NPR';
  const formatter = getMoneyFormatter({ ...money, currency });
  const check: SpoofCheck = detectSpoofing(recipient.name, knownPayees ? { known: knownPayees } : {});
  const risky = check.risk === 'high';
  const cleanedForDisplay = check.issues.some((i) => i.kind === 'bidi-control' || i.kind === 'invisible' || i.kind === 'control');
  const [acknowledged, setAcknowledged] = useState(false);
  const blocked = risky && !acknowledged;

  return (
    <section className={`pu-review${className ? ` ${className}` : ''}`} aria-labelledby={`${id}-t`} data-testid={testId}>
      <h2 className="pu-review-title" id={`${id}-t`}>{text.title}</h2>
      <ConfirmAmount amount={amount} currency={currency} money={money} words={words} label={text.amount} {...(previousAmount === undefined ? {} : { previous: previousAmount })} />
      <dl className="pu-review-rows">
        <div className="pu-review-row" data-risk={check.risk === 'none' ? undefined : check.risk}>
          <dt>{text.recipient}</dt>
          <dd><bdi className="pu-review-name">{check.display}</bdi></dd>
        </div>
        {recipient.account !== undefined && <div className="pu-review-row"><dt>{text.account}</dt><dd className="pu-review-mono">{recipient.account}</dd></div>}
        {recipient.institution !== undefined && <div className="pu-review-row"><dt>{text.institution}</dt><dd>{recipient.institution}</dd></div>}
        {details.map((field) => {
          const changed = field.changed || field.previous !== undefined;
          return (
            <div className="pu-review-row" key={field.id} data-changed={changed ? 'true' : undefined}>
              <dt>{field.label}</dt>
              <dd>{field.value}{changed && <> <ChangedNote previous={field.previous} words={text} /></>}</dd>
            </div>
          );
        })}
        {fee !== undefined && <div className="pu-review-row"><dt>{text.fee}</dt><dd className="pu-review-num">{formatter.format(fee)}</dd></div>}
        {fee !== undefined && <div className="pu-review-row total"><dt>{text.total}</dt><dd className="pu-review-num">{formatter.format(amount + fee)}</dd></div>}
      </dl>
      {check.risk !== 'none' && (
        <div className="pu-review-warning" data-risk={check.risk} role={risky ? 'alert' : undefined}>
          <p className="pu-review-warning-title">{text.nameWarning}</p>
          <ul>
            {check.issues.map((issue) => <li key={issue.kind}>{issue.message}</li>)}
            {cleanedForDisplay && <li>{text.nameCleaned}</li>}
          </ul>
          {risky && <Checkbox checked={acknowledged} onChange={setAcknowledged}>{text.nameAcknowledge}</Checkbox>}
        </div>
      )}
      {verification}
      <div className="pu-review-actions">
        {confirm !== undefined ? (blocked ? null : confirm) : onConfirm && (
          <button type="button" className="kit-btn primary lg" aria-disabled={blocked || busy || undefined} aria-busy={busy || undefined} onClick={() => { if (!blocked && !busy) onConfirm(); }}>
            {text.confirm}
          </button>
        )}
        {onEdit && <button type="button" className="kit-btn secondary lg" onClick={onEdit}>{text.edit}</button>}
      </div>
    </section>
  );
}
