'use client';

/**
 * Switch (design.punji.app/components/switch): an on/off setting that takes
 * effect at once (an alert, sharing). A real button with role="switch" and
 * aria-checked; name it with `labelledBy` (the row's visible title) or
 * `label`. `busy` while the change is saving. A choice that waits for a
 * Save is a Checkbox.
 */

export interface SwitchProps {
  /** Whether the setting is on. The switch is controlled. */
  checked: boolean;
  /** Called with the new state (true or false) when the person presses it. */
  onChange: (next: boolean) => void;
  /** The accessible name, when the setting has no visible title. Prefer `labelledBy`. */
  label?: string;
  /** The id of the element that holds the setting's visible title; becomes aria-labelledby. */
  labelledBy?: string;
  /** The id of an element that describes the setting (the line under its title); becomes aria-describedby. */
  describedBy?: string;
  /** Not available: dimmed and not focusable by press. */
  disabled?: boolean;
  /** The change is saving: sets aria-busy. Also pass `disabled` so it cannot be pressed twice. */
  busy?: boolean;
  /** The id of the button element. */
  id?: string;
  /** Becomes data-testid on the button. */
  testId?: string;
}

export function Switch({ checked, onChange, label, labelledBy, describedBy, disabled, busy, id, testId }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      className="kit-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-testid={testId}
    >
      <span aria-hidden="true" />
    </button>
  );
}
