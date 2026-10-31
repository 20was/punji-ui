'use client';

/**
 * CommandPalette (design.punji.app/components/command-palette): the ⌘K
 * dialog. A search field over grouped results; the account's "Search your
 * account" and the design docs' search are both this component, each
 * building its own results.
 *
 * Keys: ↑ ↓ move (wrapping), ← → move between a row's action chips wherever
 * the caret is, Enter runs the chosen action (the first unless moved), Tab
 * moves between the field and the Esc button (never leaves the dialog), Esc
 * closes and focus goes back where it was. Chips are read out: each row
 * names its actions (aria-describedby), and a move between chips is
 * announced. A pointer resting on the list does not take the row back while
 * you arrow. On a phone it fills the screen.
 */
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';

import { moveChip, moveIndex } from '../command-keys/commandKeys.ts';

export interface CommandAction {
  /** Stable id of the action ("open", "watch"), passed back to onRun. */
  id: string;
  /** The words shown on the action's chip, and read out when it is chosen. */
  label: string;
}

export interface CommandItem {
  /** Unique, stable id of the row. */
  id: string;
  /** Rows of one group sit together under its heading (null: no heading). */
  group: string;
  /** The group's heading, printed above its first row. Omit or null for none. */
  groupLabel?: string | null;
  /** The row's main words (a page name, a symbol). */
  title: string;
  /** A second line or a quieter name beside the title. */
  sub?: string;
  /** A right-aligned quiet figure. */
  meta?: string;
  /** Small words after the name ("opened"). */
  tags?: string[];
  /** A hint at the row's end (a page's group). */
  hint?: string;
  /** plain (default), entity (symbol and name, chips when chosen), external (leaves the site), more (a "show all"). */
  kind?: 'plain' | 'entity' | 'external' | 'more';
  /** The accessible name when the visible parts do not say it in order. */
  label?: string;
  /** The first is what Enter does; the others sit on the row as chips. */
  actions: CommandAction[];
}

export interface CommandPaletteLabels {
  /** The dialog's and the field's accessible name. */
  dialog: string;
  /** The close button's accessible name. */
  close: string;
  /** The footer hint for the up and down keys ("Move"). */
  move: string;
  /** The footer hint for the left and right keys ("Choose action"). */
  choose: string;
  /** The footer hint for Enter ("Open"). */
  open: string;
  /** The footer hint for Esc ("Close"). */
  closeKey: string;
  /** Said (in a polite status region) when an action chip is chosen: "Watch chosen". */
  chosen: (label: string) => string;
  /** Read after the chosen chip's label ("chosen"). */
  chosenMark: string;
  /** Read after a row's actions, explaining how to choose one ("Left and right arrows choose an action"). */
  actionsHint: string;
}

interface Props {
  /** Every word the dialog says, so it can be fully translated. */
  labels: CommandPaletteLabels;
  /** Text shown in the empty search field. */
  placeholder: string;
  /** The current query. You own it, and clear it when the palette closes. */
  query: string;
  /** Called with the new query on every keystroke. */
  onQuery: (q: string) => void;
  /** The rows to show, already filtered and ordered by you. The palette does not search. */
  items: readonly CommandItem[];
  /** Called when a row or an action chip is run (Enter, a click). */
  onRun: (item: CommandItem, action: CommandAction) => void;
  /** Called when the palette asks to close (Esc, the close button). Unmount it in response. */
  onClose: () => void;
  /** Shown above the results when nothing matched (a reason and a suggestion). */
  empty?: ReactNode;
  /** test id of a row: `${testIdPrefix}-item-${testKey(id)}`; the dialog is `${testIdPrefix}`. */
  testIdPrefix?: string;
  /** Maps a row's id to the key used in its test id (default: the id itself). */
  testKey?: (id: string) => string;
  /** The field's autocapitalize attribute: 'characters' when people type ticker symbols. Default 'off'. */
  autoCapitalize?: 'off' | 'characters';
}

const domId = (id: string) => `kcmd-${id.replace(/[^A-Za-z0-9_-]/g, '-')}`;

function ExtIcon() {
  return (
    <svg className="kit-cmd-ext" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function CommandPalette({ labels, placeholder, query, onQuery, items, onRun, onClose, empty, testIdPrefix = 'cmdk', testKey = (id) => id, autoCapitalize = 'off' }: Props) {
  const [index, setIndex] = useState(0);
  const [chip, setChip] = useState(0);
  const [said, setSaid] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const tid = (s: string) => `${testIdPrefix}-${s}`;

  // Focus in, page still, focus back out on close.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = was;
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, []);

  const active = items.length ? Math.min(index, items.length - 1) : -1;
  const activeItem = active >= 0 ? items[active] : null;
  const activeChip = activeItem ? Math.min(chip, Math.max(0, activeItem.actions.length - 1)) : 0;

  useEffect(() => {
    if (active < 0) return;
    list.current?.querySelector(`#${domId(items[active]!.id)}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, items]);

  const pickChip = (next: number) => {
    setChip(next);
    const nextAction = activeItem?.actions[next];
    if (nextAction) setSaid(labels.chosen(nextAction.label));
  };

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(moveIndex(items.length, active, e.key === 'ArrowDown' ? 1 : -1));
      setChip(0);
    } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && activeItem && activeItem.actions.length > 1) {
      // Chips move wherever the caret is; the caret stays where it was.
      e.preventDefault();
      pickChip(moveChip(activeItem.actions.length, activeChip, e.key === 'ArrowRight' ? 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const action = activeItem?.actions[activeChip];
      if (activeItem && action) onRun(activeItem, action);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }

  /** Tab stays inside the dialog: from the Esc button back to the field. */
  function onDialogKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const stops = [input.current, e.currentTarget.querySelector<HTMLElement>('.kit-cmd-esc')].filter((x): x is HTMLElement => !!x);
    const at = stops.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    e.preventDefault();
    stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length]?.focus();
  }

  const hover = (i: number) => (ev: ReactMouseEvent) => {
    // A list scrolled under a resting pointer fires mousemove without any movement: that is not a choice.
    if (ev.movementX === 0 && ev.movementY === 0) return;
    if (i !== active) {
      setIndex(i);
      setChip(0);
    }
  };

  return (
    <div className="kit-cmd-ov">
      <div className="kit-cmd-scrim" onMouseDown={onClose} aria-hidden="true" />
      <div className="kit-cmd" role="dialog" aria-modal="true" aria-label={labels.dialog} onKeyDown={onDialogKey} data-testid={testIdPrefix}>
        <div className="kit-cmd-in">
          <SearchGlyph />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="kit-cmd-list"
            aria-autocomplete="list"
            aria-activedescendant={activeItem ? domId(activeItem.id) : undefined}
            aria-label={labels.dialog}
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              onQuery(e.target.value);
              setIndex(0);
              setChip(0);
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize={autoCapitalize}
            spellCheck={false}
            enterKeyHint="go"
            data-testid={tid('input')}
          />
          {/* The name starts with the key it shows (WCAG 2.5.3), then says what it does. */}
          <button type="button" className="kit-cmd-esc" onClick={onClose} aria-label={`Esc, ${labels.close}`} data-testid={tid('esc')}>
            Esc
          </button>
        </div>
        <div className="kit-cmd-list" id="kit-cmd-list" role="listbox" aria-label={labels.dialog} ref={list}>
          {empty && (
            <p className="kit-cmd-none" role="status" data-testid={tid('none')}>
              {empty}
            </p>
          )}
          {items.map((e, i) => {
            const head = e.groupLabel && (i === 0 || items[i - 1]!.group !== e.group) ? e.groupLabel : null;
            const on = i === active;
            const chipsId = `${domId(e.id)}-acts`;
            const entity = e.kind === 'entity';
            const chips = entity && e.actions.length > 0;
            return (
              <div key={e.id} role="presentation">
                {head && (
                  <div className="kit-cmd-gh" role="presentation">
                    {head}
                  </div>
                )}
                <div
                  id={domId(e.id)}
                  role="option"
                  aria-selected={on}
                  aria-label={e.label}
                  aria-describedby={chips ? chipsId : undefined}
                  className={`kit-cmd-it${on ? ' on' : ''}${e.kind === 'external' ? ' ext' : ''}${e.kind === 'more' ? ' more' : ''}`}
                  onMouseMove={hover(i)}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => e.actions[0] && onRun(e, e.actions[0])}
                  data-testid={tid(`item-${testKey(e.id)}`)}
                >
                  {entity || e.sub ? (
                    <span className="kit-cmd-id">
                      <b>{e.title}</b>
                      {e.sub && <span className="kit-cmd-sub">{e.sub}</span>}
                      {e.tags?.map((tag) => (
                        <span key={tag} className="kit-cmd-tag">
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : e.kind === 'external' ? (
                    <span className="kit-cmd-t">
                      <ExtIcon />
                      {e.title} <span aria-hidden="true">↗</span>
                    </span>
                  ) : (
                    <span className="kit-cmd-t">{e.title}</span>
                  )}
                  {e.hint && <span className="kit-cmd-meta kit-cmd-hint">{e.hint}</span>}
                  {chips ? (
                    <span className={`kit-cmd-chips${on ? '' : ' off'}`} id={chipsId}>
                      {e.actions.map((a, j) => (
                        <span
                          key={a.id}
                          className={`kit-cmd-chip${on && j === activeChip ? ' on' : ''}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onRun(e, a);
                          }}
                          data-testid={tid(`action-${testKey(e.id)}-${a.id}`)}
                        >
                          {a.label}
                          {on && j === activeChip && <span className="kit-sr"> ({labels.chosenMark})</span>}
                        </span>
                      ))}
                      <span className="kit-sr">. {labels.actionsHint}</span>
                    </span>
                  ) : (
                    e.meta && <span className="kit-cmd-meta">{e.meta}</span>
                  )}
                  {chips && e.meta && !on && <span className="kit-cmd-meta">{e.meta}</span>}
                  {on && !entity && (
                    <kbd className="kit-cmd-enter" aria-hidden="true">
                      ↵
                    </kbd>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="kit-sr" role="status" aria-live="polite" data-testid={tid('said')}>
          {said}
        </p>
        <div className="kit-cmd-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            {labels.move}
          </span>
          {items.some((x) => x.kind === 'entity' && x.actions.length > 1) && (
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd>
              {labels.choose}
            </span>
          )}
          <span>
            <kbd>↵</kbd>
            {labels.open}
          </span>
          <span>
            <kbd>Esc</kbd>
            {labels.closeKey}
          </span>
        </div>
      </div>
    </div>
  );
}
