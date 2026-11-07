'use client';

import type { DateRangePreset } from '../date-range-presets/presets.ts';
import { BsStatusMark, type BsDateLabels } from '../internal/dualDate.tsx';

export interface DateRangePresetListProps {
  /** The quick ranges, in order (see `dateRangePresets`). */
  presets: readonly DateRangePreset[];
  /** The current range; a preset with the same start and end is marked pressed. */
  value: { start: string; end: string | null } | null;
  /** Called with the inclusive range of the chosen preset. */
  onSelect: (range: { start: string; end: string }) => void;
  /** Disable a preset (for example when it crosses an unavailable day). */
  isDisabled?: (range: { start: string; end: string }) => boolean;
  /** Accessible name of the group. Default "Quick ranges". */
  label?: string;
  /** Words for the "projected" marker on a preset whose range is projected. */
  labels?: Partial<BsDateLabels>;
}

/** A row of toggle buttons, one per preset range. Used inside DateRangePicker; also usable beside an inline Calendar in range mode. */
export function DateRangePresetList({ presets, value, onSelect, isDisabled, label = 'Quick ranges', labels }: DateRangePresetListProps) {
  return (
    <div className="pu-date-presets" role="group" aria-label={label}>
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="pu-date-preset"
          aria-pressed={value?.start === preset.range.start && value.end === preset.range.end}
          disabled={isDisabled?.(preset.range) ?? false}
          onClick={() => onSelect(preset.range)}
        >
          {preset.label}{preset.projected && <BsStatusMark status="projected" labels={labels} />}
        </button>
      ))}
    </div>
  );
}
