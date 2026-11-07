'use client';

/**
 * FilterBar (design.punji.app/components/filter-bar): a screener's filters in one row. A chip for each filter that
 * is set ("P/B 0.5 to 1.2"; the chip edits it, its × removes it), a chip with a caret for a list you pick several
 * from (Sector), and "+ Add filter", a FilterMenu by group. A range opens a RangeEditor in a FilterPopover (what
 * the measure is, where the set sits on it, quick ranges, From and To, the live count on the one action); a yes/no
 * filter turns on at once; a list applies as you tick it. Nothing in a range changes until its action is pressed.
 *
 * The bar owns no filter state: it takes `values` and calls `onChange` with the next ones, so they can live in
 * the address (`useUrlFilters`), a store or `useState`. Range ends are exact decimal strings ("" is never stored:
 * an absent end is no limit). It does not fetch or filter rows; `count` is how the page says how many a draft
 * would keep.
 */
import { useState, type ReactNode } from 'react';

import { Button } from '../button/Button.tsx';
import { Checkbox } from '../checkbox/Checkbox.tsx';
import { FilterChip } from '../filter-chip/FilterChip.tsx';
import { FilterMenu, FilterMenuGroup, FilterMenuItem } from '../filter-menu/FilterMenu.tsx';
import { normalizeDecimal, type RangeFilterValue } from '../filter-url/FilterUrl.ts';
import { compareDecimals, parseLocalizedDecimal } from '../nepal/decimal.ts';
import { FilterPopover, RangeEditor, type RangePreset, type RangeTrack } from '../range-editor/RangeEditor.tsx';

/** The filters that are set: a range, the chosen values of a list, or true for a yes/no filter. An absent key is not set. */
export type FilterBarValues = Readonly<Record<string, RangeFilterValue | readonly string[] | boolean | undefined>>;

interface FilterBarFieldBase {
  /** The key in `values` (and the query parameter, with `useUrlFilters`). */
  id: string;
  /** The filter's full name, the popover's heading and the menu item ("Price to book value"). */
  label: string;
  /** The shorter name on the chip ("P/B"). Default `label`. */
  chipLabel?: string;
  /** The id of a group in `groups` it is listed under. Default: the first group. */
  group?: string;
  /** A quieter second part after the name in the menu: a count, or the term in another language. */
  aside?: ReactNode;
  /** Listed but off (its group's `note` says why). */
  disabled?: boolean;
  /** Always show its chip, set or not (a list such as Sector). Default false. */
  pinned?: boolean;
}

/** A range between two exact decimals. */
export interface FilterBarRangeField extends FilterBarFieldBase {
  /** A range between two exact decimals. */
  kind: 'range';
  /** One line on what the measure is. */
  why?: ReactNode;
  /** Over the chart ("Where the market sits"). */
  chartTitle?: ReactNode;
  /** The chart of the whole set, given the draft ends as typed so it can fill the kept buckets. */
  chart?: (draft: { from: string; to: string }) => ReactNode;
  /** Quick ranges. */
  presets?: readonly RangePreset[];
  /** A range slider over this track. */
  track?: RangeTrack;
  /** Most fraction digits an end may carry (default 2). */
  fractionDigits?: number;
  /** An end in words with its unit, on the chip and the slider ("Rs 4,500", "12%"). Default: the decimal as is. */
  formatValue?: (value: string) => string;
}

/** Several values from a list, each with an optional count. */
export interface FilterBarMultiField extends FilterBarFieldBase {
  /** Several values from a list. */
  kind: 'multi';
  /** The values to choose from. */
  options: readonly { value: string; label: string; count?: ReactNode }[];
}

/** A yes/no filter. */
export interface FilterBarBooleanField extends FilterBarFieldBase {
  /** A yes/no filter. */
  kind: 'boolean';
}

export type FilterBarField = FilterBarRangeField | FilterBarMultiField | FilterBarBooleanField;

/** A heading in the "Add filter" list. */
export interface FilterBarGroup {
  /** What `FilterBarField.group` refers to. */
  id: string;
  /** The heading ("Valuation"). */
  title: string;
  /** Said under the group when one of its filters is off ("Choose only banks under Sector first."). */
  note?: ReactNode;
  /** Which column of the menu the group goes down. Default 1. */
  column?: 1 | 2;
}

/** The words. Templates take `{count}`, `{min}`, `{max}`, `{label}` and `{digits}`. */
export interface FilterBarLabels {
  /** The bar's group name. */
  filters: string;
  /** The add button and the menu's heading. */
  add: string;
  /** The popover's close button. */
  close: string;
  /** A range's lower field. */
  from: string;
  /** A range's upper field. */
  to: string;
  /** A range's Clear button. */
  clear: string;
  /** An empty range field. */
  noLimit: string;
  /** Read before a chip's words to say it opens an editor. */
  edit: string;
  /** A chip's × ("Remove {label}"). */
  remove: string;
  /** The range action with several results ("Show {count} results"). */
  applyMany: string;
  /** The range action with one result. */
  applyOne: string;
  /** The range action with none. */
  applyNone: string;
  /** The range action when the page gives no count. */
  apply: string;
  /** Under To when it is below From. */
  toBelowFrom: string;
  /** Under To when a field is not a number ("{digits}" fraction digits at most). */
  invalid: string;
  /** A range with only a lower end ("from {min}"). */
  rangeFrom: string;
  /** A range with only an upper end ("up to {max}"). */
  rangeUpTo: string;
  /** A range with both ends ("{min} to {max}"). */
  rangeBetween: string;
  /** A list chip with nothing chosen. */
  all: string;
  /** A list chip with several chosen ("{count} chosen"). */
  some: string;
  /** Said after a set filter's name in the Add filter list. */
  set: string;
  /** A list's Clear button. */
  clearChoice: string;
  /** The quick ranges' group name. */
  quickRanges: string;
  /** Said after a thumb's name to tell it from the field. */
  slider: string;
}

export const FILTER_BAR_LABELS: FilterBarLabels = {
  filters: 'Filters',
  add: 'Add filter',
  close: 'Close',
  from: 'From',
  to: 'To',
  clear: 'Clear',
  noLimit: 'No limit',
  edit: 'Edit',
  remove: 'Remove {label}',
  applyMany: 'Show {count} results',
  applyOne: 'Show 1 result',
  applyNone: 'No results',
  apply: 'Apply',
  toBelowFrom: 'To must be at least From.',
  invalid: 'Enter a number with up to {digits} decimal places.',
  rangeFrom: 'from {min}',
  rangeUpTo: 'up to {max}',
  rangeBetween: '{min} to {max}',
  all: 'All',
  some: '{count} chosen',
  set: 'set',
  clearChoice: 'Clear',
  quickRanges: 'Quick ranges',
  slider: 'slider',
};

export interface FilterBarProps<V extends FilterBarValues = FilterBarValues> {
  /** The filters you offer. */
  fields: readonly FilterBarField[];
  /** The headings of the "Add filter" list, in order. Omit for one list. */
  groups?: readonly FilterBarGroup[];
  /** The filters that are set now. */
  values: V;
  /** Called with the next filters (a range applied or cleared, a list ticked, a chip removed). */
  onChange: (next: V) => void;
  /** How many items a draft of the filters would keep; shown on a range's action. Leave out to show "Apply". */
  count?: (draft: V) => number | undefined;
  /** Replaces words, merged over the locale pack and the English defaults. */
  labels?: Partial<FilterBarLabels>;
  /** Content after "Add filter": a Clear all, a share-link button. */
  end?: ReactNode;
  /** Becomes data-testid on the bar; chips and parts get `<testId>-<field id>`, `<testId>-add`. */
  testId?: string;
}

type Open = { kind: 'add' } | { kind: 'edit'; id: string } | null;

const fill = (template: string, vars: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
const isRange = (v: unknown): v is RangeFilterValue => typeof v === 'object' && v !== null && !Array.isArray(v);
const rangeSet = (v: unknown): v is RangeFilterValue => isRange(v) && (v.min !== undefined || v.max !== undefined);
const listOf = (v: unknown): readonly string[] => (Array.isArray(v) ? (v as string[]) : []);

/**
 * A screener's filter bar: chips, "+ Add filter", editors in popovers. State stays with you.
 * @stability beta
 */
export function FilterBar<V extends FilterBarValues = FilterBarValues>({ fields, groups, values, onChange, count, labels, end, testId }: FilterBarProps<V>) {
  const l = { ...FILTER_BAR_LABELS, ...labels };
  const [open, setOpen] = useState<Open>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tid = (s: string) => (testId ? `${testId}-${s}` : undefined);

  const without = (id: string) => Object.fromEntries(Object.entries(values).filter(([k]) => k !== id)) as V;
  const withValue = (id: string, value: unknown) => ({ ...values, [id]: value }) as V;
  const show = (next: Open, el: HTMLElement) => {
    setAnchor(el);
    setOpen((was) => (was && next && was.kind === next.kind && (was.kind !== 'edit' || (next.kind === 'edit' && was.id === next.id)) ? null : next));
  };
  const close = (refocus = true) => {
    setOpen(null);
    if (refocus) anchor?.focus();
  };

  const isSet = (f: FilterBarField): boolean => {
    const v = values[f.id];
    return f.kind === 'range' ? rangeSet(v) : f.kind === 'multi' ? listOf(v).length > 0 : v === true;
  };
  const editing = open?.kind === 'edit' ? fields.find((f) => f.id === open.id) : undefined;
  const rangeText = (f: FilterBarRangeField, r: RangeFilterValue) => {
    const fmt = f.formatValue ?? ((x: string) => x);
    return r.min !== undefined && r.max !== undefined ? fill(l.rangeBetween, { min: fmt(r.min), max: fmt(r.max) }) : r.min !== undefined ? fill(l.rangeFrom, { min: fmt(r.min) }) : fill(l.rangeUpTo, { max: fmt(r.max ?? '') });
  };
  const listText = (f: FilterBarMultiField) => {
    const chosen = listOf(values[f.id]);
    return chosen.length === 0 ? l.all : chosen.length === 1 ? (f.options.find((o) => o.value === chosen[0])?.label ?? chosen[0]) : fill(l.some, { count: chosen.length });
  };

  const chips = fields.map((f) => {
    const name = f.chipLabel ?? f.label;
    const set = isSet(f);
    if (f.kind === 'multi' && (f.pinned || set)) {
      return <FilterChip key={f.id} label={`${name} ·`} value={listText(f)} caret openPrefix={l.edit} expanded={open?.kind === 'edit' && open.id === f.id} onOpen={(el) => show({ kind: 'edit', id: f.id }, el)} {...(set && !f.pinned ? { onRemove: () => onChange(without(f.id)), removeLabel: fill(l.remove, { label: f.label }) } : {})} testId={tid(f.id)} />;
    }
    if (!set) return null;
    const remove = { onRemove: () => onChange(without(f.id)), removeLabel: fill(l.remove, { label: f.label }) };
    if (f.kind === 'range') {
      return <FilterChip key={f.id} label={name} value={rangeText(f, values[f.id] as RangeFilterValue)} openPrefix={l.edit} expanded={open?.kind === 'edit' && open.id === f.id} onOpen={(el) => show({ kind: 'edit', id: f.id }, el)} {...remove} testId={tid(f.id)} />;
    }
    return <FilterChip key={f.id} label={name} {...remove} testId={tid(f.id)} />;
  });

  const groupList: readonly FilterBarGroup[] = groups && groups.length > 0 ? groups : [{ id: '', title: l.add }];

  return (
    <div className="pu-filter-bar" role="group" aria-label={l.filters} data-testid={testId}>
      {chips}
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        aria-expanded={open?.kind === 'add'}
        onClick={(e) => show({ kind: 'add' }, e.currentTarget)}
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        }
        testId={tid('add')}
      >
        {l.add}
      </Button>
      {end}

      {open?.kind === 'add' && (
        <FilterPopover key="add" title={l.add} closeLabel={l.close} anchor={anchor} onClose={close} wide testId={tid('add-popover')}>
          <FilterMenu label={l.add} testId={tid('add-menu')}>
            {groupList.map((g, gi) => {
              const items = fields.filter((f) => (f.group ?? groupList[0]?.id) === g.id || (f.group === undefined && gi === 0));
              if (items.length === 0) return null;
              const off = items.some((f) => f.disabled);
              return (
                <FilterMenuGroup key={g.id} title={g.title} column={g.column ?? 1} note={off ? g.note : undefined} noteTestId={tid(`${g.id}-note`)}>
                  {items.map((f) => (
                    <FilterMenuItem
                      key={f.id}
                      toggle={f.kind === 'boolean'}
                      on={isSet(f)}
                      disabled={f.disabled}
                      aside={f.aside}
                      onLabel={l.set}
                      onClick={() => {
                        if (f.kind === 'boolean') {
                          onChange(isSet(f) ? without(f.id) : withValue(f.id, true));
                          close();
                        } else setOpen({ kind: 'edit', id: f.id });
                      }}
                      testId={tid(`add-${f.id}`)}
                    >
                      {f.label}
                    </FilterMenuItem>
                  ))}
                </FilterMenuGroup>
              );
            })}
          </FilterMenu>
        </FilterPopover>
      )}

      {editing?.kind === 'range' && (
        <FilterPopover key={`edit-${editing.id}`} title={editing.label} closeLabel={l.close} anchor={anchor} onClose={close} wide testId={tid(`${editing.id}-editor`)}>
          <RangeFieldEditor
            field={editing}
            current={values[editing.id]}
            l={l}
            countFor={(next) => (count ? count(next === undefined ? without(editing.id) : withValue(editing.id, next)) : undefined)}
            onApply={(next) => {
              onChange(next === undefined ? without(editing.id) : withValue(editing.id, next));
              close();
            }}
            testIdPrefix={tid(`${editing.id}-editor`)}
          />
        </FilterPopover>
      )}

      {editing?.kind === 'multi' && (
        <FilterPopover key={`edit-${editing.id}`} title={editing.label} closeLabel={l.close} anchor={anchor} onClose={close} testId={tid(`${editing.id}-editor`)}>
          <div className="pu-filter-bar-list" role="group" aria-label={editing.label}>
            {editing.options.map((o) => {
              const chosen = listOf(values[editing.id]);
              return (
                <Checkbox
                  key={o.value}
                  checked={chosen.includes(o.value)}
                  onChange={(on) => {
                    const next = on ? [...chosen, o.value] : chosen.filter((x) => x !== o.value);
                    onChange(next.length === 0 ? without(editing.id) : withValue(editing.id, editing.options.map((x) => x.value).filter((x) => next.includes(x))));
                  }}
                  end={o.count}
                  rowTestId={tid(`${editing.id}-${o.value}`)}
                >
                  {o.label}
                </Checkbox>
              );
            })}
            {listOf(values[editing.id]).length > 0 && (
              <div className="pu-filter-bar-list-clear">
                <Button variant="ghost" size="sm" onClick={() => onChange(without(editing.id))} testId={tid(`${editing.id}-clear`)}>
                  {l.clearChoice}
                </Button>
              </div>
            )}
          </div>
        </FilterPopover>
      )}
    </div>
  );
}

/** One range field's editor: draft ends as typed, validated as exact decimals, the count on the action. */
function RangeFieldEditor({ field, current, l, countFor, onApply, testIdPrefix }: { field: FilterBarRangeField; current: unknown; l: FilterBarLabels; countFor: (next: RangeFilterValue | undefined) => number | undefined; onApply: (next: RangeFilterValue | undefined) => void; testIdPrefix: string | undefined }) {
  const digits = field.fractionDigits ?? 2;
  const start = isRange(current) ? current : {};
  const [from, setFrom] = useState(start.min ?? '');
  const [to, setTo] = useState(start.max ?? '');
  const end = (text: string): { ok: true; value: string | undefined } | { ok: false } => {
    const parsed = parseLocalizedDecimal(text, { maxFractionDigits: digits });
    if (parsed.state === 'empty') return { ok: true, value: undefined };
    if (parsed.state !== 'valid') return { ok: false };
    const value = normalizeDecimal(parsed.value, digits);
    return value === null ? { ok: false } : { ok: true, value };
  };
  const a = end(from);
  const b = end(to);
  const valid = a.ok && b.ok;
  const min = a.ok ? a.value : undefined;
  const max = b.ok ? b.value : undefined;
  const crossed = valid && min !== undefined && max !== undefined && compareDecimals(min, max) > 0;
  const error = !valid ? fill(l.invalid, { digits }) : crossed ? l.toBelowFrom : undefined;
  const draft: RangeFilterValue | undefined = min === undefined && max === undefined ? undefined : { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) };
  const n = error ? 0 : countFor(draft);
  const applyLabel = error || n === undefined ? l.apply : n === 0 ? l.applyNone : n === 1 ? l.applyOne : fill(l.applyMany, { count: n.toLocaleString('en-US') });
  return (
    <RangeEditor
      {...(field.why ? { why: field.why } : {})}
      {...(field.chartTitle ? { chartTitle: field.chartTitle } : {})}
      {...(field.chart ? { chart: field.chart({ from, to }) } : {})}
      {...(field.presets ? { presets: field.presets, presetsLabel: l.quickRanges } : {})}
      {...(field.track ? { track: field.track, sliderLabel: l.slider } : {})}
      {...(field.formatValue ? { formatTrackValue: field.formatValue } : {})}
      from={from}
      to={to}
      onFrom={setFrom}
      onTo={setTo}
      fromLabel={l.from}
      toLabel={l.to}
      placeholder={l.noLimit}
      maxFractionDigits={digits}
      {...(error ? { error } : {})}
      clearLabel={l.clear}
      onClear={() => onApply(undefined)}
      applyLabel={applyLabel}
      onApply={() => onApply(draft)}
      {...(testIdPrefix ? { testIdPrefix } : {})}
    />
  );
}
