'use client';

/**
 * The account area's company finder and stock picker: one field (symbol or
 * name) with suggestions under it, ranked in memory over the build's
 * registry, so nothing is fetched while typing.
 *
 *   finder   (no `value`) choosing a suggestion (click, or ↑ ↓ then Enter)
 *            opens it; Enter on an exact symbol opens that; Esc clears, then
 *            leaves. `/` focuses it when nothing else is being typed in and
 *            no dialog is open (ahead of the shell's own `/`, which opens the
 *            command menu). Fundamentals' first run, the dividend book, the
 *            watchlist's add field (`size="md"`, `clearOnOpen`).
 *   picker   (`value`: the picked symbol, or null) the field shows the pick,
 *            its symbol and name (and `meta`, today's price). Click or focus
 *            turns it into the search in place, the symbol selected so typing
 *            replaces it; Esc, or leaving with no pick, puts the pick back
 *            (leaving with an exact symbol typed takes it, as Enter does).
 *            Under 768px a tap opens a full-height sheet with one input and
 *            the matches, and the phone tab bar steps aside (one bottom bar).
 *            `readOnly` shows a fixed pick (an edit). Backtest, the alert and
 *            holding forms, Seasonality.
 */
import { useEffect, useId, useMemo, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { searchSymbols, type SymbolOption } from '../format/format.ts';
import { comboClosed, comboStep, type ComboEvent, type ComboState } from '../combo-step/comboStep.ts';

const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const phone = () => !!window.matchMedia?.('(max-width: 767px)').matches;

export interface CompanySearchProps<T extends SymbolOption> {
  /** The companies to search, each a symbol and a name. Ranked in memory: exact symbol, symbol prefix, name word prefix, then symbol contains. */
  options: readonly T[];
  /** The visible label over the field ("Find any company"); also its accessible name. */
  label: string;
  /** The input's placeholder text. */
  placeholder: string;
  /** A suggestion was chosen (the finder opens it; the picker takes it as its new value). */
  onOpen: (symbol: string) => void;
  /** The line under a suggestion's symbol (name · sector). */
  sub?: (o: T) => string;
  /** Small tags at a suggestion's end (Your holdings, Watching, …). */
  tags?: (o: T) => ReactNode;
  /** "No company matches “{q}”." */
  none: (q: string) => ReactNode;
  /** Sets `data-testid` on the input (in the phone sheet: `<id>-sheet`, `<id>-sheet-input`, `<id>-sheet-close`). */
  testId: string;
  /** The suggestions' test ids: `${optionTestId}-${SYMBOL}`. */
  optionTestId: string;
  /** Sets `data-testid` on the list of suggestions. */
  listTestId?: string;
  /** Hide the label visually (it stays the field's name). */
  hideLabel?: boolean;
  /** 'lg' (default): the 52px finder a page leads with; 'md': the 40px field in a header or a form; 'sm': 36px, level with a Select and a SegmentedControl at md in one control row (44px on a phone, the touch minimum). */
  size?: 'sm' | 'md' | 'lg';
  /** The input's id (a page's own shortcut focuses it). */
  inputId?: string;
  /** The key shown in a finder: '/' (default, and bound here), another letter the page binds itself, or null for none. A picker shows none. */
  shortcut?: string | null;
  /**
   * Empty the field and close the list after a pick (default true, an add field ready for the next one).
   * `false` keeps what was typed in a finder, so a pick that only navigates leaves the query in place;
   * a picker always closes.
   */
  clearOnOpen?: boolean;
  /** A picker: the picked symbol (null: nothing yet). The field shows it with its name until it is clicked or focused. */
  value?: string | null;
  /** The picked value's name (default: its option's name). */
  valueName?: string;
  /** A fact at the picked value's end (today's price). */
  meta?: ReactNode;
  /** The shown pick's test id (its symbol, name and meta). */
  valueTestId?: string;
  /** A fixed pick (an edit): shown, never searched. */
  readOnly?: boolean;
  /** What is wrong, under the field. */
  error?: string;
  /** The list is not read yet: matches show as placeholders. */
  loading?: boolean;
  /** Start typed (a docs page's states). */
  initialQuery?: string;
  /** The phone sheet's back button's name ("Close"). */
  closeLabel?: string;
}


export function CompanySearch<T extends SymbolOption>({ options, label, placeholder, onOpen: open, sub, tags, none, testId, optionTestId, listTestId, hideLabel, size = 'lg', inputId, shortcut = '/', clearOnOpen = true, value, valueName, meta, valueTestId, readOnly, error, loading, initialQuery, closeLabel = 'Close' }: CompanySearchProps<T>) {
  const auto = useId();
  const id = inputId ?? `${auto}-in`;
  const picker = value !== undefined;
  const [st, setSt] = useState<ComboState>(() => ({ picker, editing: !picker || !!initialQuery, sheet: false, query: initialQuery ?? '', dirty: !!initialQuery, index: 0 }));
  const { editing, sheet, query, dirty } = st;
  const input = useRef<HTMLInputElement>(null);
  const sheetIn = useRef<HTMLInputElement>(null);
  const selectAll = useRef(false);
  const shown = !!query.trim() && (dirty || !picker);
  const hits = useMemo(() => (shown && !loading ? (searchSymbols(options, query, 8) as T[]) : []), [options, query, shown, loading]);
  const active = hits.length ? Math.min(st.index, hits.length - 1) : -1;
  const name = valueName ?? options.find((o) => o.symbol === value)?.name;
  const showValue = picker && !!value && (!editing || sheet);
  const errId = `${id}-err`;

  const known = (sym: string) => options.some((o) => o.symbol.toUpperCase() === sym);
  // The latest state, not this render's: a pick that moves focus fires the sheet input's blur before React re-renders.
  const live = useRef(st);
  useLayoutEffect(() => {
    live.current = st;
  });
  const run = (e: ComboEvent) => {
    const r = comboStep({ ...live.current, picker }, e);
    const next = clearOnOpen && r.pick ? comboClosed(r.state) : r.state;
    live.current = next;
    setSt(next);
    if (sheet && !r.state.sheet) input.current?.focus();
    if (r.blur) input.current?.blur();
    if (r.pick) open(r.pick);
    return r.handled;
  };
  const start = (typed?: string) => {
    if (!picker || readOnly) return;
    const inSheet = phone();
    selectAll.current = !inSheet && typed === undefined;
    run({ type: 'start', value: value ?? null, typed, phone: inSheet });
  };
  const onOpen = (symbol: string) => {
    // A suggestion is a committed choice in both finder and picker modes.
    // Close the list (and the phone sheet) before notifying the consumer.
    if (clearOnOpen || picker) run({ type: 'close' });
    open(symbol);
  };

  useEffect(() => {
    if (!selectAll.current) return;
    selectAll.current = false;
    input.current?.select();
  });
  useEffect(() => {
    if (sheet) sheetIn.current?.focus();
  }, [sheet]);

  useEffect(() => {
    if (shortcut !== '/' || picker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(TYPING) || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [shortcut, picker]);

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (picker && e.currentTarget === input.current && (!editing || sheet)) {
      if (readOnly || e.metaKey || e.ctrlKey || e.altKey) return;
      // A key on the shown pick starts the search: a letter is its first character; ↓, Enter, Space or Backspace opens it.
      const char = e.key.length === 1 && e.key !== ' ' ? e.key : undefined;
      if (char || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ' || e.key === 'Backspace') {
        e.preventDefault();
        start(char ?? (e.key === 'Backspace' ? '' : undefined));
      }
      return;
    }
    if (e.key === 'Tab' && sheet) {
      // The sheet is modal: Tab moves between its two controls.
      e.preventDefault();
      e.currentTarget.closest('[role="dialog"]')?.querySelector('button')?.focus();
      return;
    }
    if (run({ type: 'key', key: e.key, hits: hits.map((h) => h.symbol), value, known })) e.preventDefault();
  }

  const optId = (s: string) => `${auto}-opt-${s}`;
  const combo = (inSheet: boolean) => {
    const inputLive = inSheet || !sheet;
    const openList = shown && inputLive;
    return (
      <input
        id={inSheet ? `${auto}-sin` : id}
        ref={inSheet ? sheetIn : input}
        role="combobox"
        aria-expanded={openList}
        aria-controls={openList ? `${auto}-list` : undefined}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && inputLive ? optId(hits[active]!.symbol) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        aria-busy={loading || undefined}
        aria-label={inSheet ? label : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        // The shown pick is the field's value to a screen reader; on screen the pick draws over the clear input.
        value={inSheet || (editing && !sheet) ? query : value ? `${value} ${name ?? ''}`.trim() : ''}
        onChange={(e) => run({ type: 'input', query: e.target.value })}
        onFocus={() => {
          if (!inSheet && !editing && !phone()) start();
        }}
        onClick={() => {
          if (!inSheet && (!editing || sheet)) start();
        }}
        onBlur={() => run({ type: 'blur', value, known })}
        onKeyDown={onKeyDown}
        // A phone's picker types in its sheet: the field itself raises no keyboard (the tab bar stays).
        inputMode={picker && !inSheet && typeof window !== 'undefined' && phone() ? 'none' : undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        enterKeyHint="go"
        data-testid={inSheet ? `${testId}-sheet-input` : testId}
      />
    );
  };
  const glass = (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3.5 3.5" strokeLinecap="round" />
    </svg>
  );
  const list = shown && (
    <div className="kit-cs-sugg" id={`${auto}-list`} role="listbox" aria-label={label} aria-busy={loading || undefined} data-testid={listTestId}>
      {loading ? (
        [0, 1, 2].map((i) => <span key={i} className="kit-skel kit-cs-sk" />)
      ) : hits.length === 0 ? (
        <p className="kit-cs-none" role="status">
          {none(query.trim())}
        </p>
      ) : (
        hits.map((s, i) => (
          <div
            key={s.symbol}
            id={optId(s.symbol)}
            role="option"
            aria-selected={i === active}
            className={`kit-cs-opt${i === active ? ' on' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onOpen(s.symbol)}
            data-testid={`${optionTestId}-${s.symbol}`}
          >
            <span className="kit-cs-id">
              <b>{s.symbol}</b>
              <span>{sub ? sub(s) : s.name}</span>
            </span>
            {tags && <span className="kit-cs-tags">{tags(s)}</span>}
          </div>
        ))
      )}
    </div>
  );
  return (
    <div className={`kit-cs-w${size === 'lg' ? '' : ` ${size}`}${showValue ? ' sel' : ''}${readOnly ? ' ro' : ''}${error ? ' bad' : ''}`}>
      <label className={hideLabel ? 'kit-sr' : 'kit-cs-l'} htmlFor={id}>
        {label}
      </label>
      <div className="kit-cs">
        {!readOnly && glass}
        {showValue && (
          <span className="kit-cs-v" aria-hidden="true" data-testid={valueTestId}>
            <b>{value}</b>
            {name && <span>{name}</span>}
            {meta && <span className="m">{meta}</span>}
          </span>
        )}
        {combo(false)}
        {shortcut && !picker && <kbd aria-hidden="true">{shortcut}</kbd>}
      </div>
      {error && (
        <span className="kit-cs-err" id={errId} role="alert">
          {error}
        </span>
      )}
      {!sheet && list}
      {sheet &&
        createPortal(
          <div className="kit-cs-sheet" role="dialog" aria-modal="true" aria-label={label} data-testid={`${testId}-sheet`}>
            <div className="kit-cs-sheet-h">
              <button
                type="button"
                className="kit-cs-back"
                aria-label={closeLabel}
                onClick={() => run({ type: 'close' })}
                onKeyDown={(e) => {
                  if (e.key !== 'Escape' && e.key !== 'Tab') return;
                  e.preventDefault();
                  if (e.key === 'Escape') run({ type: 'close' });
                  else sheetIn.current?.focus();
                }}
                data-testid={`${testId}-sheet-close`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="kit-cs">
                {glass}
                {combo(true)}
              </div>
            </div>
            {list}
          </div>,
          document.body,
        )}
    </div>
  );
}
