'use client';

/**
 * Form fields (design.punji.app/components/field): a label over a boxed
 * input, a hint or an error under it. NumberField accepts grouping commas
 * and Devanagari digits; DateField is the native date input; SymbolField is a
 * combobox over a list the page hands it (no request per keystroke).
 */
import { useId, useMemo, useState, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';

import { Select } from '../select/Select.tsx';
import { searchSymbols, type SymbolOption } from '../format/format.ts';

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
  /** Whole numbers only: asks a phone for the numeric keypad (inputMode "numeric") instead of the decimal one. */
  integer?: boolean;
}

/** A Field that asks a phone for a number keypad. The value stays text: it does not group, parse or validate (see parseMinorUnits and CurrencyInput). */
export function NumberField({ integer, ...props }: InputProps & NumberExtras) {
  return <Field {...props} inputMode={integer ? 'numeric' : 'decimal'} autoComplete="off" />;
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
