/**
 * DebitCredit: one ledger amount with its side. The value is a signed net
 * (debit positive, credit negative, as `debit - credit`). Three presentations:
 * `suffix` (default) prints the magnitude then "Dr" or "Cr"; `signed` prints
 * the signed amount (credits in accounting parentheses when `accounting`) then
 * the side; `column` prints the amount only when it belongs to `column`, so
 * Debit and Credit columns can sit side by side. The side is always words as
 * well as colour-free: a screen reader hears "debit" or "credit". Amounts are
 * exact (MoneyDisplay); nothing is rounded or summed here.
 */
import { MoneyDisplay, type MoneyDisplayOptions, type MoneySource } from '../money-display/MoneyDisplay.tsx';
import { nepalMoneyPreset, type MoneyFormatConfig } from '../money/money.ts';

/** Nepal rupees in lakh/crore grouping with no currency mark: name the currency once in the caption or heading. */
export const nepalLedgerMoney: MoneyFormatConfig = Object.freeze({ ...nepalMoneyPreset, display: 'none' });

export interface DebitCreditLabels {
  /** Printed beside a debit amount. Default 'Dr'. */
  debit: string;
  /** Printed beside a credit amount. Default 'Cr'. */
  credit: string;
  /** Spoken for a debit. Default 'debit'. */
  debitSpoken: string;
  /** Spoken for a credit. Default 'credit'. */
  creditSpoken: string;
}

export const DEFAULT_DEBIT_CREDIT_LABELS: DebitCreditLabels = { debit: 'Dr', credit: 'Cr', debitSpoken: 'debit', creditSpoken: 'credit' };

export type DebitCreditSide = 'debit' | 'credit' | 'zero';

/** Which side a signed net amount is on. */
export function sideOf(net: bigint): DebitCreditSide {
  return net > 0n ? 'debit' : net < 0n ? 'credit' : 'zero';
}

export interface DebitCreditOptions extends Omit<MoneyDisplayOptions, 'value' | 'compact' | 'signDisplay'> {
  /** Signed net in minor units: positive is a debit, negative a credit. null shows the missing mark. */
  value: bigint | null | undefined;
  /** suffix: "1,200.00 Dr". signed: "1,200.00 Dr" / "(1,200.00) Cr" with `accounting`, "-1,200.00 Cr" without. column: the amount only under its own column. */
  variant?: 'suffix' | 'signed' | 'column';
  /** For `column`: which column this cell is. The other side shows nothing. */
  column?: 'debit' | 'credit';
  /** Replace the Dr / Cr words (and their spoken forms). */
  labels?: Partial<DebitCreditLabels>;
}

/** Currency comes from `currency` or `preset`; with neither it is NPR with no mark (`nepalLedgerMoney`). */
export type DebitCreditProps = DebitCreditOptions & {
  /** ISO 4217 code of the currency to show, for example 'USD'. Without it (and without `preset`) the amount is NPR with no mark. */
  currency?: string;
  /** A ready-made format (currency, locale, display). Wins over the NPR default. */
  preset?: MoneyFormatConfig;
};

export function DebitCredit({ value, variant = 'suffix', column = 'debit', labels, preset: presetProp, accounting, className, testId, ...money }: DebitCreditProps) {
  const words = { ...DEFAULT_DEBIT_CREDIT_LABELS, ...labels };
  // Nepal rupees without a mark unless the caller names a currency or brings their own preset.
  const base = { ...money, preset: presetProp ?? (money.currency ? undefined : nepalLedgerMoney) } as MoneySource & Omit<MoneyDisplayOptions, 'value'>;
  const classes = `pu-dc${className ? ` ${className}` : ''}`;
  if (value === null || value === undefined) return <MoneyDisplay value={null} {...base} className={classes} testId={testId} />;
  const side = sideOf(value);
  if (variant === 'column') {
    // A zero amount sits in the debit column; the credit column stays blank.
    const here = side === 'zero' ? column === 'debit' : side === column;
    if (!here) return <span className={`${classes} pu-dc-blank`} data-side={side} data-testid={testId} />;
    return <MoneyDisplay value={value < 0n ? -value : value} {...base} accounting={false} className={classes} testId={testId} />;
  }
  const magnitude = value < 0n ? -value : value;
  const amount = variant === 'signed'
    ? <MoneyDisplay value={value} {...base} accounting={accounting ?? true} />
    : <MoneyDisplay value={magnitude} {...base} accounting={false} />;
  return (
    <span className={classes} data-side={side} data-testid={testId}>
      {amount}
      {side === 'zero'
        ? <span className="pu-dc-side" aria-hidden="true" />
        : <>
          <span className="pu-dc-side" aria-hidden="true">{side === 'debit' ? words.debit : words.credit}</span>
          <span className="kit-sr">{side === 'debit' ? words.debitSpoken : words.creditSpoken}</span>
        </>}
    </span>
  );
}
