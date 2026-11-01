'use client';

/**
 * AmountKeypad: an on-screen number pad for "enter amount" screens (send money, pay at a shop, top up). It builds an
 * exact ASCII decimal string, never a float, at the currency's minor-unit digits (paisa for NPR), and reports the
 * amount as bigint minor units. A key that would pass `max`, add a third decimal or overflow is refused, and the
 * reason is announced. The figure is shown large, grouped in lakh and crore for NPR, and spoken after every key.
 *
 * It does not check a balance, a limit or a fee: pass `max` from your server and check the amount there again.
 */
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { BackspaceIcon, KeypadGrid, digitFace, digitOfKey, type KeypadKey } from '../internal/KeypadGrid.tsx';
import { resolveMoneyConfig, type MoneySource } from '../money-display/MoneyDisplay.tsx';
import { getMoneyFormatter, type MoneyFormatConfig } from '../money/money.ts';
import { parseMinorUnits } from '../nepal/money.ts';

export interface AmountKeypadChange {
  /** Exact ASCII decimal ('1250.5', '12.'). '' when cleared. */
  value: string;
  /** The amount in minor units; null when empty. A trailing point ('12.') counts as 12. */
  minorUnits: bigint | null;
  /** 'partial' while the text ends with a point. */
  state: 'empty' | 'partial' | 'valid';
}

export interface AmountKeypadLabels {
  /** The backspace key. Default "Delete last digit". */
  backspace?: string;
  /** The decimal point key. Default "Decimal point". */
  decimal?: string;
  /** Announced when a key would pass `max`. Default "The most you can enter is {max}." */
  overMax?: (max: string) => string;
  /** Announced when a third decimal is refused. Default "Only two digits after the point." */
  precision?: (digits: number) => string;
  /** A quick-amount chip's name. Default "Set amount to {amount}". */
  quickAmount?: (amount: string) => string;
  /** The group of quick amounts. Default "Quick amounts". */
  quickAmounts?: string;
}

export interface AmountKeypadOptions extends Partial<Pick<MoneyFormatConfig, 'locale' | 'numberingSystem'>> {
  /** The amount's name: the heading of the display and the keypad's group name. Default "Amount". */
  label?: string;
  /** Controlled value: the exact ASCII decimal string from `onValueChange` ('' for none). */
  value: string;
  /** Called with each accepted key: the exact string, the minor units and the state. */
  onValueChange: (change: AmountKeypadChange) => void;
  /** The largest amount in minor units (a wallet balance, a per-transaction limit). Keys that would pass it are refused. */
  max?: bigint;
  /** Most digits before the point. Default 9 (99,99,99,999). */
  maxIntegerDigits?: number;
  /** Offer the decimal point key. Default true when the currency has minor units. */
  allowDecimal?: boolean;
  /** Chips that set the whole amount (minor units), for top-ups and tips. Amounts above `max` are disabled. */
  quickAmounts?: readonly bigint[];
  /** Key faces in Devanagari. Default: Devanagari when `numberingSystem` is 'deva'. */
  digits?: 'latn' | 'deva';
  /** A quiet line under the figure ("Balance Rs 12,500"). Replaced by `error`. */
  hint?: ReactNode;
  /** What is wrong, announced as an alert. */
  error?: ReactNode;
  /** Disable every key. */
  disabled?: boolean;
  /** Words for the keys and announcements; English by default. */
  labels?: AmountKeypadLabels;
  /** Extra class on the root (layout only). */
  className?: string;
  /** Becomes data-testid on the root. */
  testId?: string;
}

export type AmountKeypadProps = AmountKeypadOptions & MoneySource;

function changeOf(value: string, exponent: number): AmountKeypadChange {
  if (value === '') return { value, minorUnits: null, state: 'empty' };
  return { value, minorUnits: parseMinorUnits(value.replace(/\.$/, '') || '0', exponent), state: value.endsWith('.') ? 'partial' : 'valid' };
}

export function AmountKeypad({
  label = 'Amount', value, onValueChange, max, maxIntegerDigits = 9, allowDecimal, quickAmounts, digits, hint, error, disabled,
  labels = {}, className, testId, currency, preset, locale, numberingSystem,
}: AmountKeypadProps) {
  const id = useId();
  const [notice, setNotice] = useState('');
  const config = resolveMoneyConfig({ currency, locale, numberingSystem }, preset);
  const formatter = getMoneyFormatter(config);
  const spoken = getMoneyFormatter({ ...config, display: 'code' });
  const plain = getMoneyFormatter({ ...config, display: 'none' });
  const exponent = formatter.exponent;
  const decimals = (allowDecimal ?? true) && exponent > 0;
  const face = digits ?? (config.numberingSystem === 'deva' ? 'deva' : 'latn');
  const current = changeOf(value, exponent);
  const { backspace = 'Delete last digit', decimal = 'Decimal point', overMax = (m: string) => `The most you can enter is ${m}.`, precision = (n: number) => `Only ${n} digit${n === 1 ? '' : 's'} after the point.`, quickAmount = (a: string) => `Set amount to ${a}`, quickAmounts: quickLabel = 'Quick amounts' } = labels;

  const commit = (next: string) => {
    setNotice('');
    onValueChange(changeOf(next, exponent));
  };
  const press = (key: string) => {
    if (disabled) return;
    let next: string;
    if (key === 'backspace') next = value.slice(0, -1);
    else if (key === '.') {
      if (!decimals || value.includes('.')) return;
      next = value === '' ? '0.' : `${value}.`;
    } else {
      const [whole = '', fraction] = value.split('.');
      if (fraction !== undefined && fraction.length >= exponent) { setNotice(precision(exponent)); return; }
      if (fraction === undefined && whole.replace(/^0+/, '').length >= maxIntegerDigits) return;
      next = value === '0' ? key : value + key;
    }
    if (next === '0' && key === '0' && value === '0') return;
    if (max !== undefined && key !== 'backspace' && changeOf(next, exponent).minorUnits! > max) { setNotice(overMax(spoken.format(max))); return; }
    commit(next);
  };

  const keyInput = (event: KeyboardEvent<HTMLDivElement>): boolean => {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    const digit = digitOfKey(event.key);
    if (digit) { press(digit); return true; }
    if (event.key === '.' || event.key === ',') { press('.'); return true; }
    if (event.key === 'Backspace') { press('backspace'); return true; }
    if (event.key === 'Delete' || event.key === 'Escape') { if (value) commit(''); return true; }
    return false;
  };

  const cells: (KeypadKey | null)[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => ({ id: d, face: digitFace(d, face), name: face === 'deva' ? d : undefined, onPress: () => press(d) }));
  cells.push(decimals ? { id: '.', face: '.', name: decimal, kind: 'action', onPress: () => press('.') } : null);
  cells.push({ id: '0', face: digitFace('0', face), name: face === 'deva' ? '0' : undefined, onPress: () => press('0') });
  cells.push({ id: 'backspace', face: <BackspaceIcon />, name: backspace, kind: 'action', disabled: value === '', onPress: () => press('backspace') });

  // A quick amount as typed text: '500' rather than '500.00'.
  const whole = (amount: bigint) => plain.toDecimal(amount).replace(/\.0+$/, '');
  const display = value === '' ? plain.formatDecimalInput('0') : plain.formatDecimalInput(value);
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className ? `pu-amount-keypad ${className}` : 'pu-amount-keypad'} data-invalid={error ? 'true' : undefined} data-testid={testId}>
      <div className="pu-amount-keypad-display">
        <span className="pu-amount-keypad-label" id={`${id}-label`}>{label}</span>
        <output className="pu-amount-keypad-figure" aria-live="polite" aria-labelledby={`${id}-label`} data-empty={value === '' ? 'true' : undefined}>
          <span className="pu-amount-keypad-currency" aria-hidden="true">{formatter.currency}</span>
          <span aria-hidden="true">{display}</span>
          <span className="kit-sr">{current.minorUnits === null ? spoken.format(0n) : spoken.format(current.minorUnits)}</span>
        </output>
        {error ? <span className="pu-amount-keypad-note err" id={`${id}-err`} role="alert">{error}</span> : hint ? <span className="pu-amount-keypad-note" id={`${id}-hint`}>{hint}</span> : null}
        <span className="kit-sr" role="status">{notice}</span>
      </div>
      {quickAmounts && quickAmounts.length > 0 && (
        <div className="pu-amount-keypad-quick" role="group" aria-label={quickLabel}>
          {quickAmounts.map((amount) => (
            <button
              key={String(amount)}
              type="button"
              className="pu-amount-keypad-chip"
              aria-label={quickAmount(spoken.format(amount))}
              aria-pressed={current.minorUnits === amount}
              disabled={disabled || (max !== undefined && amount > max)}
              onClick={() => commit(whole(amount))}
            >
              {plain.formatDecimalInput(whole(amount))}
            </button>
          ))}
        </div>
      )}
      <KeypadGrid keys={cells} label={`${label} keypad`} onKeyInput={keyInput} disabled={disabled} describedBy={describedBy} />
    </div>
  );
}
