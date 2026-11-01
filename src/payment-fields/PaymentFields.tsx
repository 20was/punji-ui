'use client';

/**
 * Payment fields: IBAN, card number, expiry, security code, SWIFT/BIC, IFSC, UPI ID, UK sort code and account number,
 * US routing number and Nepal bank account number. Each is paste-tolerant (spaces, dashes, Devanagari and other
 * scripts' digits, invisible characters removed and announced), groups as you type, keeps the caret in place, sets
 * the right `inputmode` and `autocomplete`, and explains a problem once the field is left. Validity and what was
 * detected (card network, country) are announced through a polite live region, never an alert.
 *
 * Card number and security code never reach a DOM attribute: the text is pushed into the input's `value` property
 * (React would mirror a controlled value into the attribute, where CSS selectors can read it), and nothing is logged.
 * A valid card number shows as "•••• 4242" when the field is not focused. These checks catch typing slips only: the
 * bank, the scheme or your payment provider decides whether an account or card exists.
 */
import { useCallback, useId, useLayoutEffect, useRef, useState, type FocusEvent, type FormEvent, type ReactNode, type Ref } from 'react';

import { useLocaleMessages } from '../locale/context.tsx';
import { toScriptDigits } from '../nepal/decimal.ts';
import {
  CARD_BRANDS, NEPAL_BANK_ACCOUNT_DEFAULT, maskCardNumber, parseAbaRouting, parseBic, parseCardCvc, parseCardExpiry, parseCardNumber,
  parseIban, parseIfsc, parseNepalBankAccount, parseSortCode, parseUkAccountNumber, parseUpiVpa,
  type BicCheck, type CardBrand, type CardExpiryCheck, type CardExpiryOptions, type CardNumberCheck, type CardNumberOptions,
  type IbanCheck, type IbanOptions, type NepalBankAccountCheck, type NepalBankAccountRule, type PaymentCheck, type UpiCheck, type UpiOptions,
} from '../payments/payments.ts';
import { detectSpoofing } from '../trust/spoofing.ts';
import { PAYMENT_FIELD_MESSAGES, PAYMENT_FIELD_NAMES, type PaymentFieldKind, type PaymentFieldMessages } from './messages.ts';

export { PAYMENT_FIELD_MESSAGES, PAYMENT_FIELD_NAMES, type PaymentFieldKind, type PaymentFieldMessages } from './messages.ts';

export interface PaymentFieldProps<R extends PaymentCheck = PaymentCheck> {
  /** The visible label, a real <label> tied to the input. */
  label: ReactNode;
  /** Controlled value: the canonical `value` from the last `onValueChange` result ('' for none). Grouping is added for display. */
  value: string;
  /** Called on each accepted edit with the full check: state, canonical value, display, reason and kind-specific details. Do not log it. */
  onValueChange: (result: R) => void;
  /** A quiet line under the field. Default: an example of the format. Replaced by an error. */
  hint?: ReactNode;
  /** Your own error (a server answer). It replaces the built-in message. */
  error?: ReactNode;
  /** The field's name inside messages ("IBAN", "card number"). Default from the locale pack, else English. */
  fieldName?: string;
  /** Replace any built-in message, for translation or tone. Merged over the locale pack. */
  messages?: Partial<PaymentFieldMessages>;
  /** The box: 'lg' 44 (default) or 'md' 36. */
  size?: 'md' | 'lg';
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  /** The input id. Default: generated. */
  id?: string;
  /** The form field name. */
  name?: string;
  /** Required for the form. */
  required?: boolean;
  /** Not editable. */
  disabled?: boolean;
  /** Called when the input loses focus, after the built-in check. */
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  /** Extra class on the field wrapper. */
  className?: string;
  /** Becomes data-testid on the input. */
  testId?: string;
  /** Ref to the input element. */
  ref?: Ref<HTMLInputElement>;
}

interface InternalProps<R extends PaymentCheck> extends PaymentFieldProps<R> {
  kind: PaymentFieldKind;
  parse: (text: string) => R;
  inputMode: 'text' | 'numeric' | 'email';
  autoComplete: string;
  example?: string;
  /** Text inside the field's end (a card network). Decorative: the same text is announced. */
  badge?: (result: R) => string | null;
  /** What to announce when it changes (card network, country). */
  detected?: (result: R) => string | null;
  /** Shown instead of the grouped text while the field is not focused. */
  mask?: (result: R) => string | null;
  /** Keep the value out of every DOM attribute, including on the server. */
  sensitive?: boolean;
  /** A warning that stays while the value is risky (look-alike payee). */
  warning?: (result: R) => string | null;
  digits?: 'latn' | 'deva';
  autoCapitalize?: 'characters' | 'none';
}

const SIGNIFICANT = /[\p{L}\p{Nd}@]/u;
const REASON_KEY: Record<string, keyof PaymentFieldMessages> = { 'too-far': 'tooFar' };

function countSignificant(text: string): number {
  let n = 0;
  for (const char of text) if (SIGNIFICANT.test(char)) n++;
  return n;
}

function PaymentInput<R extends PaymentCheck>({
  kind, parse, inputMode, autoComplete, example, badge, detected, mask, sensitive, warning, digits = 'latn', autoCapitalize = 'none',
  label, value, onValueChange, hint, error, fieldName, messages, size = 'lg', hideLabel, id: idProp, name, required, disabled,
  onBlur, className, testId, ref,
}: InternalProps<R>) {
  const auto = useId();
  const id = idProp ?? auto;
  const pack = useLocaleMessages().messages.paymentFields;
  const words: PaymentFieldMessages = { ...PAYMENT_FIELD_MESSAGES, ...pack?.messages, ...messages };
  const field = fieldName ?? pack?.fieldNames?.[kind] ?? PAYMENT_FIELD_NAMES[kind];
  const result = parse(value);
  const [focused, setFocused] = useState(false);
  const [left, setLeft] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const script = (text: string) => (digits === 'deva' ? toScriptDigits(text, 'deva') : text);
  const masked = !focused && mask && result.state === 'valid' ? mask(result) : null;
  const shown = masked ?? script(result.display);
  const inner = useRef<HTMLInputElement | null>(null);
  const setRef = useCallback((node: HTMLInputElement | null) => {
    inner.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
  }, [ref]);
  // The value lives in the DOM property only; React never writes it as an attribute.
  useLayoutEffect(() => {
    const input = inner.current;
    if (input && input.value !== shown) input.value = shown;
  }, [shown]);

  const messageFor = (r: R): string | undefined => {
    if (r.state === 'invalid' && r.reason) return words[REASON_KEY[r.reason] ?? (r.reason as keyof PaymentFieldMessages)] as string;
    if (r.state === 'partial') return r.reason === 'checksum' ? words.checksum : words.incomplete(field);
    return undefined;
  };
  const builtIn = left ? messageFor(result) : undefined;
  const message = error ?? builtIn;
  const risk = warning?.(result) ?? null;
  const badgeText = badge?.(result) ?? null;
  const describedBy = [message ? `${id}-err` : hint !== null && (hint ?? example) ? `${id}-hint` : '', risk ? `${id}-warn` : ''].filter(Boolean).join(' ') || undefined;

  const onInput = (event: FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const next = parse(raw);
    const typed = (event.nativeEvent as InputEvent).inputType === 'insertText';
    if (typed && next.state === 'invalid' && (next.reason === 'characters' || next.reason === 'length')) {
      // Refuse a typed character that can never belong here, and keep the caret where it was.
      input.value = shown;
      const back = Math.max(0, caret - 1);
      input.setSelectionRange(back, back);
      return;
    }
    const text = script(next.display);
    const before = countSignificant(raw.slice(0, caret)) - Math.max(0, countSignificant(raw) - countSignificant(next.display));
    input.value = text;
    if (input.ownerDocument.activeElement === input) {
      let at = 0;
      for (let seen = 0; at < text.length && seen < before; at++) if (SIGNIFICANT.test(text[at]!)) seen++;
      input.setSelectionRange(at, at);
    }
    setLeft(false);
    const prior = parse(value);
    const parts: string[] = [];
    if (next.cleaned) parts.push(words.cleaned);
    const now = detected?.(next) ?? null;
    if (now && now !== (detected?.(prior) ?? null)) parts.push(now);
    if (next.state === 'valid' && prior.state !== 'valid') parts.push(words.valid(field));
    if (parts.length) setAnnouncement(parts.join(' '));
    onValueChange(next);
  };

  return (
    <div className={`kit-field pu-pay-field${size === 'md' ? ' md' : ''}${className ? ` ${className}` : ''}`} data-invalid={message ? 'true' : undefined} data-state={result.state}>
      <label htmlFor={id} className={hideLabel ? 'kit-sr' : undefined}>{label}</label>
      <div className="kit-field-control">
        <input
          ref={setRef}
          id={id}
          name={name}
          type="text"
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect="off"
          spellCheck={false}
          required={required}
          disabled={disabled}
          defaultValue={sensitive ? undefined : shown}
          className={badgeText ? 'pu-pay-has-badge' : undefined}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy}
          data-testid={testId}
          onChange={onInput}
          onFocus={() => setFocused(true)}
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            setFocused(false);
            setLeft(true);
            const problem = error ? undefined : messageFor(result);
            if (problem) setAnnouncement(problem);
            onBlur?.(event);
          }}
        />
        {badgeText && <span className="pu-pay-badge" aria-hidden="true">{badgeText}</span>}
      </div>
      <span className="kit-sr" aria-live="polite">{announcement}</span>
      {risk && <span className="pu-pay-warning" id={`${id}-warn`} role="alert">{risk}</span>}
      {message ? <span className="err" id={`${id}-err`}>{message}</span> : hint !== null && (hint ?? example) ? <span className="hint" id={`${id}-hint`}>{hint ?? example}</span> : null}
    </div>
  );
}

function regionName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale, 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** An IBAN field: per-country length and format, mod-97 check, grouped in fours, country announced. */
export function IbanInput({ formats, countries, ...props }: PaymentFieldProps<IbanCheck> & IbanOptions) {
  const { locale } = useLocaleMessages();
  return (
    <PaymentInput<IbanCheck>
      {...props} kind="iban" parse={(text) => parseIban(text, { formats, countries })} inputMode="text" autoComplete="off" autoCapitalize="characters" example="GB82 WEST 1234 5698 7654 32" detected={(r) => (r.country && r.length ? regionName(r.country, locale) : null)}
    />
  );
}

export interface CardNumberInputProps extends PaymentFieldProps<CardNumberCheck>, CardNumberOptions {
  /** Show "•••• 4242" while a valid number is not focused. Default true. */
  maskWhenBlurred?: boolean;
}

/** A card number field: brand from the IIN range, the brand's grouping, Luhn, `cc-number` autofill, masked when left. */
export function CardNumberInput({ brands = CARD_BRANDS, accept, allowUnknownBrand, maskWhenBlurred = true, ...props }: CardNumberInputProps) {
  return (
    <PaymentInput<CardNumberCheck>
      {...props} kind="cardNumber" parse={(text) => parseCardNumber(text, { brands, accept, allowUnknownBrand })} inputMode="numeric" autoComplete="cc-number" example="4242 4242 4242 4242" sensitive badge={(r) => r.brand?.name ?? null} detected={(r) => r.brand?.name ?? null}
      mask={maskWhenBlurred ? (r) => maskCardNumber(r.value) : undefined}
    />
  );
}

/** A card expiry field (MM / YY) with `cc-exp` autofill. Refuses a past month. */
export function CardExpiryInput({ today, maxYears, ...props }: PaymentFieldProps<CardExpiryCheck> & CardExpiryOptions) {
  return <PaymentInput<CardExpiryCheck> {...props} kind="cardExpiry" parse={(text) => parseCardExpiry(text, { today, maxYears })} inputMode="numeric" autoComplete="cc-exp" example="MM / YY" />;
}

export interface CardCvcInputProps extends PaymentFieldProps {
  /** The card's brand from `CardNumberInput` (`result.brand`): sets 3 or 4 digits. Without it, 3 or 4 are accepted. */
  brand?: CardBrand | null;
}

/** A card security code field with `cc-csc` autofill: 3 digits, or 4 for a brand that uses four (Amex). Kept out of DOM attributes. */
export function CardCvcInput({ brand, ...props }: CardCvcInputProps) {
  return <PaymentInput {...props} kind="cardCvc" parse={(text) => parseCardCvc(text, brand)} inputMode="numeric" autoComplete="cc-csc" sensitive />;
}

/** A SWIFT/BIC field: 8 or 11 characters with a real country code. */
export function BicInput(props: PaymentFieldProps<BicCheck>) {
  return <PaymentInput<BicCheck> {...props} kind="bic" parse={parseBic} inputMode="text" autoComplete="off" autoCapitalize="characters" example="NARBNPKA" />;
}

/** An India IFSC field: four bank letters, 0, six branch characters. */
export function IfscInput(props: PaymentFieldProps) {
  return <PaymentInput {...props} kind="ifsc" parse={parseIfsc} inputMode="text" autoComplete="off" autoCapitalize="characters" example="SBIN0001234" />;
}

export interface UpiInputProps extends PaymentFieldProps<UpiCheck>, UpiOptions {
  /** UPI IDs the person already trusts. A different ID that looks like one of them is flagged with an alert. */
  knownPayees?: readonly string[];
}

/** A UPI ID (VPA) field: name@bank, a pasted upi:// link read for its address, look-alikes of saved payees flagged. */
export function UpiInput({ providers, knownPayees, messages, ...props }: UpiInputProps) {
  const pack = useLocaleMessages().messages.paymentFields?.messages;
  const lookalike = messages?.lookalike ?? pack?.lookalike ?? PAYMENT_FIELD_MESSAGES.lookalike;
  return (
    <PaymentInput<UpiCheck>
      {...props} messages={messages} kind="upi" parse={(text) => parseUpiVpa(text, { providers })} inputMode="email" autoComplete="off" example="ram.sharma@okaxis"
      warning={(r) => {
        if (!knownPayees?.length || r.state !== 'valid') return null;
        const found = detectSpoofing(r.value, { known: knownPayees.map((p) => p.toLowerCase()) }).lookalikeOf;
        return found ? lookalike(found) : null;
      }}
    />
  );
}

/** A UK sort code field, grouped 12-34-56. */
export function SortCodeInput(props: PaymentFieldProps) {
  return <PaymentInput {...props} kind="sortCode" parse={parseSortCode} inputMode="numeric" autoComplete="off" example="12-34-56" />;
}

export interface UkAccountNumberInputProps extends PaymentFieldProps {
  /** Pad a six- or seven-digit account number with leading zeros to eight, as some banks print them. Default false. */
  padShort?: boolean;
}

/** A UK account number field: eight digits (six or seven padded with `padShort`). */
export function UkAccountNumberInput({ padShort, ...props }: UkAccountNumberInputProps) {
  return <PaymentInput {...props} kind="ukAccount" parse={(text) => parseUkAccountNumber(text, { padShort })} inputMode="numeric" autoComplete="off" example="31926819" />;
}

/** A US ABA routing number field: nine digits with the check digit. */
export function AbaRoutingInput(props: PaymentFieldProps) {
  return <PaymentInput {...props} kind="abaRouting" parse={parseAbaRouting} inputMode="numeric" autoComplete="off" example="011000015" />;
}

export interface NepalBankAccountInputProps extends PaymentFieldProps<NepalBankAccountCheck> {
  /** The bank's rule (lengths, characters, prefix pattern, grouping). Default: 8 to 20 digits. */
  rule?: NepalBankAccountRule;
  /** Show the digits in Devanagari. The value stays ASCII. Default 'latn'. */
  digits?: 'latn' | 'deva';
}

/** A Nepal bank account number field, checked against the rule for the chosen bank. Devanagari digits accepted. */
export function NepalBankAccountInput({ rule = NEPAL_BANK_ACCOUNT_DEFAULT, digits, ...props }: NepalBankAccountInputProps) {
  return (
    <PaymentInput<NepalBankAccountCheck>
      {...props} kind="nepalAccount" parse={(text) => parseNepalBankAccount(text, rule)} digits={digits} inputMode={rule.characters === 'alphanumeric' ? 'text' : 'numeric'}
      autoCapitalize={rule.characters === 'alphanumeric' ? 'characters' : 'none'} autoComplete="off"
    />
  );
}
