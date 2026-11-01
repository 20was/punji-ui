'use client';

/**
 * One track, two thumbs: a range between `lo` and `hi`, the span between them
 * filled. Two native range inputs share the track (each thumb keeps the
 * browser's keyboard: arrows, Page Up/Down, Home/End, per thumb), only their
 * thumbs take the pointer, and a thumb never passes the other. Each says its
 * value in words (`valueText`, with units) to screen readers.
 */
export interface RangeSliderProps {
  /** The lowest value on the track. */
  min: number;
  /** The highest value on the track. */
  max: number;
  /** The size of one keyboard or drag step. */
  step: number;
  /** The lower thumb's value, between `min` and `hi`. */
  lo: number;
  /** The upper thumb's value, between `lo` and `max`. */
  hi: number;
  /** Called with both values when either thumb moves; a thumb never passes the other. */
  onChange: (lo: number, hi: number) => void;
  /** Accessible name of the lower thumb ("Cash yield minimum"). */
  labelLo: string;
  /** Accessible name of the upper thumb ("Cash yield maximum"). */
  labelHi: string;
  /** A thumb's value in words, with its unit ("4%", "Any"). */
  valueText: (v: number, which: 'lo' | 'hi') => string;
  /** Test ids `${testId}-min` and `${testId}-max` on the two inputs. */
  testId: string;
}

export function RangeSlider({ min, max, step, lo, hi, onChange, labelLo, labelHi, valueText, testId }: RangeSliderProps) {
  const span = max - min || 1;
  const pLo = ((lo - min) / span) * 100;
  const pHi = ((hi - min) / span) * 100;
  return (
    <div className="kit-rs" data-testid={testId}>
      <div className="kit-rs-track" aria-hidden="true">
        <i className="kit-rs-fill" style={{ insetInlineStart: `${pLo}%`, insetInlineEnd: `${100 - pHi}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={lo}
        aria-label={labelLo}
        aria-valuetext={valueText(lo, 'lo')}
        onChange={(e) => onChange(Math.min(Number(e.target.value), hi), hi)}
        // The low thumb sits above the high one when both are pushed to the top, so it can still be pulled down.
        style={{ zIndex: lo >= max - step ? 3 : 2 }}
        data-testid={`${testId}-min`}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={hi}
        aria-label={labelHi}
        aria-valuetext={valueText(hi, 'hi')}
        onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo))}
        data-testid={`${testId}-max`}
      />
    </div>
  );
}
