'use client';

import type { ControlSize } from '../select/Select.tsx';

export interface ChoiceOption<T extends string = string> {
  /** What onChange receives when this option is chosen. */
  value: T;
  /** The words shown for the option. */
  label: string;
  /** Shown dimmed and skipped by the arrow keys. */
  disabled?: boolean;
}
export interface ChoiceGroupProps<T extends string = string> {
  /** The choices, in order. */
  options: readonly ChoiceOption<T>[];
  /** The chosen option's value. The group is controlled. */
  value: T;
  /** Called with the chosen option's value (not the event). */
  onChange: (value: T) => void;
  /** The group's accessible name (the fieldset's aria-label). */
  label: string;
  /** Unique per group, also used for native radio grouping. */
  testId: string;
  /** Control height: sm 32px, md 36px, lg 44px (default). */
  size?: ControlSize;
  /** underline (default): labels with an underline on the chosen one. compact: a tighter look for dense toolbars. */
  appearance?: 'underline' | 'compact';
}

/** Native exclusive choices: the browser provides arrow keys, focus and disabled handling. */
export function ChoiceGroup<T extends string>({ options, value, onChange, label, testId, size = 'lg', appearance = 'underline' }: ChoiceGroupProps<T>) {
  return <fieldset className={`kit-choice kit-choice-${appearance} ${size}`} data-testid={testId} aria-label={label}>
    {options.map(({ value: optionValue, label: optionLabel, disabled }) => <label key={optionValue}>
      <input type="radio" name={testId} value={optionValue} checked={optionValue === value} disabled={disabled} onChange={() => onChange(optionValue)} data-testid={`${testId}-${optionValue}`} />
      {optionLabel}
    </label>)}
  </fieldset>;
}
