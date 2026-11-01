'use client';

/**
 * PaymentQrCard: the "scan to pay" or "receive money" screen. It reads the EMVCo payload it is given and shows what
 * is in it (merchant name, city, amount), so the words beside the code can never disagree with the code. A payload
 * that does not parse or fails its CRC shows an error instead of a QR code nobody can pay. An expired dynamic code is
 * hidden, not greyed. With `onAmountChange`, a static code gets an "Add amount" fallback: the person types the
 * amount, you build a new payload (`buildMerchantQr`) and pass it back.
 */
import { useCallback, useId, useState, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { CurrencyInput, type CurrencyInputChange } from '../currency-input/CurrencyInput.tsx';
import { parseMerchantQr } from '../emvco-qr/emvco.ts';
import { MoneyDisplay } from '../money-display/MoneyDisplay.tsx';
import { getMoneyFormatter, nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';
import { QrCode } from '../qr-code/QrCode.tsx';
import type { QrErrorCorrection } from '../qr-code/matrix.ts';

export interface PaymentQrCardLabels {
  /** Default "Scan to pay". */
  title?: string;
  /** Shown when the code has no amount. Default "The payer enters the amount". */
  noAmount?: string;
  /** Default "Add amount". */
  addAmount?: string;
  /** Default "Change amount". */
  changeAmount?: string;
  /** Default "Remove amount". */
  removeAmount?: string;
  /** Default "Amount". */
  amount?: string;
  /** Default "Show code". */
  apply?: string;
  /** Default "Cancel". */
  cancel?: string;
  /** Default "This code has expired." */
  expired?: string;
  /** Default "Get a new code". */
  refresh?: string;
  /** Default "Preparing the code…". */
  loading?: string;
  /** Default "This payment code cannot be shown." */
  invalid?: string;
  /** The QR image name. Default "QR code to pay {merchant}" plus the amount when there is one. */
  qr?: (merchant: string, amount: string | null) => string;
}

export interface PaymentQrCardProps {
  /** The EMVCo merchant-presented payload, from your server or `buildMerchantQr`. */
  payload: string;
  /** Display name instead of the payload's (for example the Nepali name). The payload is unchanged. */
  merchantName?: ReactNode;
  /** A line under the name. Default: the payload's city. */
  detail?: ReactNode;
  /** 'ready' (default), 'loading' (a placeholder while you fetch a code), 'expired' (hide the code), 'error'. */
  state?: 'ready' | 'loading' | 'expired' | 'error';
  /** Shown with `state="error"`. */
  errorMessage?: ReactNode;
  /** Adds a "Get a new code" button to the expired and error states. */
  onRefresh?: () => void;
  /** Turns on the amount fallback: called with the typed amount in minor units, or null to remove it. */
  onAmountChange?: (amount: bigint | null) => void;
  /** Money formatting. Default `nepalMoneyPreset`. The payload's currency wins when it is NPR, INR or USD. */
  money?: MoneyFormatConfig;
  /** QR size in CSS pixels. Default 224. */
  qrSize?: number;
  /** Default 'M'. */
  errorCorrection?: QrErrorCorrection;
  /** Draw the code yourself (a branded renderer, a server-rendered image). Receives the payload and the image name. */
  renderQr?: (payload: string, label: string) => ReactNode;
  /** Buttons under the code (share, download, print). */
  actions?: ReactNode;
  /** A line at the bottom ("Pay with any NepalPay or Fonepay app"). */
  footer?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  labels?: PaymentQrCardLabels;
  className?: string;
  testId?: string;
}

export function PaymentQrCard({
  payload, merchantName, detail, state = 'ready', errorMessage, onRefresh, onAmountChange, money = nepalMoneyPreset, qrSize = 224,
  errorCorrection = 'M', renderQr, actions, footer, headingLevel = 3, labels = {}, className, testId,
}: PaymentQrCardProps) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CurrencyInputChange>({ value: '', minorUnits: null, state: 'empty' });
  const words = {
    title: 'Scan to pay', noAmount: 'The payer enters the amount', addAmount: 'Add amount', changeAmount: 'Change amount', removeAmount: 'Remove amount',
    amount: 'Amount', apply: 'Show code', cancel: 'Cancel', expired: 'This code has expired.', refresh: 'Get a new code', loading: 'Preparing the code…',
    invalid: 'This payment code cannot be shown.', ...labels,
  };
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const parsed = state === 'loading' ? null : parseMerchantQr(payload);
  const qr = parsed?.ok ? parsed.value : null;
  const config: MoneyFormatConfig = { ...money, currency: qr?.currency ?? money.currency };
  const name = merchantName ?? qr?.merchantName ?? '';
  const spokenName = typeof name === 'string' ? name : qr?.merchantName ?? '';
  const amount = qr?.amount ?? null;
  const spokenAmount = amount === null ? null : getMoneyFormatter({ ...config, display: 'code' }).formatSpoken(amount);
  const qrLabel = (labels.qr ?? ((m: string, a: string | null) => (a ? `QR code to pay ${m} ${a}` : `QR code to pay ${m}`)))(spokenName, spokenAmount);
  const shownState = state === 'ready' && !qr ? 'invalid' : state;
  // The amount field appears because the person asked for it, so it takes focus once.
  const focusOnce = useCallback((node: HTMLInputElement | null) => { node?.focus(); }, []);

  const apply = () => {
    if (draft.minorUnits === null || draft.minorUnits <= 0n) return;
    onAmountChange?.(draft.minorUnits);
    setEditing(false);
  };

  let body: ReactNode;
  if (shownState === 'loading') body = <div className="pu-payqr-placeholder" role="status" aria-busy="true" style={{ width: qrSize, height: qrSize }}><span className="kit-sr">{words.loading}</span></div>;
  else if (shownState === 'ready') body = <figure className="pu-payqr-code">{renderQr ? renderQr(payload, qrLabel) : <QrCode value={payload} label={qrLabel} size={qrSize} errorCorrection={errorCorrection} />}</figure>;
  else {
    const message = shownState === 'expired' ? words.expired : shownState === 'error' ? errorMessage ?? words.invalid : words.invalid;
    body = (
      <div className="pu-payqr-blocked" role="alert" style={{ minHeight: qrSize }}>
        <p>{message}</p>
        {onRefresh && shownState !== 'invalid' && <Button variant="secondary" onClick={onRefresh}>{words.refresh}</Button>}
      </div>
    );
  }

  return (
    <article className={`pu-payqr${className ? ` ${className}` : ''}`} aria-labelledby={`${uid}-t`} data-state={shownState} data-testid={testId}>
      <header className="pu-payqr-head">
        <Heading className="pu-payqr-title" id={`${uid}-t`}>{words.title}</Heading>
        {name ? <p className="pu-payqr-merchant">{name}</p> : null}
        {(detail ?? qr?.merchantCity) ? <p className="pu-payqr-detail">{detail ?? qr?.merchantCity}</p> : null}
      </header>
      {body}
      {qr && shownState === 'ready' && (
        <div className="pu-payqr-amount">
          {amount !== null ? <p className="pu-payqr-figure"><MoneyDisplay value={amount} preset={config} /></p> : <p className="pu-payqr-noamount">{words.noAmount}</p>}
          {onAmountChange && !editing && (
            <div className="pu-payqr-amount-actions">
              <Button variant="ghost" size="sm" onClick={() => { setDraft(amount === null ? { value: '', minorUnits: null, state: 'empty' } : { value: getMoneyFormatter(config).toDecimal(amount), minorUnits: amount, state: 'valid' }); setEditing(true); }}>
                {amount === null ? words.addAmount : words.changeAmount}
              </Button>
              {amount !== null && <Button variant="ghost" size="sm" onClick={() => onAmountChange(null)}>{words.removeAmount}</Button>}
            </div>
          )}
          {onAmountChange && editing && (
            <form className="pu-payqr-form" onSubmit={(event) => { event.preventDefault(); apply(); }}>
              <CurrencyInput label={words.amount} preset={config} value={draft.value} onValueChange={setDraft} ref={focusOnce} />
              <div className="pu-payqr-form-actions">
                <Button type="submit" disabled={draft.minorUnits === null || draft.minorUnits <= 0n}>{words.apply}</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>{words.cancel}</Button>
              </div>
            </form>
          )}
        </div>
      )}
      {actions && shownState === 'ready' ? <div className="pu-payqr-actions">{actions}</div> : null}
      {footer ? <p className="pu-payqr-footer">{footer}</p> : null}
    </article>
  );
}
