'use client';

/**
 * Form fields (design.punji.app/components/field): a label over a boxed
 * input, a hint or an error under it. NumberField shows what was typed and
 * reports a parsed result (grouping commas and Devanagari digits accepted);
 * DateField is the native date input; SymbolField is a
 * combobox over a list the page hands it (no request per keystroke).
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';

import { Select } from '../select/Select.tsx';
import { searchSymbols, type SymbolOption } from '../format/format.ts';
import { compareDecimals, parseLocalizedDecimal, stepDecimal, type DecimalParseResult } from '../nepal/decimal.ts';

interface BaseProps {
  /** The visible label, a real <label> tied to the control. Keep it short and specific ("Units", not "Enter units"). */
  label: ReactNode;
  /** A quiet line under the control (format, unit, limit). Linked with aria-describedby; replaced by `error` when there is one. */
  hint?: ReactNode;
  /** What is wrong and how to fix it. Sets aria-invalid, is announced when it appears (role="alert") and replaces `hint`. */
  error?: ReactNode;
  /** Becomes data-testid on the control. */
  testId?: string;
  /** The box: lg 44 (forms, the default) or md 36 (a toolbar). */
  size?: 'md' | 'lg';
  /** Keeps the label for screen readers only (a toolbar field whose purpose the row already shows). */
  hideLabel?: boolean;
}

interface ValueProps {
  /** The current text. The field is controlled: it always shows exactly this. */
  value: string;
  /** Called with the new text on every change (the string, not the event). */
  onChange: (v: string) => void;
}

type InputProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> & ValueProps;

function Shell({ id, label, hint, error, size = 'lg', hideLabel, children }: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={`kit-field${size === 'md' ? ' md' : ''}`} data-invalid={error ? 'true' : undefined}>
      <label htmlFor={id} className={hideLabel ? 'kit-sr' : undefined}>{label}</label>
      {children}
      {error ? (
        <span className="err" id={`${id}-err`} role="alert">{error}</span>
      ) : hint ? (
        <span className="hint" id={`${id}-hint`}>{hint}</span>
      ) : null}
    </div>
  );
}

interface FieldExtras {
  /** Optional labelled action beside the input (for example, open a calendar). */
  trailingAction?: ReactNode;
}

/** A text input in the kit box: a label over the input, a hint or an error under it. Any other <input> attribute is passed through. */
export function Field({ label, hint, error, testId, value, onChange, id: idProp, size, hideLabel, trailingAction, ...rest }: InputProps & FieldExtras) {
  const auto = useId();
  const id = idProp ?? auto;
  const input = <input
    {...rest}
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-invalid={error ? true : undefined}
    aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
    data-testid={testId}
  />;
  return (
    <Shell id={id} label={label} hint={hint} error={error} size={size} hideLabel={hideLabel}>
      {trailingAction ? <div className="kit-field-control">{input}<span className="kit-field-action">{trailingAction}</span></div> : input}
    </Shell>
  );
}

interface NumberExtras {
  /** Whole numbers only: asks a phone for the numeric keypad (inputMode "numeric") and refuses a fraction when parsing. */
  integer?: boolean;
  /** Most digits after the point that parsing accepts (0 to 9). Default 2, or 0 with `integer`. */
  maxFractionDigits?: number;
  /** Which grouping commas parsing accepts: "south-asian" (12,34,567, the default), "western" (1,234,567) or "none". */
  grouping?: 'south-asian' | 'western' | 'none';
  /** Called with the parsed result on every change, next to onChange: `valid` carries a plain ASCII decimal string with no commas ("1234567.5"); `partial`, `empty` and `invalid` (with a reason) say why there is no number yet. Never rounds. */
  onValueChange?: (result: DecimalParseResult) => void;
  /** Turns the field into a spin button: ArrowUp and ArrowDown add or subtract this much, exactly (a plain decimal string such as "10" or "0.05"; Shift or PageUp/PageDown move ten steps). Default "1" once `steppers` is set. */
  step?: string;
  /** Lowest value the steps reach (a plain decimal string). Steps clamp into min and max; typed text is never rejected or rewritten for being outside them. */
  min?: string;
  /** Highest value the steps reach (a plain decimal string). */
  max?: string;
  /** Shows decrease and increase buttons inside the field (kept out of the Tab order; the arrow keys do the same). */
  steppers?: boolean;
  /** Names of the two stepper buttons, for translation. Default "Decrease" and "Increase". */
  stepperLabels?: { decrease: string; increase: string };
}

type NumberFieldProps = Omit<InputProps, 'min' | 'max' | 'step'> & NumberExtras;

const times10 = (step: string) => {
  const [whole = '0', fraction = ''] = step.split('.');
  const integer = `${whole}${fraction.slice(0, 1) || '0'}`.replace(/^0+(?=\d)/, '');
  const rest = fraction.slice(1);
  return rest ? `${integer}.${rest}` : integer;
};
// Hold a stepper button: one step at once, then after HOLD_DELAY it repeats, quickening from REPEAT_START to REPEAT_MIN ms.
const HOLD_DELAY = 400;
const REPEAT_START = 160;
const REPEAT_MIN = 40;
const MinusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>;

/**
 * A Field for a number. The text stays exactly as typed (grouping commas and Devanagari digits included); `onValueChange` reports it parsed through parseLocalizedDecimal as an exact decimal string, never a float.
 * With `step` or `steppers` it is also a spin button (quantity, lot size, price tick): stepping is exact decimal arithmetic, clamped into `min` and `max`, and it does not validate ranges or set `error` for you.
 */
export function NumberField({ integer, maxFractionDigits, grouping, onValueChange, onChange, step, min, max, steppers, stepperLabels, onKeyDown, ...props }: NumberFieldProps) {
  const fractionLimit = maxFractionDigits ?? (integer ? 0 : 2);
  const stepping = step !== undefined || steppers === true;
  const unit = step ?? '1';
  if (stepping && (unit.split('.')[1]?.length ?? 0) > fractionLimit) throw new RangeError('NumberField step has more fraction digits than maxFractionDigits allows');
  const options = { maxFractionDigits: fractionLimit, grouping };
  const report = (text: string) => {
    onChange(text);
    onValueChange?.(parseLocalizedDecimal(text, options));
  };
  const current = parseLocalizedDecimal(props.value, options);
  const move = (direction: 1 | -1, amount = unit) => {
    if (props.disabled || props.readOnly) return;
    if (current.state === 'partial' || current.state === 'invalid') return;
    report(stepDecimal(current.state === 'valid' ? current.value : '', amount, direction, { min, max }));
  };
  const moveRef = useRef(move);
  useEffect(() => { moveRef.current = move; });
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopHold = useCallback(() => { clearTimeout(hold.current); hold.current = undefined; }, []);
  useEffect(() => stopHold, [stopHold]);
  const holding = useRef<1 | -1 | 0>(0);
  const startHold = (direction: 1 | -1) => {
    stopHold();
    holding.current = direction;
    moveRef.current(direction);
    const tick = (wait: number, next: number) => {
      hold.current = setTimeout(() => {
        moveRef.current(direction);
        tick(next, Math.max(REPEAT_MIN, Math.round(next * 0.85)));
      }, wait);
    };
    tick(HOLD_DELAY, REPEAT_START);
  };
  const labels = stepperLabels ?? { decrease: 'Decrease', increase: 'Increase' };
  const atMin = current.state === 'valid' && min !== undefined && compareDecimals(current.value, min) <= 0;
  const atMax = current.state === 'valid' && max !== undefined && compareDecimals(current.value, max) >= 0;
  // Decimal strings stay strings: aria-valuenow is a JS number in the types, so the exact text goes in aria-valuetext.
  // Reaching a limit (the button turns disabled and sends no pointerup) ends the hold.
  useEffect(() => { if ((holding.current === -1 && atMin) || (holding.current === 1 && atMax)) stopHold(); });
  const spinAria: Record<string, string | undefined> = { 'aria-valuetext': current.state === 'valid' ? current.value : undefined, 'aria-valuemin': min, 'aria-valuemax': max };
  const button = (direction: 1 | -1, atLimit: boolean) => (
    <button
      type="button"
      className="pu-stepper-btn"
      tabIndex={-1}
      aria-label={direction === 1 ? labels.increase : labels.decrease}
      disabled={props.disabled || props.readOnly || atLimit}
      onPointerDown={(e) => { e.preventDefault(); if (e.button === 0) startHold(direction); }}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      onBlur={stopHold}
      // A pointer press already stepped on pointerdown (detail > 0); a keyboard or assistive-technology activation arrives with detail 0.
      onClick={(e) => { if (e.detail === 0) move(direction); }}
    >
      {direction === 1 ? <PlusIcon /> : <MinusIcon />}
    </button>
  );
  return <Field
    {...props}
    onChange={report}
    inputMode={integer ? 'numeric' : 'decimal'}
    autoComplete="off"
    {...(stepping ? {
      role: 'spinbutton',
      ...spinAria,
      trailingAction: steppers ? <span className="pu-stepper">{button(-1, atMin)}{button(1, atMax)}</span> : undefined,
      className: [props.className, steppers ? 'pu-has-stepper' : ''].filter(Boolean).join(' ') || undefined,
      onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const big = e.shiftKey;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'PageDown') {
          e.preventDefault();
          move(e.key === 'ArrowUp' || e.key === 'PageUp' ? 1 : -1, big || e.key.startsWith('Page') ? times10(unit) : unit);
        } else if (e.key === 'Home' && min !== undefined && !props.readOnly && !props.disabled) {
          e.preventDefault();
          report(min);
        } else if (e.key === 'End' && max !== undefined && !props.readOnly && !props.disabled) {
          e.preventDefault();
          report(max);
        }
      },
    } : onKeyDown ? { onKeyDown } : {})}
  />;
}

/** Several lines of text (a message, a note): the same box, at least two control heights tall, grows with `rows`. */
export function TextAreaField({ label, hint, error, testId, value, onChange, id: idProp, size, hideLabel, rows = 4, ...rest }: BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value' | 'size'> & ValueProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} hint={hint} error={error} size={size} hideLabel={hideLabel}>
      <textarea
        {...rest}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        data-testid={testId}
      />
    </Shell>
  );
}

/** A Field with type="date": the browser's own date input, whose value is always YYYY-MM-DD. */
export function DateField(props: InputProps) {
  return <Field {...props} type="date" />;
}

interface SelectFieldExtras {
  /** The choices, in order. Each has the value you receive and the words the person sees. */
  options: { value: string; label: string }[];
}

/** A Select in the Field box: the same label, hint and error wiring, full width. */
export function SelectField({ label, hint, error, testId, value, onChange, options, size, hideLabel }: BaseProps & ValueProps & SelectFieldExtras) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error} size={size} hideLabel={hideLabel}>
      <Select id={id} block value={value} onChange={onChange} options={options} testId={testId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} />
    </Shell>
  );
}

interface SymbolFieldExtras {
  /** Every symbol and company name the person can pick. Matching runs in memory over this list on each keystroke (no request). */
  options: readonly SymbolOption[];
  /** Text shown in the empty input. */
  placeholder?: string;
}

/** A combobox for a ticker symbol: the typed text is uppercased and matched by symbol and company name against `options`. */
export function SymbolField({ label, hint, error, testId, value, onChange, options, placeholder, size, hideLabel }: BaseProps & ValueProps & SymbolFieldExtras) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(() => searchSymbols(options, value), [options, value]);
  const show = open && matches.length > 0 && !(matches.length === 1 && matches[0]?.symbol === value.toUpperCase());
  const activeIndex = Math.min(active, Math.max(matches.length - 1, 0));
  const pick = (o: SymbolOption) => {
    onChange(o.symbol);
    setOpen(false);
  };
  return (
    <Shell id={id} label={label} hint={hint} error={error} size={size} hideLabel={hideLabel}>
      <div className="kit-symbol-control">
        <input
          id={id}
          role="combobox"
          aria-expanded={show}
          aria-controls={show ? `${id}-list` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={show ? `${id}-opt-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (!show) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive(Math.min(activeIndex + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive(Math.max(activeIndex - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const hit = matches[activeIndex];
              if (hit) pick(hit);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
            }
          }}
          data-testid={testId}
        />
        {show && (
          <ul className="kit-options" id={`${id}-list`} role="listbox">
            {matches.map((o, i) => (
              <li
                key={o.symbol}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onPointerDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                data-testid={`symbol-option-${o.symbol}`}
              >
                <b>{o.symbol}</b>
                <span>{o.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

/** An editable price with an optional source annotation, isolated from ordinary number fields. */
interface PriceFieldExtras {
  /** A compact source annotation inside the editable price (a currency code, "last close"). */
  source?: ReactNode;
  /** A ref to the input element (React 19: a ref is a prop). */
  ref?: Ref<HTMLInputElement>;
}

export function PriceField({ label, source, hint, error, testId, value, onChange, id: idProp, size, hideLabel, ...rest }: InputProps & PriceFieldExtras) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <Shell id={id} label={label} hint={hint} error={error} size={size} hideLabel={hideLabel}>
      <input
        inputMode="decimal"
        autoComplete="off"
        {...rest}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        data-testid={testId}
      />
      {source && <span className="kit-field-suffix">{source}</span>}
    </Shell>
  );
}
