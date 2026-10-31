'use client';

/**
 * Checkbox (design.punji.app/components/checkbox): one of several choices
 * that can each be on, or a yes/no that waits for the form's Save. A real
 * <input type="checkbox"> inside its <label>, so the whole row is the tap
 * target (44px on touch). `lead` draws before the words (a series swatch),
 * `end` after them (a count). A setting that applies at once is a Switch.
 */
import type { ReactNode } from 'react';


export interface CheckboxProps {
  /** Whether the box is ticked. The checkbox is controlled. */
  checked: boolean;
  /** Called with the new state (true or false), not the event. */
  onChange: (next: boolean) => void;
  /** The words next to the box; the whole row, label included, is the tap target. */
  children: ReactNode;
  /** Drawn before the words: a series swatch. Decorative; mark it aria-hidden. */
  lead?: ReactNode;
  /** Drawn after the words: a count or a short note. */
  end?: ReactNode;
  /** Shown dimmed and not choosable. */
  disabled?: boolean;
  /** Becomes data-testid on the <input>. */
  testId?: string;
  /** Becomes data-testid on the row's <label>. */
  rowTestId?: string;
}

export function Checkbox({ checked, onChange, children, lead, end, disabled, testId, rowTestId }: CheckboxProps) {
  return (
    <label className={`kit-check${disabled ? ' off' : ''}`} data-testid={rowTestId}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      {lead}
      <span className="kit-check-t">{children}</span>
      {end !== undefined && end !== null && <span className="kit-check-end">{end}</span>}
    </label>
  );
}
