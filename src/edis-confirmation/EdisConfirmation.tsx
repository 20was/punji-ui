'use client';

/**
 * EdisConfirmation: confirms an electronic delivery instruction (EDIS): moving sold shares out of a demat account
 * to the broker for settlement. Each sale is a row (symbol, units, contract number, broker, settlement date in BS
 * and AD) that can be left out; the total units are counted exactly; a declaration and the transaction PIN complete
 * it. Units cannot be transferred back once sent, so the button says what will move. It transfers nothing itself:
 * `onConfirm` receives the chosen row ids and the PIN, and your server checks them again.
 */
import { useId, useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { Checkbox } from '../checkbox/Checkbox.tsx';
import { DualDate, formatUnits } from '../internal/dualDate.tsx';
import type { NepalLanguage } from '../nepal/locale.ts';
import { OtpInput } from '../otp-input/OtpInput.tsx';

export interface EdisTransfer {
  /** Stable unique id. */
  id: string;
  symbol: string;
  /** Units to move. */
  units: bigint;
  /** The broker's contract (trade) number. */
  contractNumber?: string;
  /** The broker's name or number. Display text. */
  broker?: string;
  /** Settlement date, Gregorian `YYYY-MM-DD`. */
  settlementDate?: string;
}

export interface EdisConfirmationLabels {
  title: string;
  transfers: string;
  contract: string;
  broker: string;
  settles: string;
  units: (units: string) => string;
  /** "Transfer 150 units". */
  confirm: (units: string) => string;
  declaration: string;
  declarationError: string;
  none: string;
  pin: string;
  pinError: (length: number) => string;
}

export const DEFAULT_EDIS_CONFIRMATION_LABELS: EdisConfirmationLabels = {
  title: 'Transfer sold shares',
  transfers: 'Sales to settle',
  contract: 'Contract',
  broker: 'Broker',
  settles: 'Settles',
  units: (u) => `${u} units`,
  confirm: (u) => `Transfer ${u} units`,
  declaration: 'I sold these shares and authorise their transfer from my demat account to the broker. A transfer cannot be undone.',
  declarationError: 'Confirm the declaration to continue.',
  none: 'Choose at least one sale to transfer.',
  pin: 'Transaction PIN',
  pinError: (n) => `Enter all ${n} digits.`,
};

export interface EdisConfirmationProps {
  /** The sales waiting for a transfer. All are chosen at first. */
  transfers: readonly EdisTransfer[];
  /** Receives the chosen ids and the PIN. Return a promise to stay busy until it settles. */
  onConfirm: (confirmation: { ids: string[]; units: bigint; pin: string }) => void | Promise<void>;
  /** Digits in the PIN. Default 4. */
  pinLength?: number;
  /** A server error, announced. */
  error?: ReactNode;
  /** Busy, controlled by you. */
  submitting?: boolean;
  /** Which calendar leads in dates. Default 'bs'. */
  primaryCalendar?: 'bs' | 'ad';
  language?: NepalLanguage;
  /** Digits for units and dates. Default 'latn'. */
  digits?: 'latn' | 'deva';
  /** Heading level. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** Replace the words. */
  labels?: Partial<EdisConfirmationLabels>;
  className?: string;
  /** Sets `data-testid` on the form; rows get `<id>-row-<id>`, the button `<id>-confirm`. */
  testId?: string;
}

export function EdisConfirmation({
  transfers, onConfirm, pinLength = 4, error, submitting: submittingProp, primaryCalendar = 'bs', language, digits = 'latn', headingLevel = 2, labels, className, testId,
}: EdisConfirmationProps) {
  const words = { ...DEFAULT_EDIS_CONFIRMATION_LABELS, ...labels };
  const uid = useId();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(transfers.map((t) => t.id)));
  const [agreed, setAgreed] = useState(false);
  const [pin, setPin] = useState('');
  const [problems, setProblems] = useState<{ rows?: string; declaration?: string; pin?: string }>({});
  const [busy, setBusy] = useState(false);
  const submitting = submittingProp ?? busy;
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const tid = (part: string) => (testId ? `${testId}-${part}` : undefined);
  const selected = transfers.filter((t) => chosen.has(t.id));
  const total = selected.reduce((sum, t) => sum + t.units, 0n);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const found = {
      rows: selected.length === 0 ? words.none : undefined,
      declaration: agreed ? undefined : words.declarationError,
      pin: pin.length === pinLength ? undefined : words.pinError(pinLength),
    };
    setProblems(found);
    if (found.rows || found.declaration || found.pin) return;
    const result = onConfirm({ ids: selected.map((t) => t.id), units: total, pin });
    if (result && typeof (result as Promise<void>).then === 'function') {
      setBusy(true);
      try { await result; } catch { /* shown through the error prop */ } finally { setBusy(false); setPin(''); }
    }
  };

  return (
    <form className={`pu-edis${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-title`} onSubmit={submit} noValidate data-testid={testId}>
      <Heading className="pu-edis-title" id={`${uid}-title`}>{words.title}</Heading>
      <fieldset className="pu-edis-rows" disabled={submitting}>
        <legend>{words.transfers}</legend>
        {transfers.map((t) => (
          <div key={t.id} className="pu-edis-row" data-testid={tid(`row-${t.id}`)}>
            <Checkbox
              checked={chosen.has(t.id)}
              onChange={(on) => {
                const next = new Set(chosen);
                if (on) next.add(t.id); else next.delete(t.id);
                setChosen(next);
              }}
              end={<b className="pu-edis-units">{words.units(formatUnits(t.units, digits))}</b>}
              testId={tid(`pick-${t.id}`)}
            >
              <b>{t.symbol}</b>
            </Checkbox>
            <dl className="pu-edis-meta">
              {t.contractNumber && <div><dt>{words.contract}</dt><dd>{t.contractNumber}</dd></div>}
              {t.broker && <div><dt>{words.broker}</dt><dd>{t.broker}</dd></div>}
              {t.settlementDate && <div><dt>{words.settles}</dt><dd><DualDate value={t.settlementDate} primary={primaryCalendar} language={language} digits={digits} /></dd></div>}
            </dl>
          </div>
        ))}
        {problems.rows && <span className="pu-apply-err" role="alert">{problems.rows}</span>}
      </fieldset>
      <div className="pu-apply-declare" data-invalid={problems.declaration ? 'true' : undefined}>
        <Checkbox checked={agreed} onChange={(v) => { setAgreed(v); if (v) setProblems({ ...problems, declaration: undefined }); }} disabled={submitting} testId={tid('declaration')}>
          {words.declaration}
        </Checkbox>
        {problems.declaration && <span className="pu-apply-err" role="alert">{problems.declaration}</span>}
      </div>
      <OtpInput label={words.pin} length={pinLength} mask value={pin} onChange={(v) => { setPin(v); if (problems.pin) setProblems({ ...problems, pin: undefined }); }} error={problems.pin} disabled={submitting} testId={tid('pin')} />
      {error && <p className="pu-apply-error" role="alert" data-testid={tid('error')}>{error}</p>}
      <div className="pu-apply-actions">
        <Button type="submit" loading={submitting} testId={tid('confirm')}>{words.confirm(formatUnits(total, digits))}</Button>
      </div>
    </form>
  );
}
