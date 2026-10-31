'use client';

/**
 * CurrencyInput: a money field built on PriceField. The text is grouped in the
 * currency's locale as you type (lakh/crore for en-IN and ne), Devanagari and
 * Arabic-Indic digits are accepted, and more fraction digits than the currency
 * has (JPY 0, USD 2, KWD 3) are refused, never rounded. The value is an exact
 * ASCII decimal string plus bigint minor units; it never passes through Number.
 */
import { useCallback, useRef, type FocusEvent, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

import { PriceField } from '../fields/Fields.tsx';
import type { MoneySource } from '../money-display/MoneyDisplay.tsx';
import { getMoneyFormatter, type MoneyFormatConfig, type MoneyFormatter } from '../money/money.ts';
import { parseLocalizedDecimal } from '../nepal/decimal.ts';
import { parseMinorUnits } from '../nepal/money.ts';

export interface CurrencyInputChange {
  /** Exact ASCII decimal string in major units ('1234.5', '12.', '-'). Empty string when cleared. */
  value: string;
  /** Exact minor units when `state` is 'valid', else null. */
  minorUnits: bigint | null;
  /** 'partial' is unfinished text such as '12.' or '-'. */
  state: 'empty' | 'partial' | 'valid';
}

export interface CurrencyInputOptions extends Partial<Pick<MoneyFormatConfig, 'locale' | 'numberingSystem'>>, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type' | 'inputMode' | 'defaultValue'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  size?: 'md' | 'lg';
  hideLabel?: boolean;
  testId?: string;
  /** Controlled value: the exact ASCII decimal string from `onValueChange` ('' for none). */
  value: string;
  onValueChange: (change: CurrencyInputChange) => void;
  /** Accept a leading minus. Default false. */
  allowNegative?: boolean;
  /** Show the currency code inside the field. Default true. The currency is always in the accessible name. */
  showCurrency?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/** Requires a `currency` or a `preset` that carries one. */
export type CurrencyInputProps = CurrencyInputOptions & MoneySource;

const SHAPE = /^-?\d*\.?\d*$/;

function resultOf(canonical: string, formatter: MoneyFormatter): CurrencyInputChange {
  const parsed = parseLocalizedDecimal(canonical, { maxFractionDigits: formatter.exponent, grouping: 'none' });
  if (parsed.state === 'empty') return { value: '', minorUnits: null, state: 'empty' };
  if (parsed.state === 'valid') return { value: parsed.value, minorUnits: parseMinorUnits(parsed.value, formatter.exponent), state: 'valid' };
  return { value: canonical, minorUnits: null, state: 'partial' };
}

function currencyName(code: string, locale: string): string {
  try { return new Intl.DisplayNames(locale, { type: 'currency' }).of(code) ?? code; } catch { return code; }
}

export function CurrencyInput({
  label, value, onValueChange, allowNegative = false, showCurrency = true, preset, currency, locale, numberingSystem,
  onBlur, ref, testId, ...rest
}: CurrencyInputProps) {
  const inner = useRef<HTMLInputElement | null>(null);
  const setRef = useCallback((node: HTMLInputElement | null) => {
    inner.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  const picked: Partial<MoneyFormatConfig> = { ...preset };
  if (currency) picked.currency = currency;
  if (locale) picked.locale = locale;
  if (numberingSystem) picked.numberingSystem = numberingSystem;
  if (!picked.currency) throw new RangeError('CurrencyInput needs a currency or a preset that has one');
  const formatter = getMoneyFormatter({ currency: picked.currency, ...(picked.locale ? { locale: picked.locale } : {}), ...(picked.numberingSystem ? { numberingSystem: picked.numberingSystem } : {}), display: 'none' });
  const shown = formatter.formatDecimalInput(value);

  const accepts = (canonical: string): boolean => {
    if (!SHAPE.test(canonical) || canonical.length > 40) return false;
    if (!allowNegative && canonical.startsWith('-')) return false;
    const dot = canonical.indexOf('.');
    return dot < 0 || (formatter.exponent > 0 && canonical.length - dot - 1 <= formatter.exponent);
  };

  function place(input: HTMLInputElement, text: string, significant: number) {
    // After React commits (and restores a refused edit), put the caret after the same typed characters.
    queueMicrotask(() => {
      let seen = 0;
      let at = 0;
      while (at < text.length && seen < significant) { if (formatter.toCanonicalInput(text[at]!) !== '') seen++; at++; }
      if (document.activeElement === input) input.setSelectionRange(at, at);
    });
  }

  return (
    <PriceField
      {...rest}
      ref={setRef}
      testId={testId}
      label={<>{label}{' '}<span className="kit-sr">{`(${currencyName(formatter.currency, formatter.locale)})`}</span></>}
      source={showCurrency ? <span className="pu-currency-code" aria-hidden="true">{formatter.currency}</span> : undefined}
      inputMode={formatter.exponent === 0 ? 'numeric' : 'decimal'}
      value={shown}
      onChange={(raw) => {
        const input = inner.current;
        const caret = input?.selectionStart ?? raw.length;
        const canonical = formatter.toCanonicalInput(raw);
        if (!accepts(canonical)) {
          if (input) place(input, shown, Math.max(0, formatter.toCanonicalInput(shown.slice(0, Math.max(0, caret - (raw.length - shown.length)))).length));
          return;
        }
        const change = resultOf(canonical, formatter);
        onValueChange(change);
        if (input) place(input, formatter.formatDecimalInput(change.value), formatter.toCanonicalInput(raw.slice(0, caret)).length);
      }}
      onBlur={(event: FocusEvent<HTMLInputElement>) => {
        // Finish the text: '12.5' becomes '12.50', '12.' becomes '12.00', a lone '-' or '.' clears.
        if (value !== '') {
          const change = resultOf(value, formatter);
          const done = change.state === 'valid' ? formatter.toDecimal(change.minorUnits!) : /\d/.test(value) ? formatter.toDecimal(parseMinorUnits(`${value.replace(/\.$/, '')}`, formatter.exponent)) : '';
          if (done !== value) onValueChange(done === '' ? { value: '', minorUnits: null, state: 'empty' } : resultOf(done, formatter));
        }
        onBlur?.(event);
      }}
    />
  );
}
