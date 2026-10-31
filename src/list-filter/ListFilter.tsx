'use client';

/**
 * A list's own filter: one field over rows already on the page, matched in
 * memory (no request). The × button and Esc clear it. With `slash`, `/`
 * focuses it when nothing else is being typed in and no dialog is open (ahead
 * of the shell's `/`, which opens the command menu; ⌘K stays the command menu).
 *
 * Sizes match `Select` so the two sit in one row: md 36 px (account pages),
 * lg 44 px (public toolbars, 16 px text so a phone does not zoom on focus).
 * The label is hidden (spoken, and the placeholder unless one is given) or
 * shown above, as on `Select`.
 */
import { useEffect, useId, useRef } from 'react';


const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

interface ListFilterProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  clear: string;
  testId: string;
  slash?: boolean;
  size?: 'md' | 'lg';
  labelPlacement?: 'hidden' | 'above';
  placeholder?: string;
  id?: string;
  onBlur?: () => void;
  /** The input's form name, for a field inside a plain GET form that works without script. */
  name?: string;
  /** Select what is there when the field takes focus, so typing replaces an example. */
  selectOnFocus?: boolean;
}

export function ListFilter({ value, onChange, label, clear, testId, slash = false, size = 'md', labelPlacement = 'hidden', placeholder, id, onBlur, name, selectOnFocus }: ListFilterProps) {
  const input = useRef<HTMLInputElement>(null);
  const auto = useId();
  const inputId = id ?? `${auto}-lf`;
  const above = labelPlacement === 'above';
  useEffect(() => {
    if (!slash) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(TYPING) || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [slash]);
  const box = (
    <div className={`kit-lf${size === 'lg' ? ' lg' : ''}`} role="search">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3.5 3.5" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        id={inputId}
        type="search"
        aria-label={above ? undefined : label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        name={name}
        onFocus={selectOnFocus ? (e) => e.currentTarget.select() : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }
        }}
        autoComplete="off"
        spellCheck={false}
        data-testid={testId}
      />
      {slash && !value && <kbd aria-hidden="true">/</kbd>}
      {value && (
        <button type="button" className="kit-lf-x" onClick={() => { onChange(''); input.current?.focus(); }} aria-label={clear} data-testid={`${testId}-clear`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
  if (!above) return box;
  return (
    <div className="kit-lf-f">
      <label className="kit-lf-l" htmlFor={inputId}>
        {label}
      </label>
      {box}
    </div>
  );
}
