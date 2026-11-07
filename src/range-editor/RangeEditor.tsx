'use client';

/**
 * FilterPopover and RangeEditor (design.punji.app/components/range-editor).
 *
 * FilterPopover: the surface a filter bar opens, a Popover with a title and a close button, placed under the
 * button that opened it (clamped to the screen, flipped above it when there is no room). Esc and the close button
 * close it and put focus back on the opener; a click outside closes it where the reader clicked. Focus starts in
 * the first field.
 *
 * RangeEditor: one range filter's body. A line on what the measure is, where the whole set sits on it (a chart
 * the page hands in, such as a Histogram with the kept buckets filled), quick ranges, a range slider, From and To
 * as number fields, then Clear and one primary action that says the result ("Show 3 stocks"). A range that cannot
 * work (To under From) says so under To, rings the field and turns the action off; nothing applies until the
 * action is pressed. The two ends are exact decimal strings ("" for no limit): the slider moves over whole steps
 * of the `track` and writes the ends back with exact decimal arithmetic, so a price of 0.1 is never 0.1000000001.
 */
import { useId, useMemo, type ReactNode, type RefObject } from 'react';

import { Button } from '../button/Button.tsx';
import { NumberField } from '../fields/Fields.tsx';
import { Popover, type PopoverCloseReason } from '../popover/Popover.tsx';
import { RangeSlider } from '../range-slider/RangeSlider.tsx';

export interface FilterPopoverProps {
  /** Shown; default true. A filter bar renders it only while it is open. */
  open?: boolean;
  /** The popover's name, shown as its heading ("P/B", "Add filter"). */
  title: string;
  /** Closes it. `refocus` is false when the reader clicked elsewhere (focus stays where they clicked). */
  onClose: (refocus?: boolean) => void;
  /** The button that opened it: a click on it is not "outside", and focus returns to it. An element, or a ref to one. */
  anchor?: HTMLElement | null | RefObject<HTMLElement | null>;
  /** 440px wide instead of 360px (a range editor; a two-column menu). */
  wide?: boolean;
  /** The close button's accessible name. */
  closeLabel?: string;
  /** A selector inside it to focus first. Default: the first field, else the first filter-menu item. */
  initialFocus?: string;
  /** Becomes data-testid on the panel. */
  testId?: string;
  /** The body: a RangeEditor, a FilterMenu, a list. */
  children: ReactNode;
}

const CLOSE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/**
 * A panel under the control that opened it, for a filter's editor or the "Add filter" list.
 * @stability beta
 */
export function FilterPopover({ open = true, title, onClose, anchor, wide, closeLabel = 'Close', initialFocus = 'input:not([type="range"]), .pu-filter-menu-item:not(:disabled)', testId, children }: FilterPopoverProps) {
  const id = useId();
  const ref = useMemo<RefObject<HTMLElement | null>>(() => (anchor && 'current' in anchor ? anchor : { current: anchor ?? null }), [anchor]);
  return (
    <Popover
      open={open}
      portal
      align="start"
      width={wide ? 440 : 360}
      anchor={ref}
      label={title}
      initialFocus={initialFocus}
      onClose={(reason: PopoverCloseReason) => onClose(reason === 'escape')}
      testId={testId}
    >
      <div className="pu-filter-popover">
        <div className="pu-filter-popover-head">
          <h2 id={`${id}-h`}>{title}</h2>
          <button type="button" className="pu-filter-popover-close" onClick={() => onClose(true)} aria-label={closeLabel}>
            {CLOSE_ICON}
          </button>
        </div>
        <div className="pu-filter-popover-body">{children}</div>
      </div>
    </Popover>
  );
}

/** A quick range: one press fills both ends. */
export interface RangePreset {
  /** Unique among the presets; the key. */
  id: string;
  /** The words ("Under 12", "Value"). */
  label: string;
  /** The lower end as typed ("" for no limit). */
  from: string;
  /** The upper end as typed ("" for no limit). */
  to: string;
}

/** The slider's track: whole steps between two exact decimals. An end of the track means "no limit". */
export interface RangeTrack {
  /** The low end of the track, a plain decimal string ("0", "-20"). */
  min: string;
  /** The high end of the track. */
  max: string;
  /** One step, a positive plain decimal string ("0.5", "1000"). The track must be a whole number of steps, 2,000 at most. */
  step: string;
}

export interface RangeEditorProps {
  /** One line on what the measure is. */
  why?: ReactNode;
  /** Over the chart ("Where the market sits"). */
  chartTitle?: ReactNode;
  /** A chart of the whole set on this measure (a Histogram with the kept buckets filled). */
  chart?: ReactNode;
  /** Quick ranges shown as pressable chips above the fields. */
  presets?: readonly RangePreset[];
  /** The presets' group name for screen readers ("Quick ranges"). */
  presetsLabel?: string;
  /** Adds a range slider over this track. The fields stay the exact source of truth. */
  track?: RangeTrack;
  /** Said after each thumb's name to tell it from the field ("From (slider)"). */
  sliderLabel?: string;
  /** A track value in words with its unit ("Rs 4,500", "12%"). Default: the value as is. */
  formatTrackValue?: (value: string) => string;
  /** The lower end as typed ("" for no limit). */
  from: string;
  /** The upper end as typed ("" for no limit). */
  to: string;
  /** Called with the lower end as typed. */
  onFrom: (value: string) => void;
  /** Called with the upper end as typed. */
  onTo: (value: string) => void;
  /** The lower field's label. */
  fromLabel?: string;
  /** The upper field's label. */
  toLabel?: string;
  /** In an empty field, and what the slider says at the end of its track ("No limit"). */
  placeholder?: string;
  /** Most fraction digits a field accepts (default 2). */
  maxFractionDigits?: number;
  /** Why the range cannot work, said under To ("To must be at least From."). Turns the action off. */
  error?: string;
  /** The Clear button's words. */
  clearLabel?: string;
  /** Clears the range. */
  onClear: () => void;
  /** The result in words ("Show 3 stocks", "No stock fits"). */
  applyLabel: string;
  /** Applies the range. */
  onApply: () => void;
  /** The action is off for another reason (nothing would change). */
  applyOff?: boolean;
  /** Fields and buttons get `-min`, `-max`, `-clear`, `-apply`, `-slider`. */
  testIdPrefix?: string;
}

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;
const MAX_STEPS = 2000;

const scaledOf = (text: string, scale: number): bigint | null => {
  const m = DECIMAL.exec(text.trim());
  if (!m) return null;
  const n = BigInt((m[2] ?? '0') + (m[3] ?? '').padEnd(scale, '0'));
  return m[1] ? -n : n;
};
const digits = (text: string) => DECIMAL.exec(text.trim())?.[3]?.length ?? 0;

/** Exact index arithmetic for the slider; `null` when the track is not whole steps. */
function trackMath(track: RangeTrack | undefined) {
  if (!track) return null;
  const scale = Math.max(digits(track.min), digits(track.max), digits(track.step));
  const lo = scaledOf(track.min, scale);
  const hi = scaledOf(track.max, scale);
  const st = scaledOf(track.step, scale);
  if (lo === null || hi === null || st === null || st <= 0n || hi <= lo || (hi - lo) % st !== 0n) return null;
  const count = (hi - lo) / st;
  if (count > BigInt(MAX_STEPS)) return null;
  const steps = Number(count);
  /** The step nearest a typed end; an empty or unreadable field is the track's end it stands for. */
  const indexOf = (text: string, whenEmpty: number): number => {
    if (text.trim() === '') return whenEmpty;
    const v = scaledOf(text, scale);
    if (v === null) return whenEmpty;
    if (v <= lo) return 0;
    if (v >= hi) return steps;
    return Number(((v - lo) * 2n + st) / (st * 2n));
  };
  const valueAt = (index: number): string => {
    const n = lo + BigInt(index) * st;
    const negative = n < 0n;
    const raw = (negative ? -n : n).toString().padStart(scale + 1, '0');
    const text = scale === 0 ? raw : `${raw.slice(0, -scale)}.${raw.slice(-scale)}`;
    return negative ? `-${text}` : text;
  };
  return { steps, indexOf, valueAt };
}

/**
 * One range filter's body: fields, optional slider, chart and quick ranges, Clear and the result.
 * @stability beta
 */
export function RangeEditor({
  why,
  chartTitle,
  chart,
  presets,
  presetsLabel = 'Quick ranges',
  track,
  sliderLabel = 'slider',
  formatTrackValue,
  from,
  to,
  onFrom,
  onTo,
  fromLabel = 'From',
  toLabel = 'To',
  placeholder = 'No limit',
  maxFractionDigits,
  error,
  clearLabel = 'Clear',
  onClear,
  applyLabel,
  onApply,
  applyOff,
  testIdPrefix,
}: RangeEditorProps) {
  const id = useId();
  const tid = (s: string) => (testIdPrefix ? `${testIdPrefix}-${s}` : undefined);
  const math = useMemo(() => trackMath(track), [track]);
  const loIndex = math ? math.indexOf(from, 0) : 0;
  const hiIndex = math ? math.indexOf(to, math.steps) : 0;
  return (
    <div className="pu-range-editor">
      {why && (
        <p className="pu-range-editor-why" id={`${id}-why`}>
          {why}
        </p>
      )}
      {chart && (
        <div className="pu-range-editor-chart">
          {chartTitle && <p className="pu-range-editor-chart-title">{chartTitle}</p>}
          {chart}
        </div>
      )}
      {presets && presets.length > 0 && (
        <div className="pu-range-editor-presets" role="group" aria-label={presetsLabel}>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className="pu-range-editor-preset"
              aria-pressed={from.trim() === p.from && to.trim() === p.to}
              onClick={() => {
                onFrom(p.from);
                onTo(p.to);
              }}
              data-testid={tid(`preset-${p.id}`)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      {math && (
        <div className="pu-range-editor-slider">
          <RangeSlider
            min={0}
            max={math.steps}
            step={1}
            lo={loIndex}
            hi={hiIndex}
            onChange={(lo, hi) => {
              if (lo !== loIndex) onFrom(lo <= 0 ? '' : math.valueAt(lo));
              if (hi !== hiIndex) onTo(hi >= math.steps ? '' : math.valueAt(hi));
            }}
            labelLo={`${fromLabel} (${sliderLabel})`}
            labelHi={`${toLabel} (${sliderLabel})`}
            valueText={(i, which) => (which === 'lo' ? i <= 0 : i >= math.steps) ? placeholder : (formatTrackValue ?? String)(math.valueAt(i))}
            testId={tid('slider') ?? `${id}-slider`}
          />
        </div>
      )}
      <div className="pu-range-editor-nums">
        <NumberField size="lg" label={fromLabel} value={from} onChange={onFrom} placeholder={placeholder} maxFractionDigits={maxFractionDigits} testId={tid('min')} />
        <NumberField size="lg" label={toLabel} value={to} onChange={onTo} placeholder={placeholder} maxFractionDigits={maxFractionDigits} error={error} testId={tid('max')} />
      </div>
      <div className="pu-range-editor-actions">
        <Button variant="secondary" size="lg" onClick={onClear} testId={tid('clear')}>
          {clearLabel}
        </Button>
        <Button variant="primary" size="lg" onClick={onApply} disabled={Boolean(error) || applyOff} aria-describedby={why ? `${id}-why` : undefined} testId={tid('apply')}>
          {applyLabel}
        </Button>
      </div>
    </div>
  );
}
