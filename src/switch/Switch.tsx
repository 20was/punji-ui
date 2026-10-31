'use client';

/**
 * Switch (design.punji.app/components/switch): an on/off setting that takes
 * effect at once (an alert, sharing). A real button with role="switch" and
 * aria-checked; name it with `labelledBy` (the row's visible title) or
 * `label`. `busy` while the change is saving. A choice that waits for a
 * Save is a Checkbox.
 */

export function Switch({ checked, onChange, label, labelledBy, describedBy, disabled, busy, id, testId }: { checked: boolean; onChange: (next: boolean) => void; label?: string; labelledBy?: string; describedBy?: string; disabled?: boolean; busy?: boolean; id?: string; testId?: string }) {
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
