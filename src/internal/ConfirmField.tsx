/**
 * The typed-confirmation field of InlineConfirm and AlertDialog: the kit's field markup (label over an input, the
 * `kit-field` styles) without importing the whole fields module, so a confirm stays small.
 */
import { useId, type KeyboardEvent } from 'react';

export function ConfirmField({ id, label, value, onChange, onEnter, size = 'lg', dialogFocus, testId }: {
  /** The input's id; generated when omitted. */
  id?: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** Called on Enter. */
  onEnter: () => void;
  size?: 'md' | 'lg';
  /** Marks the input `data-autofocus`, the element a dialog focuses first. */
  dialogFocus?: boolean;
  testId?: string;
}) {
  const auto = useId();
  const own = id ?? auto;
  return (
    <div className={`kit-field${size === 'md' ? ' md' : ''}`}>
      <label htmlFor={own}>{label}</label>
      <input
        id={own}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') onEnter();
        }}
        autoComplete="off"
        spellCheck={false}
        data-autofocus={dialogFocus ? '' : undefined}
        data-testid={testId}
      />
    </div>
  );
}
