'use client';

/** Native select with a themed desktop picker where base-select is supported.
 * Touch/unsupported browsers keep the platform picker. No proxy form controls.
 */
import { useId, useLayoutEffect, useRef, type ReactNode, type SelectHTMLAttributes } from 'react';


import { useMediaQuery } from '../use-media-query/useMediaQuery.ts';

export type ControlSize = 'sm' | 'md' | 'lg';

export interface SelectOption<T extends string = string> {
  /** What onChange receives when this option is chosen. */
  value: T;
  /** The words shown for the option. */
  label: string;
  /** Listed but not choosable. */
  disabled?: boolean;
  /** The group's name ("Sectors"): consecutive options with the same group share one <optgroup>. */
  group?: string;
}

/** Options in order, runs of the same `group` gathered under it. */
function groupOptions<T extends string>(options: readonly SelectOption<T>[]): { group: string | null; options: SelectOption<T>[] }[] {
  const out: { group: string | null; options: SelectOption<T>[] }[] = [];
  for (const o of options) {
    const g = o.group ?? null;
    const last = out[out.length - 1];
    if (last && last.group === g) last.options.push(o);
    else out.push({ group: g, options: [o] });
  }
  return out;
}

export interface SelectProps<T extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'size' | 'className'> {
  /** The chosen option's value. The select is controlled. */
  value: T;
  /** Called with the chosen option's value (not the event). */
  onChange: (v: T) => void;
  /** The choices, in order. Consecutive options with the same `group` share one <optgroup>. */
  options: readonly SelectOption<T>[];
  /** The accessible name. Omit only when an outside <label htmlFor={id}> names it. */
  label?: ReactNode;
  /** 'hidden' (default) keeps the name for screen readers only. */
  labelPlacement?: 'hidden' | 'above' | 'inline';
  /** Control height: sm 32px, md 36px (default), lg 44px. */
  size?: ControlSize;
  /** Fills its container's width. */
  block?: boolean;
  /** No box: the select sits inside a surrounding control that draws its own. */
  bare?: boolean;
  /** Disables the control, sets aria-busy and shows a spinner in place of the chevron. */
  loading?: boolean;
  /** Keep the platform picker on every device (also the automatic fallback). */
  native?: boolean;
  /** Becomes data-testid on the <select>. */
  testId?: string;
  /** Layout only (grow in a row); never restyle the box per page. */
  className?: string;
}

export function ChevronDown() {
  return (
    <svg className="kit-sel-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  labelPlacement = 'hidden',
  size = 'md',
  block,
  bare,
  loading,
  native,
  testId,
  className,
  id: idProp,
  disabled,
  ...rest
}: SelectProps<T>) {
  const auto = useId();
  const id = idProp ?? auto;
  const element = useRef<HTMLSelectElement>(null);
  const pointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const enhanced = pointer && !native && !rest.multiple && options.length > 0 && typeof CSS !== 'undefined' && CSS.supports('appearance','base-select');
  // The browser owns selectedcontent. Keep new select markup out of React's
  // legacy nesting validator and out of server HTML parsed by older engines.
  useLayoutEffect(()=>{
    if(!enhanced||!element.current)return;
    const button=document.createElement('button');button.type='button';button.tabIndex=-1;
    button.append(document.createElement('selectedcontent'));element.current.prepend(button);
    return ()=>button.remove();
  },[enhanced]);
  const box = (
    <span className={`kit-sel ${size}${bare ? ' bare' : ''}`}>
      <select
        {...rest}
        id={id}
        ref={element}
        data-native={native || !options.length || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-testid={testId}
      >
        {groupOptions(options).map((run, i) => {
          const items = run.options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ));
          return run.group === null ? items : (
            <optgroup key={`${run.group}-${i}`} label={run.group}>
              {items}
            </optgroup>
          );
        })}
      </select>
      {loading ? <span className="kit-spin kit-sel-ico" aria-hidden="true" /> : <ChevronDown />}
    </span>
  );
  const cls = `kit-sel-f ${labelPlacement}${block ? ' block' : ''}${bare ? ' bare' : ''}${className ? ` ${className}` : ''}`;
  if (label === undefined || label === null) return <span className={cls}>{box}</span>;
  return (
    <span className={cls}>
      <label htmlFor={id} className={labelPlacement === 'hidden' ? 'kit-sr' : 'kit-sel-l'}>
        {label}
      </label>
      {box}
    </span>
  );
}
