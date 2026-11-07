'use client';

/**
 * ReorderList (design.punji.app/components/reorder-list): a list in its edit
 * mode, for putting items in the reader's own order. Two ways, one order:
 *
 *   drag     (a desk): a handle on each row. Drag it with a mouse, or focus it,
 *            press Space (or Enter) to pick the row up, the arrow keys to move
 *            it, Space to put it down (Esc puts it back). Each step is spoken.
 *   buttons  (a phone): Up and Down, 44px each; the first row's Up and the
 *            last row's Down are off. No drag on touch: a scroll never moves a
 *            row by mistake.
 *
 * The list is controlled: it reports the new order (`onChange`) and the page
 * saves it (Done) or drops it (Cancel). It never saves anything itself.
 */
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';

import { moveItem } from '../watchlist/order.ts';

export interface ReorderItem {
  /** Unique within the list. */
  key: string;
  /** The row's code (a symbol): never truncates. */
  title: string;
  /** Its name: may truncate. */
  sub?: ReactNode;
}

/** The words the list speaks and names its controls with. Each is a function of the row's title. */
export interface ReorderLabels {
  /** The handle's name: "Move NICA. Space to pick up, arrow keys to move". */
  handle: (title: string) => string;
  /** The Up button's name ("Move NICA up"). */
  up: (title: string) => string;
  /** The Down button's name ("Move NICA down"). */
  down: (title: string) => string;
  /** Spoken after a move: "NICA, moved to position 2 of 9". */
  moved: (title: string, position: number, count: number) => string;
  /** Spoken when a row is picked up. */
  lifted: (title: string, position: number, count: number) => string;
  /** Spoken when it is put down. */
  dropped: (title: string, position: number, count: number) => string;
  /** Spoken when Esc puts it back. */
  cancelled: (title: string) => string;
}

export const REORDER_LABELS: ReorderLabels = {
  handle: (t) => `Move ${t}. Space to pick up, arrow keys to move`,
  up: (t) => `Move ${t} up`,
  down: (t) => `Move ${t} down`,
  moved: (t, p, n) => `${t}, moved to position ${p} of ${n}`,
  lifted: (t, p, n) => `${t}, picked up from position ${p} of ${n}. Arrow keys to move, Space to drop, Escape to cancel`,
  dropped: (t, p, n) => `${t}, dropped at position ${p} of ${n}`,
  cancelled: (t) => `${t}, move cancelled`,
};

/** The order with the item at `from` moved to `to` (both clamped to the list). Built on the watchlist's `moveItem`. */
export function moveKey(keys: readonly string[], from: number, to: number): string[] {
  const key = keys[from];
  if (key === undefined) return [...keys];
  return moveItem(keys, key, Math.max(0, Math.min(keys.length - 1, to)) - from);
}

export interface ReorderListProps {
  /** The rows in their current order. */
  items: readonly ReorderItem[];
  /** Called with the new order of keys after every move. */
  onChange: (keys: string[]) => void;
  /** 'drag': a handle on each row (a desk). 'buttons': Up and Down (a phone). Default 'drag'. */
  mode?: 'drag' | 'buttons';
  /** The list's accessible name ("Reorder watchlist"). */
  label: string;
  /** Replace any of the words. */
  labels?: Partial<ReorderLabels>;
  /** Tinted for a moment (the row just moved). */
  movedKey?: string | null;
  /** Becomes data-testid on the list; rows are `<testId>-row-<key>`, handles `<testId>-handle-<key>`. */
  testId?: string;
}

const Grip = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M5 3h0M9 3h0M5 7h0M9 7h0M5 11h0M9 11h0" />
  </svg>
);
const Arrow = ({ down }: { down?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={down ? 'M8 3v10M4 9l4 4 4-4' : 'M8 13V3M4 7l4-4 4 4'} />
  </svg>
);

/**
 * @stability beta
 */
export function ReorderList({ items, onChange, mode = 'drag', label, labels, movedKey, testId = 'reorder' }: ReorderListProps) {
  const words: ReorderLabels = { ...REORDER_LABELS, ...labels };
  const keys = items.map((i) => i.key);
  const [lifted, setLifted] = useState<{ key: string; from: string[] } | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; after: boolean } | null>(null);
  const [said, setSaid] = useState('');
  /** The control to focus after a render: 'h' (handle), 'u' or 'd' (Up, Down), then the row's key. */
  const focusNext = useRef<string | null>(null);
  const list = useRef<HTMLUListElement>(null);

  // A moved row's DOM node moves too: put the focus back on the control the reader was using.
  useEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    focusNext.current = null;
    const at = (x: string) => list.current?.querySelector<HTMLButtonElement>(`[data-ro="${CSS.escape(x)}"]`);
    const el = at(f);
    (el && !el.disabled ? el : at((f[0] === 'u' ? 'd' : 'u') + f.slice(1)))?.focus();
  });

  const title = (k: string) => items.find((i) => i.key === k)?.title ?? k;
  const move = (k: string, to: number, focus: string) => {
    const from = keys.indexOf(k);
    if (from < 0 || to < 0 || to >= keys.length || to === from) return;
    focusNext.current = focus;
    onChange(moveKey(keys, from, to));
    setSaid(words.moved(title(k), to + 1, keys.length));
  };

  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>, k: string) => {
    const i = keys.indexOf(k);
    const sel = `h${k}`;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (lifted?.key === k) {
        setLifted(null);
        setSaid(words.dropped(title(k), i + 1, keys.length));
      } else {
        setLifted({ key: k, from: keys });
        setSaid(words.lifted(title(k), i + 1, keys.length));
      }
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && lifted?.key === k) {
      e.preventDefault();
      e.stopPropagation();
      move(k, i + (e.key === 'ArrowUp' ? -1 : 1), sel);
    } else if (e.key === 'Escape' && lifted?.key === k) {
      e.preventDefault();
      e.stopPropagation();
      focusNext.current = sel;
      onChange(lifted.from);
      setLifted(null);
      setSaid(words.cancelled(title(k)));
    }
  };

  const onDrop = (e: DragEvent<HTMLLIElement>, k: string) => {
    e.preventDefault();
    const from = dragging;
    setOver(null);
    setDragging(null);
    setArmed(null);
    if (!from || from === k) return;
    const target = keys.indexOf(k);
    const after = over?.key === k ? over.after : false;
    const fromAt = keys.indexOf(from);
    let to = target + (after ? 1 : 0);
    if (fromAt < to) to -= 1;
    move(from, to, `h${from}`);
  };

  return (
    <>
      <ul className="pu-reorder" aria-label={label} ref={list} data-testid={testId}>
        {items.map((it, i) => {
          const state = `${lifted?.key === it.key ? ' pu-reorder-lifted' : ''}${dragging === it.key ? ' pu-reorder-dragging' : ''}${over?.key === it.key ? (over.after ? ' pu-reorder-after' : ' pu-reorder-before') : ''}${movedKey === it.key ? ' pu-reorder-moved' : ''}`;
          const cls = `pu-reorder-item${mode === 'buttons' ? ' pu-reorder-buttons' : ''}${state}`;
          const text = (
            <span className="pu-reorder-text">
              <b>{it.title}</b>
              {it.sub ? <span>{it.sub}</span> : null}
            </span>
          );
          if (mode === 'buttons') {
            return (
              <li key={it.key} className={cls} data-testid={`${testId}-row-${it.key}`}>
                {text}
                <span className="pu-reorder-btns">
                  <button type="button" className="pu-reorder-btn" aria-label={words.up(it.title)} disabled={i === 0} onClick={() => move(it.key, i - 1, `u${it.key}`)} data-ro={`u${it.key}`} data-testid={`${testId}-up-${it.key}`}>
                    <Arrow />
                  </button>
                  <button type="button" className="pu-reorder-btn" aria-label={words.down(it.title)} disabled={i === items.length - 1} onClick={() => move(it.key, i + 1, `d${it.key}`)} data-ro={`d${it.key}`} data-testid={`${testId}-down-${it.key}`}>
                    <Arrow down />
                  </button>
                </span>
              </li>
            );
          }
          return (
            // The drag is a pointer extra on the row; the handle button and the keyboard do the same job.
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <li
              key={it.key}
              className={cls}
              draggable={armed === it.key}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', it.key);
                setDragging(it.key);
              }}
              onDragEnd={() => {
                setDragging(null);
                setArmed(null);
                setOver(null);
              }}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                const after = e.clientY > r.top + r.height / 2;
                if (over?.key !== it.key || over.after !== after) setOver({ key: it.key, after });
              }}
              onDrop={(e) => onDrop(e, it.key)}
              data-testid={`${testId}-row-${it.key}`}
            >
              <button
                type="button"
                className="pu-reorder-handle"
                aria-label={words.handle(it.title)}
                aria-pressed={lifted?.key === it.key}
                onPointerDown={() => setArmed(it.key)}
                onPointerUp={() => !dragging && setArmed(null)}
                onKeyDown={(e) => onHandleKey(e, it.key)}
                onBlur={() => {
                  if (lifted?.key === it.key && !focusNext.current) setLifted(null);
                }}
                data-ro={`h${it.key}`}
                data-testid={`${testId}-handle-${it.key}`}
              >
                <Grip />
              </button>
              {text}
              <span className="pu-reorder-pos" aria-hidden="true">{i + 1}</span>
            </li>
          );
        })}
      </ul>
      <span className="kit-sr" role="status" aria-live="polite" data-testid={`${testId}-said`}>
        {said}
      </span>
    </>
  );
}
